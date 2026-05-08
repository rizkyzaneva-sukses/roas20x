import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerOrManager, canAccessBrand } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// POST /api/brands/:brandId/products/import — OWNER or MANAGER (with brand access)
// Accept: multipart/form-data with file field
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

  // Normalize headers: lowercase + remove spaces/special chars
  const normalized = rows.map(row => {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      result[k.toLowerCase().replace(/[^a-z]/g, '')] = String(v).trim()
    }
    return result
  })

  // Map flexible column names
  const getField = (row: Record<string, string>, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k]
    }
    return ''
  }

  const products: { nama: string; hpp: bigint; hargaJualDefault: bigint }[] = []
  const errors: string[] = []

  normalized.forEach((row, i) => {
    const nama = getField(row, ['nama', 'namaproduk', 'produk', 'name'])
    const hppStr = getField(row, ['hpp', 'hargapokok', 'costprice', 'cost', 'hargapokokpenjualan'])
    const hargaStr = getField(row, ['hargajual', 'hargajualdefault', 'harga', 'price', 'sellingprice'])

    if (!nama) { errors.push(`Baris ${i + 2}: Nama produk kosong`); return }

    const hpp = parseInt(hppStr.replace(/[^0-9]/g, ''))
    const harga = parseInt(hargaStr.replace(/[^0-9]/g, ''))

    if (isNaN(hpp) || hpp < 0) { errors.push(`Baris ${i + 2}: HPP tidak valid (${hppStr})`); return }
    if (isNaN(harga) || harga <= 0) { errors.push(`Baris ${i + 2}: Harga jual tidak valid (${hargaStr})`); return }

    products.push({ nama, hpp: BigInt(hpp), hargaJualDefault: BigInt(harga) })
  })

  if (!products.length) {
    return NextResponse.json({ error: 'Tidak ada data valid', details: errors }, { status: 400 })
  }

  const created = await prisma.product.createMany({
    data: products.map(p => ({ brandId: bid, nama: p.nama, hpp: p.hpp, hargaJualDefault: p.hargaJualDefault })),
    skipDuplicates: false,
  })

  return NextResponse.json({
    imported: created.count,
    skipped: errors.length,
    errors: errors.length ? errors : undefined,
  }, { status: 201 })
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
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += char }
  }
  result.push(current)
  return result
}
