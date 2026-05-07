/**
 * Pre-migration script: converts any existing "STAFF" role values to "USER"
 * before Prisma attempts to alter the enum (which would fail otherwise).
 *
 * Uses the `pg` package directly to avoid any Prisma Client schema mismatch issues.
 */

const { Client } = require('pg')

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()

    try {
        // Check if the "STAFF" value exists in the current Role enum
        const enumCheck = await client.query(`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'STAFF'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
      LIMIT 1;
    `)

        if (enumCheck.rowCount > 0) {
            // Update any users with STAFF role to USER before enum alteration
            const result = await client.query(`
        UPDATE users SET role = 'USER' WHERE role = 'STAFF';
      `)
            console.log(`migrate-roles: Updated ${result.rowCount} user(s) from STAFF -> USER`)
        } else {
            console.log('migrate-roles: No STAFF enum value found, skipping.')
        }
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error('migrate-roles failed:', err)
    process.exit(1)
})
