# Sales Dashboard — Next.js + Drizzle + Neon

Stack: **Next.js 14** · **Drizzle ORM** · **Neon Postgres** · **Vercel**

---

## Setup local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar env e preencher com sua connection string do Neon
cp .env.example .env.local

# 3. Criar tabelas no banco
npm run db:push

# 4. Rodar localmente
npm run dev
```

---

## Deploy na Vercel

```bash
# 1. Push para GitHub
git init && git add . && git commit -m "init"
gh repo create sales-dashboard --private --push

# 2. Importar projeto na Vercel (vercel.com/new)
# 3. Adicionar variável de ambiente:
#    DATABASE_URL = <sua connection string pooled do Neon>
# 4. Deploy automático no push
```

---

## Estrutura

```
src/
  db/
    schema.ts      ← Tabelas: sales, upload_logs
    index.ts       ← Conexão Neon + Drizzle
    queries.ts     ← Queries tipadas para dashboards
  app/
    api/
      sales/
        route.ts   ← POST (ingestão) · GET (summary)
drizzle.config.ts  ← Config Drizzle Kit
```

---

## API

### `POST /api/sales`
Recebe o JSON normalizado do script Python.

```json
{
  "file_name": "Relatorio_desempenho_202601.xlsx",
  "rows": [
    {
      "codigo_plataforma": "Mercado Livre",
      "anuncio_id": "123456",
      "nome_anuncio": "Produto X",
      "sku": "SKU-001",
      "codigo_produto": "SKU-001",
      "quantidade_vendida": 10,
      "total_faturado": 299.90,
      "data_venda": "2026-01"
    }
  ]
}
```

### `GET /api/sales?period=2026-01`
Retorna resumo por plataforma + top 10 produtos do período.

---

## Scripts úteis

| Comando | Ação |
|---|---|
| `npm run db:push` | Aplica schema no banco (dev) |
| `npm run db:generate` | Gera migration SQL |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:studio` | Abre Drizzle Studio (UI do banco) |
