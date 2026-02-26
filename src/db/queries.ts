import { db } from '@/db'
import { sales, uploadLogs, type NewSale, type NewUploadLog } from '@/db/schema'
import { eq, and, sql, desc, sum, count } from 'drizzle-orm'

// ─── INSERT ───────────────────────────────────────────────────────────────

/**
 * Insere vendas normalizadas com upsert (evita duplicatas pelo unique index)
 */
export async function upsertSales(rows: NewSale[]) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 }

  const result = await db
    .insert(sales)
    .values(rows)
    .onConflictDoUpdate({
      target: [sales.platform, sales.adId, sales.sku, sales.salePeriod],
      set: {
        quantitySold: sql`excluded.quantity_sold`,
        totalRevenue: sql`excluded.total_revenue`,
        adName: sql`excluded.ad_name`,
        processedAt: sql`now()`,
      },
    })
    .returning({ id: sales.id })

  return { inserted: result.length, skipped: rows.length - result.length }
}

/**
 * Registra log de upload
 */
export async function createUploadLog(log: NewUploadLog) {
  const [row] = await db.insert(uploadLogs).values(log).returning()
  return row
}

// ─── READ — DASHBOARD QUERIES ─────────────────────────────────────────────

/**
 * Receita e quantidade totais agrupadas por plataforma num período
 */
export async function getSalesByPlatform(period: string) {
  return db
    .select({
      platform: sales.platform,
      totalRevenue: sum(sales.totalRevenue).mapWith(Number),
      totalQuantity: sum(sales.quantitySold).mapWith(Number),
      skuCount: count(sales.sku),
    })
    .from(sales)
    .where(eq(sales.salePeriod, period))
    .groupBy(sales.platform)
    .orderBy(desc(sum(sales.totalRevenue)))
}

/**
 * Top N produtos por receita num período (todas plataformas ou filtrada)
 */
export async function getTopProducts({
  period,
  platform,
  limit = 20,
}: {
  period: string
  platform?: string
  limit?: number
}) {
  const filters = platform
    ? and(eq(sales.salePeriod, period), eq(sales.platform, platform))
    : eq(sales.salePeriod, period)

  return db
    .select({
      sku: sales.sku,
      adName: sales.adName,
      platform: sales.platform,
      totalRevenue: sum(sales.totalRevenue).mapWith(Number),
      totalQuantity: sum(sales.quantitySold).mapWith(Number),
    })
    .from(sales)
    .where(filters)
    .groupBy(sales.sku, sales.adName, sales.platform)
    .orderBy(desc(sum(sales.totalRevenue)))
    .limit(limit)
}

/**
 * Evolução mensal de receita por plataforma (últimos N meses)
 */
export async function getMonthlyRevenueTrend(months = 6) {
  return db
    .select({
      period: sales.salePeriod,
      platform: sales.platform,
      totalRevenue: sum(sales.totalRevenue).mapWith(Number),
      totalQuantity: sum(sales.quantitySold).mapWith(Number),
    })
    .from(sales)
    .groupBy(sales.salePeriod, sales.platform)
    .orderBy(desc(sales.salePeriod))
    .limit(months * 3) // 3 plataformas × N meses
}

/**
 * Períodos disponíveis no banco (para selects de filtro)
 */
export async function getAvailablePeriods() {
  const rows = await db
    .selectDistinct({ period: sales.salePeriod })
    .from(sales)
    .orderBy(desc(sales.salePeriod))

  return rows.map((r) => r.period)
}

/**
 * Histórico de uploads
 */
export async function getUploadHistory(limit = 20) {
  return db
    .select()
    .from(uploadLogs)
    .orderBy(desc(uploadLogs.uploadedAt))
    .limit(limit)
}
