import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerOrManager, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// POST /api/brands/:brandId/bundles/import — OWNER or MANAGER (with brand access)
// Accepts CSV/Excel with columns:
//   nama (bundle name) — REQUIRED
//   harga_jual (selling price) — REQUIRED
//   produk1, qty1, produk2, qty2, ... (product names and quantities) — OPTIONAL
//
// OR simpler format:
//   nama (bundle name) — REQUIRED
//   harga_jual (selling price) — REQUIRED
//   produk (comma-separated product names) — OPTIONAL
//   qty (comma-separated quantities, default 1 each) — OPTIONAL
//
// If products are not specified, bundle is created with name + price only (no items).
// Product matching is done by name (case-insensitive, partial match).

export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { session, error } = await requireOwnerOrManager()
  if (error) return error

  const { brandId } = await params
  const bid = parseInt(brandId)

  if (!canAccessBrand(session!, bid)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()

  let rows: Record<string, string>[] = []

  if (name.endsWith('.csv')) {
    const text = buffer.toString('utf-8')
    rows = parseCSV(text)
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' }) as Record<string, string>[]
  } else {
    return NextResponse.json({ error: 'Format file harus CSV, XLS, atau XLSX' }, { status: 400 })
  }

  if (!rows.length) return NextResponse.json({ error: 'File kosong atau tidak ada data' }, { status: 400 })

  // Get all products for this brand for matching
  const allProducts = await prisma.product.findMany({
    where: { brandId: bid, isActive: true },
    select: { id: true, nama: true },
  })

  // Normalize headers
  const normalized = rows.map(row => {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      result[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = String(v).trim()
    }
    return result
  })

  const getField = (row: Record<string, string>, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k]
    }
    return ''
  }

  // Detect format: multi-column products (produk1, produk2...) or single column (produk)
  const hasMultiCol = normalized.some(row =>
    Object.keys(row).some(k => /^produk\d+$/.test(k) || /^product\d+$/.test(k) || /^item\d+$/.test(k))
  )

  const results: { nama: string; status: 'created' | 'error'; error?: string }[] = []
  let imported = 0

  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i]
    const nama = getField(row, ['nama', 'namabundle', 'bundle', 'name', 'namabundling', 'bundling'])
    const hargaStr = getField(row, ['hargajual', 'hargajualdefault', 'harga', 'price', 'sellingprice'])

    if (!nama) {
      results.push({ nama: `Baris ${i + 2}`, status: 'error', error: 'Nama bundle kosong' })
      continue
    }

    const hargaJual = parseInt(hargaStr.replace(/[^0-9]/g, ''))
    if (isNaN(hargaJual) || hargaJual <= 0) {
      results.push({ nama, status: 'error', error: 'Harga jual tidak valid' })
      continue
    }

    // Collect product items
    const items: { productId: number; qty: number }[] = []

    if (hasMultiCol) {
      // Multi-column format: produk1/qty1, produk2/qty2, ...
      for (let n = 1; n <= 20; n++) {
        const prodName = getField(row, [`produk${n}`, `product${n}`, `item${n}`])
        if (!prodName) break
        const qtyStr = getField(row, [`qty${n}`, `jumlah${n}`, `quantity${n}`])
        const qty = parseInt(qtyStr) || 1

        const matched = findProduct(allProducts, prodName)
        if (matched) {
          items.push({ productId: matched.id, qty })
        } else {
          results.push({ nama, status: 'error', error: `Produk "${prodName}" tidak ditemukan` })
          break
        }
      }
      // If there was an error finding products, skip this bundle
      if (results.length > 0 && results[results.length - 1].nama === nama && results[results.length - 1].status === 'error') {
        continue
      }
    } else {
      // Single column format: produk = "Produk A, Produk B", qty = "1, 2"
      const produkStr = getField(row, ['produk', 'products', 'items', 'produkproduk', 'itembundle'])
      const qtyStr = getField(row, ['qty', 'jumlah', 'quantity', 'quantities'])

      if (produkStr) {
        const prodNames = produkStr.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
        const qtys = qtyStr ? qtyStr.split(/[,;|]/).map(s => parseInt(s.trim()) || 1) : []

        let hasError = false
        for (let j = 0; j < prodNames.length; j++) {
          const matched = findProduct(allProducts, prodNames[j])
          if (matched) {
            items.push({ productId: matched.id, qty: qtys[j] || 1 })
          } else {
            results.push({ nama, status: 'error', error: `Produk "${prodNames[j]}" tidak ditemukan` })
            hasError = true
            break
          }
        }
        if (hasError) continue
      }
    }

    // Create bundle
    try {
      await prisma.bundle.create({
        data: {
          brandId: bid,
          nama,
          hargaJualDefault: BigInt(hargaJual),
          ...(items.length > 0 ? {
            items: {
              create: items.map(item => ({
                productId: item.productId,
                qty: item.qty,
              })),
            },
          } : {}),
        },
      })
      results.push({ nama, status: 'created' })
      imported++
    } catch (err) {
      results.push({ nama, status: 'error', error: 'Gagal menyimpan ke database' })
    }
  }

  return NextResponse.json({
    imported,
    total: normalized.length,
    errors: results.filter(r => r.status === 'error'),
    details: results,
  }, { status: 201 })
}

function findProduct(products: { id: number; nama: string }[], search: string): { id: number; nama: string } | undefined {
  const searchLower = search.toLowerCase().trim()
  // Exact match first
  const exact = products.find(p => p.nama.toLowerCase() === searchLower)
  if (exact) return exact
  // Partial match (contains)
  const partial = products.find(p => p.nama.toLowerCase().includes(searchLower) || searchLower.includes(p.nama.toLowerCase()))
  return partial
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line).map(v => v.replace(/^["']|["']$/g, '').trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  }).filter(row => Object.values(row).some(v => v !== ''))
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
