import {
  pgTable,
  serial,
  varchar,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ─── ENUM-like constants ───────────────────────────────────────────────────
export const PLATFORMS = ['Mercado Livre', 'Amazon', 'Shopee'] as const
export type Platform = (typeof PLATFORMS)[number]

// ─── SALES TABLE ──────────────────────────────────────────────────────────
// Armazena cada linha normalizada dos relatórios de plataformas
export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),

    // Identificação da plataforma e do anúncio
    platform: varchar('platform', { length: 50 }).notNull(),   // 'Mercado Livre' | 'Amazon' | 'Shopee'
    adId: varchar('ad_id', { length: 100 }).notNull(),          // ID do anúncio na plataforma
    adName: varchar('ad_name', { length: 500 }).notNull(),      // Nome/título do anúncio

    // Identificação do produto
    sku: varchar('sku', { length: 100 }).notNull(),
    productCode: varchar('product_code', { length: 100 }).notNull(),

    // Métricas de venda
    quantitySold: numeric('quantity_sold', { precision: 10, scale: 0 }).notNull().default('0'),
    totalRevenue: numeric('total_revenue', { precision: 12, scale: 2 }).notNull().default('0'),

    // Período de referência (YYYY-MM) e quando foi processado
    salePeriod: varchar('sale_period', { length: 7 }).notNull(),  // ex: '2026-01'
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Índices para queries frequentes nos dashboards
    platformIdx: index('sales_platform_idx').on(table.platform),
    periodIdx: index('sales_period_idx').on(table.salePeriod),
    platformPeriodIdx: index('sales_platform_period_idx').on(table.platform, table.salePeriod),
    skuIdx: index('sales_sku_idx').on(table.sku),

    // Evita duplicatas: mesma plataforma + anúncio + SKU + período
    uniqueSaleEntry: uniqueIndex('sales_unique_entry_idx').on(
      table.platform,
      table.adId,
      table.sku,
      table.salePeriod
    ),
  })
)

// ─── UPLOAD LOG TABLE ─────────────────────────────────────────────────────
// Registra cada importação para auditoria e evitar re-uploads
export const uploadLogs = pgTable(
  'upload_logs',
  {
    id: serial('id').primaryKey(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    platform: varchar('platform', { length: 50 }).notNull(),
    salePeriod: varchar('sale_period', { length: 7 }).notNull(),
    rowsInserted: numeric('rows_inserted', { precision: 10, scale: 0 }).notNull().default('0'),
    rowsSkipped: numeric('rows_skipped', { precision: 10, scale: 0 }).notNull().default('0'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('success'), // 'success' | 'error'
    errorMessage: varchar('error_message', { length: 1000 }),
  },
  (table) => ({
    periodIdx: index('upload_logs_period_idx').on(table.salePeriod),
    platformIdx: index('upload_logs_platform_idx').on(table.platform),
  })
)

// ─── TYPES ────────────────────────────────────────────────────────────────
export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert
export type UploadLog = typeof uploadLogs.$inferSelect
export type NewUploadLog = typeof uploadLogs.$inferInsert
