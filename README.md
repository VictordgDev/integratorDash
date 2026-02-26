# ecommerce-normalizer

Sistema de normalização de vendas multi-plataforma para **PROFILM DO BRASIL**.

Consome arquivos de vendas do **Shopee**, **Mercado Livre** e **Amazon**, normaliza os dados e exporta um CSV unificado para análise.

---

## 🏗️ Arquitetura

```
ecommerce-normalizer/
├── apps/
│   └── api/                    # API HTTP (Hono + Node.js) → Vercel
│
└── packages/
    ├── shared/                 # Tipos TypeScript compartilhados
    ├── nfe-parser/             # Parsers: NFe XML (Shopee/ML) + Amazon TXT
    ├── csv-exporter/           # Gerador de CSV normalizado
    └── db/                     # Drizzle ORM + schema Neon PostgreSQL
```

**Stack:** TypeScript · Node.js · Hono · Drizzle ORM · Neon (PostgreSQL) · Vercel · Turborepo

---

## 📦 Formatos de arquivo suportados

| Plataforma     | Formato     | Descrição                                      |
|----------------|-------------|------------------------------------------------|
| Shopee         | `.zip`      | ZIP com XMLs de NFe 4.00 (série 3)             |
| Mercado Livre  | `.zip`      | ZIP com XMLs procNFe 4.00 (série 1 e 2)        |
| Amazon         | `.txt`      | TSV com colunas de pedido (order report)       |

---

## 🚀 Setup local

### Pré-requisitos
- Node.js 20+
- npm 10+

### Instalação

```bash
git clone <repo>
cd ecommerce-normalizer
npm install

# Copia e preenche as variáveis de ambiente
cp .env.example .env
```

### Variáveis de ambiente

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/ecommerce_normalizer?sslmode=require"
```

### Banco de dados (Neon)

```bash
# Gera as migrations
npm run db:generate

# Aplica no banco
npm run db:push
```

### Dev

```bash
npm run dev
# API disponível em http://localhost:3000
```

---

## 📡 API

### `POST /import/:platform`

Parseia um arquivo de vendas e retorna os pedidos normalizados em JSON.

**Params:**
- `:platform` → `shopee` | `mercadolivre` | `amazon`
- `?save=true` → persiste os pedidos no banco Neon

**Body (multipart/form-data):**
- `file` → arquivo ZIP (Shopee/ML) ou TXT (Amazon)

```bash
# Shopee
curl -X POST http://localhost:3000/import/shopee \
  -F "file=@876810715_NFe_Vendas.zip"

# Amazon
curl -X POST http://localhost:3000/import/amazon \
  -F "file=@139259020510.txt"
```

---

### `POST /pipeline/:platform`

**Pipeline completo:** parseia → salva no banco → retorna CSV para download.

```bash
curl -X POST http://localhost:3000/pipeline/shopee \
  -F "file=@876810715_NFe_Vendas.zip" \
  -o vendas_shopee.csv
```

Headers de resposta com estatísticas:
- `X-Import-Total`, `X-Import-Success`, `X-Import-Errors`
- `X-DB-Inserted`, `X-DB-Skipped`

---

### `POST /export/csv`

Converte pedidos normalizados (JSON) em CSV.

**Query params:**
- `platform` → filtra por plataforma
- `includeItems=true` → uma linha por item (default: uma linha por pedido)
- `includeTaxes=false` → omite colunas de impostos
- `delimiter=,` → separador (default: `;`)

```bash
curl -X POST http://localhost:3000/export/csv \
  -H "Content-Type: application/json" \
  -d '{"orders": [...]}' \
  -o vendas.csv
```

---

## 📊 Schema do CSV exportado

### Por pedido (padrão)

| Coluna | Descrição |
|--------|-----------|
| `plataforma` | shopee / mercadolivre / amazon |
| `id_pedido` | ID original na plataforma |
| `numero_nfe` | Número da NF-e |
| `chave_nfe` | Chave de acesso 44 dígitos |
| `data_compra` | DD/MM/YYYY HH:MM |
| `status` | pending / delivered / cancelled / ... |
| `cpf_comprador` | CPF sem formatação |
| `nome_comprador` | Nome do destinatário |
| `cidade_comprador` | Cidade de entrega |
| `estado_comprador` | UF |
| `itens_descricao` | Descrições separadas por ` \| ` |
| `subtotal` | Valor dos produtos |
| `frete` | Custo de frete |
| `desconto` | Desconto total |
| `total` | Valor total da venda |
| `forma_pagamento` | Pix / Parcelado / etc |
| `transportadora` | Nome da transportadora |
| `icms_total` | ICMS (apenas NFe) |
| `pis_total` | PIS (apenas NFe) |
| `cofins_total` | COFINS (apenas NFe) |
| `difal_total` | DIFAL (apenas NFe) |

### Por item (`?includeItems=true`)

Expande cada item em uma linha separada, com colunas `item_*` por SKU/produto.

---

## 🗄️ Schema do banco de dados

```sql
orders          -- Pedidos normalizados (única tabela central)
order_items     -- Itens de cada pedido
import_logs     -- Histórico de importações com erros
```

Índices criados: `(platform, platform_order_id)` único, `purchase_date`, `buyer_cpf`.

---

## 🌐 Deploy (Vercel + Neon)

```bash
# Instala Vercel CLI
npm i -g vercel

# Configura variável de ambiente na Vercel
vercel env add DATABASE_URL

# Deploy
vercel --prod
```

---

## 💡 Sugestões para evolução do projeto

### Curto prazo
- [ ] **Interface web simples** — upload de arquivo com preview do CSV antes de baixar
- [ ] **Validação de NFe** — verificar chave de acesso, CNPJ emitente, datas
- [ ] **Deduplicação** — detectar pedidos repetidos entre plataformas (ex: mesmo CPF + produto + data)

### Médio prazo
- [ ] **Relatório de conciliação** — cruzar NF-e com repasses financeiros de cada marketplace
- [ ] **Alertas de impostos** — notificar quando DIFAL ou alíquota ICMS fogem do esperado
- [ ] **Processamento automático** — webhook ou polling de pasta para importar novos arquivos automaticamente
- [ ] **Suporte a devoluções** — detectar e processar NFe de devolução (finNFe=4)

### Longo prazo
- [ ] **Dashboard analítico** — gráfico de vendas por plataforma, SKU, estado, período
- [ ] **Integração com ERP** — exportar em formato compatível com Bling, Omie, etc.
- [ ] **Multi-empresa** — suporte a múltiplos CNPJs emitentes

---

## 🔒 Segurança

- CPFs são armazenados sem formatação, sem hash (considerar criptografia se necessário pela LGPD)
- Banco Neon requer SSL (`sslmode=require`)
- Sem autenticação implementada na API — adicionar JWT ou API key antes de expor publicamente
