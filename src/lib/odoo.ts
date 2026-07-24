// Odoo JSON-RPC Client
const ODOO_URL = process.env.ODOO_URL || 'https://odoo.layers.digital';
const ODOO_API_KEY = process.env.ODOO_API_KEY || '';

interface OdooCallParams {
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

async function odooCall({ model, method, args = [], kwargs = {} }: OdooCallParams) {
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model,
        method,
        args,
        kwargs: {
          context: {},
          ...kwargs,
        },
      },
    }),
    cache: 'no-store',
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.data?.message || 'Odoo API error');
  return data.result;
}

async function odooAuth() {
  const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: process.env.ODOO_DB || 'layers',
        login: process.env.ODOO_USER || '',
        password: ODOO_API_KEY,
      },
    }),
  });
  return response.json();
}

// Busca oportunidades CRM (pipeline)
export async function getSalesPipeline() {
  try {
    const records = await odooCall({
      model: 'crm.lead',
      method: 'search_read',
      kwargs: {
        domain: [
          ['type', '=', 'opportunity'],
          ['active', '=', true],
          ['stage_id.is_won', '=', false],
          ['probability', '<', 100],
        ],
        fields: ['name', 'partner_name', 'expected_revenue', 'probability', 'stage_id', 'user_id', 'date_deadline', 'kanban_state'],
        limit: 100,
        order: 'expected_revenue desc',
      },
    });
    return records;
  } catch {
    return getMockPipeline();
  }
}

// Busca faturas
export async function getInvoices(dateFrom?: string, dateTo?: string) {
  try {
    const domain: unknown[] = [['move_type', 'in', ['out_invoice', 'out_refund']], ['state', '=', 'posted']];
    if (dateFrom) domain.push(['invoice_date', '>=', dateFrom]);
    if (dateTo) domain.push(['invoice_date', '<=', dateTo]);

    const records = await odooCall({
      model: 'account.move',
      method: 'search_read',
      kwargs: {
        domain,
        fields: ['name', 'partner_id', 'amount_total', 'invoice_date', 'payment_state', 'user_id'],
        limit: 200,
        order: 'invoice_date desc',
      },
    });
    return records;
  } catch {
    return getMockInvoices();
  }
}

// Busca metas de vendas
export async function getSalesTargets() {
  try {
    const records = await odooCall({
      model: 'sale.order',
      method: 'search_read',
      kwargs: {
        domain: [['state', 'in', ['sale', 'done']]],
        fields: ['name', 'partner_id', 'amount_total', 'date_order', 'user_id', 'team_id'],
        limit: 200,
        order: 'date_order desc',
      },
    });
    return records;
  } catch {
    return getMockSalesOrders();
  }
}

// Busca performance por vendedor
export async function getTeamPerformance() {
  try {
    const records = await odooCall({
      model: 'crm.lead',
      method: 'search_read',
      kwargs: {
        domain: [['type', '=', 'opportunity'], ['stage_id.is_won', '=', true]],
        fields: ['user_id', 'expected_revenue', 'date_closed'],
        limit: 500,
      },
    });
    return records;
  } catch {
    return getMockTeamData();
  }
}

// ─── MOCK DATA (fallback quando Odoo não responde) ──────────────────────────

function getMockPipeline() {
  return [
    { id: 1, name: 'Colégio Augusto Laranja', partner_name: 'Augusto Laranja', expected_revenue: 38038.80, probability: 60, stage_id: [3, 'Proposta'], user_id: [1, 'Raissa'], kanban_state: 'normal' },
    { id: 2, name: 'Colégio Magno', partner_name: 'Colégio Magno', expected_revenue: 26518.80, probability: 50, stage_id: [3, 'Proposta'], user_id: [1, 'Raissa'], kanban_state: 'normal' },
    { id: 3, name: 'Colégio Rio Branco Campinas', partner_name: 'Rio Branco', expected_revenue: 41878.80, probability: 70, stage_id: [4, 'Negociação'], user_id: [1, 'Raissa'], kanban_state: 'blocked' },
    { id: 4, name: 'Rede Alfa CEM Bilíngue', partner_name: 'Alfa CEM', expected_revenue: 115542.00, probability: 40, stage_id: [4, 'Negociação'], user_id: [1, 'Raissa'], kanban_state: 'normal' },
    { id: 5, name: 'Escola Pan Americana', partner_name: 'Pan Americana', expected_revenue: 54382.00, probability: 30, stage_id: [2, 'Qualificado'], user_id: [1, 'Raissa'], kanban_state: 'normal' },
    { id: 6, name: 'Rede Resolve Educação', partner_name: 'Resolve', expected_revenue: 86388.00, probability: 25, stage_id: [2, 'Qualificado'], user_id: [1, 'Raissa'], kanban_state: 'normal' },
  ];
}

function getMockInvoices() {
  return [
    { id: 1, name: 'INV/2026/001', partner_id: [1, 'Colégio Pequeno Príncipe'], amount_total: 30563.00, invoice_date: '2026-03-15', payment_state: 'paid' },
    { id: 2, name: 'INV/2026/002', partner_id: [2, 'Escola ABC'], amount_total: 12500.00, invoice_date: '2026-04-02', payment_state: 'not_paid' },
  ];
}

function getMockSalesOrders() {
  return [
    { id: 1, name: 'S00001', partner_id: [1, 'Colégio Pequeno Príncipe'], amount_total: 30563.00, date_order: '2026-03-10', user_id: [1, 'Raissa'] },
  ];
}

function getMockTeamData() {
  return [
    { id: 1, user_id: [1, 'Raissa'], expected_revenue: 30563.00, date_closed: '2026-03-15' },
  ];
}
