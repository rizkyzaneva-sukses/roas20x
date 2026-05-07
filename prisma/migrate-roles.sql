-- Pre-migration: Manually migrate the Role enum from (OWNER, STAFF) to (OWNER, MANAGER, USER)
-- This handles the full enum replacement that Prisma cannot do when data contains STAFF values.
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  -- Only run if STAFF still exists in the current Role enum
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STAFF'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
  ) THEN
    -- Drop the temporary type if it exists from a previous failed attempt
    DROP TYPE IF EXISTS "Role_new";

    -- Create the new enum type with desired values
    CREATE TYPE "Role_new" AS ENUM ('OWNER', 'MANAGER', 'USER');

    -- Remove default on the column so we can alter the type
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

    -- Alter the column to use the new type, casting STAFF -> USER
    ALTER TABLE users
      ALTER COLUMN role TYPE "Role_new"
      USING (
        CASE role::text
          WHEN 'STAFF' THEN 'USER'::"Role_new"
          WHEN 'OWNER' THEN 'OWNER'::"Role_new"
          WHEN 'MANAGER' THEN 'MANAGER'::"Role_new"
          WHEN 'USER' THEN 'USER'::"Role_new"
          ELSE 'USER'::"Role_new"
        END
      );

    -- Set the default back
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'::"Role_new";

    -- Drop the old enum and rename the new one
    DROP TYPE "Role";
    ALTER TYPE "Role_new" RENAME TO "Role";
  END IF;
END
$$;
