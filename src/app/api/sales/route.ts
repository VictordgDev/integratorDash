import { NextRequest, NextResponse } from 'next/server'
import { upsertSales, createUploadLog } from '@/db/queries'
import { type NewSale } from '@/db/schema'
import { z } from 'zod'

// ─── Validation schema (matches Python output) ────────────────────────────
const SaleRowSchema = z.object({
  codigo_plataforma: z.enum(['Mercado Livre', 'Amazon', 'Shopee']),
  anuncio_id: z.string(),
  nome_anuncio: z.string(),
  sku: z.string(),
  codigo_produto: z.string(),
  quantidade_vendida: z.number(),
  total_faturado: z.number(),
  data_venda: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
})

const PayloadSchema = z.object({
  file_name: z.string(),
  rows: z.array(SaleRowSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { file_name, rows } = parsed.data

    // Map Python keys → DB schema
    const newSales: NewSale[] = rows.map((r) => ({
      platform: r.codigo_plataforma,
      adId: r.anuncio_id,
      adName: r.nome_anuncio,
      sku: r.sku,
      productCode: r.codigo_produto,
      quantitySold: String(r.quantidade_vendida),
      totalRevenue: String(r.total_faturado),
      salePeriod: r.data_venda,
    }))

    const { inserted, skipped } = await upsertSales(newSales)

    // Detect platform from first row
    const platform = rows[0].codigo_plataforma
    const salePeriod = rows[0].data_venda

    await createUploadLog({
      fileName: file_name,
      platform,
      salePeriod,
      rowsInserted: String(inserted),
      rowsSkipped: String(skipped),
      status: 'success',
    })

    return NextResponse.json({ ok: true, inserted, skipped }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/sales]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET — summary for a period ──────────────────────────────────────────
import { getSalesByPlatform, getTopProducts } from '@/db/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'period query param required (YYYY-MM)' }, { status: 400 })
  }

  const [byPlatform, topProducts] = await Promise.all([
    getSalesByPlatform(period),
    getTopProducts({ period, limit: 10 }),
  ])

  return NextResponse.json({ period, byPlatform, topProducts })
}
