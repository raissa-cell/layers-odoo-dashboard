# Odoo Dashboard — Layers Education

Dashboard de acompanhamento de metas e pipeline comercial, consumindo dados direto do Odoo via JSON-RPC.

## Stack
- **Next.js 14** (App Router + TypeScript)
- **Recharts** — Gráficos
- **Vercel** — Deploy e cron jobs

## Desenvolvimento local

```bash
npm run dev
```

Acesse: http://localhost:3000

## Variáveis de Ambiente

Crie um `.env.local`:

```env
ODOO_URL=https://odoo.layers.digital
ODOO_API_KEY=sua_api_key
ODOO_DB=layers
ODOO_USER=seu@email.com
```

## Deploy

Push para `main` → Vercel faz deploy automático.
