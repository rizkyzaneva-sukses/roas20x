const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const DEFAULT_TIERS = JSON.stringify([
  { label: 'BEP', targetMargin: 0 },
  { label: 'Margin Tipis', targetMargin: 5 },
  { label: 'Margin Sedang', targetMargin: 15 },
  { label: 'Proporsional', targetMargin: 25 },
])

async function main() {
  const brands = ['Zaneva', 'Oberbe', 'Muswim', 'Be.Syari', 'Elyasr']
  for (let i = 0; i < brands.length; i++) {
    await prisma.brand.upsert({
      where: { id: i + 1 },
      update: {},
      create: { nama: brands[i], feeDefaultPersen: 18, tiersJson: DEFAULT_TIERS },
    })
  }

  // Update brands that still have empty tiers
  await prisma.brand.updateMany({
    where: { tiersJson: '[]' },
    data: { tiersJson: DEFAULT_TIERS },
  })

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
