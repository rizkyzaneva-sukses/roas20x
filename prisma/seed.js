const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const brands = ['Zaneva', 'Oberbe', 'Muswim', 'Be.Syari', 'Elyasr']
  for (let i = 0; i < brands.length; i++) {
    await prisma.brand.upsert({
      where: { id: i + 1 },
      update: {},
      create: { nama: brands[i], feeDefaultPersen: 18 },
    })
  }

  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'rizky' },
    update: {},
    create: {
      nama: 'Rizky',
      username: 'rizky',
      passwordHash,
      role: 'OWNER',
    },
  })

  console.log('Seed selesai - Owner: rizky / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
