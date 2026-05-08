import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOwner } from '@/lib/auth'

// DELETE all products (and related bundle items/bundles) across all brands
// OWNER only - temporary admin endpoint
export async function DELETE() {
  const { error } = await requireOwner()
  if (error) return error

  // Delete in correct order due to foreign key constraints
  // 1. Delete all BundleDiscount (depends on Bundle)
  await prisma.bundleDiscount.deleteMany({})
  // 2. Delete all BundleItem (depends on Bundle and Product)
  await prisma.bundleItem.deleteMany({})
  // 3. Delete all Bundle
  await prisma.bundle.deleteMany({})
  // 4. Delete all Product
  const result = await prisma.product.deleteMany({})

  return NextResponse.json({
    success: true,
    message: `Deleted all products, bundles, bundle items, and bundle discounts`,
    productsDeleted: result.count,
  })
}
