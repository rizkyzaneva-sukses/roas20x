import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed brands
  const brands = ['Zaneva', 'Oberbe', 'Muswim', 'Be.Syari', 'Elyasr']
  for (const nama of brands) {
    await prisma.brand.upsert({
      where: { id: brands.indexOf(nama) + 1 },
      update: {},
      create: { nama, feeDefaultPersen: 18 },
    })
  }

  // Seed owner account
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { username: 'rizky' },
    update: {},
    create: {
      nama: 'Rizky',
      username: 'rizky',
      passwordHash,
      role: Role.OWNER,
    },
  })

  console.log('✅ Seed selesai')
  console.log('👤 Owner: username=rizky password=admin123')
  console.log('⚠️  Segera ganti password setelah login pertama!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
