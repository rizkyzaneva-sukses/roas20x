import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const brandNames = ["Zaneva", "Be.Syari", "Oberbe", "Muslimah Swimwear"];
  const brands = [];
  for (const nama of brandNames) {
    brands.push(await prisma.brand.upsert({ where: { nama }, update: {}, create: { nama } }));
  }

  const [zaneva, beSyari] = brands;
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: { passwordHash },
    create: { nama: "Owner Zaneva", username: "owner", passwordHash, role: Role.OWNER },
  });
  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: { passwordHash },
    create: { nama: "Manager Zaneva", username: "manager", passwordHash, role: Role.MANAGER },
  });
  const staff = await prisma.user.upsert({
    where: { username: "staff" },
    update: { passwordHash },
    create: { nama: "Staff Zaneva", username: "staff", passwordHash, role: Role.STAFF },
  });

  for (const brand of brands) {
    await prisma.userBrand.upsert({ where: { userId_brandId: { userId: owner.id, brandId: brand.id } }, update: {}, create: { userId: owner.id, brandId: brand.id } });
  }
  for (const brand of [zaneva, beSyari]) {
    await prisma.userBrand.upsert({ where: { userId_brandId: { userId: manager.id, brandId: brand.id } }, update: {}, create: { userId: manager.id, brandId: brand.id } });
  }
  await prisma.userBrand.upsert({ where: { userId_brandId: { userId: staff.id, brandId: zaneva.id } }, update: {}, create: { userId: staff.id, brandId: zaneva.id } });

  for (const brand of brands) {
    await prisma.marginSetting.upsert({
      where: { brandId: brand.id },
      update: { batasBahayaPct: 5, batasCukupPct: 10 },
      create: { brandId: brand.id, batasBahayaPct: 5, batasCukupPct: 10 },
    });
    for (const [jumlahProduk, diskonRp] of [[1, 0], [2, 5000], [3, 10000]]) {
      await prisma.bundlingDiskon.upsert({
        where: { brandId_jumlahProduk: { brandId: brand.id, jumlahProduk } },
        update: { diskonRp },
        create: { brandId: brand.id, jumlahProduk, diskonRp },
      });
    }
    await prisma.platform.upsert({
      where: { brandId_nama: { brandId: brand.id, nama: "Shopee" } },
      update: { adminPct: 6, adminFlat: 2000 },
      create: { brandId: brand.id, nama: "Shopee", adminPct: 6, adminFlat: 2000 },
    });
    await prisma.platform.upsert({
      where: { brandId_nama: { brandId: brand.id, nama: "TikTok Shop" } },
      update: { adminPct: 5, adminFlat: 0 },
      create: { brandId: brand.id, nama: "TikTok Shop", adminPct: 5, adminFlat: 0 },
    });
  }

  for (const [nama, hpp] of [["Gamis Aira", 50000], ["Khimar Zahra", 60000], ["Set Zaneva Basic", 85000]]) {
    await prisma.produk.upsert({
      where: { brandId_nama: { brandId: zaneva.id, nama: String(nama) } },
      update: { hpp: Number(hpp), aktif: true },
      create: { brandId: zaneva.id, nama: String(nama), hpp: Number(hpp), aktif: true },
    });
  }

  console.log("Seed complete. Login: owner/manager/staff with password password123");
}

main().finally(async () => prisma.$disconnect());
