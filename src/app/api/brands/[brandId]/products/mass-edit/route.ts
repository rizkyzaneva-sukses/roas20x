import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// POST /api/brands/:brandId/products/mass-edit — OWNER only
// Accept: multipart/form-data with file field
// Matches products by name and updates hpp + hargaJualDefault
export async function POST(req: NextRequest, { params }: { params: Promise<{ brandId: string }> }) {
  const { error } = await requireOwner()
  if (error) return error

  const { brandId } = await params
  const bid = parseInt(brandId)

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

  // Normalize headers
  const normalized = rows.map(row => {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      result[k.toLowerCase().replace(/[^a-z]/g, '')] = String(v).trim()
    }
    return result
  })

  const getField = (row: Record<string, string>, keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k]
    }
    return ''
  }

  // Get existing products for this brand
  const existingProducts = await prisma.product.findMany({
    where: { brandId: bid, isActive: true },
    select: { id: true, nama: true },
  })

  const productMap = new Map(existingProducts.map(p => [p.nama.toLowerCase().trim(), p.id]))

  const errors: string[] = []
  let updated = 0

  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i]
    const nama = getField(row, ['nama', 'namaproduk', 'produk', 'name'])
    const hppStr = getField(row, ['hpp', 'hargapokok', 'costprice', 'cost', 'hargapokokpenjualan'])
    const hargaStr = getField(row, ['hargajual', 'hargajualdefault', 'harga', 'price', 'sellingprice'])

    if (!nama) { errors.push(`Baris ${i + 2}: Nama produk kosong`); continue }

    const productId = productMap.get(nama.toLowerCase().trim())
    if (!productId) { errors.push(`Baris ${i + 2}: Produk "${nama}" tidak ditemukan`); continue }

    const updateData: { hpp?: bigint; hargaJualDefault?: bigint } = {}

    if (hppStr) {
      const hpp = parseInt(hppStr.replace(/[^0-9]/g, ''))
      if (!isNaN(hpp) && hpp >= 0) updateData.hpp = BigInt(hpp)
      else { errors.push(`Baris ${i + 2}: HPP tidak valid (${hppStr})`); continue }
    }

    if (hargaStr) {
      const harga = parseInt(hargaStr.replace(/[^0-9]/g, ''))
      if (!isNaN(harga) && harga > 0) updateData.hargaJualDefault = BigInt(harga)
      else { errors.push(`Baris ${i + 2}: Harga jual tidak valid (${hargaStr})`); continue }
    }

    if (Object.keys(updateData).length === 0) {
      errors.push(`Baris ${i + 2}: Tidak ada data yang bisa diupdate`)
      continue
    }

    await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })
    updated++
  }

  return NextResponse.json({
    updated,
    errors: errors.length ? errors : undefined,
  })
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
    if (ch === '"' && !inQuotes) { inQuotes = true; continue }
    if (ch === '"' && inQuotes) {
      if (line[i + 1] === '"') { current += '"'; i++; continue }
      inQuotes = false; continue
    }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}
