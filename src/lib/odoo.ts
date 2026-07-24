import xmlrpc from 'xmlrpc';

// Odoo XML-RPC Client
const ODOO_URL = process.env.ODOO_URL || 'https://odoo.layers.digital';
const ODOO_DB = process.env.ODOO_DB || 'layers-digital-odoo-erp-main-16134201';
const ODOO_USER = process.env.ODOO_USER || 'raissa.rios@layers.education';
const ODOO_API_KEY = process.env.ODOO_API_KEY || '';

// Create a singleton promise for authentication to avoid multiple auth calls
let uidPromise: Promise<number | null> | null = null;

function getClient(path: string) {
  const url = new URL(ODOO_URL);
  const options = {
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: `/xmlrpc/2/${path}`,
  };
  return url.protocol === 'https:' ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);
}

export async function odooAuth(): Promise<number | null> {
  if (uidPromise) return uidPromise;

  uidPromise = new Promise((resolve, reject) => {
    const common = getClient('common');
    common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}], (error, uid) => {
      if (error) {
        console.error('Odoo Auth Error:', error);
        uidPromise = null; // reset so next time it tries again
        return reject(error);
      }
      if (!uid) {
        console.warn('Odoo Auth Failed: Invalid credentials or database');
        uidPromise = null;
        return resolve(null);
      }
      resolve(uid);
    });
  });

  return uidPromise;
}

export async function odooCall(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> {
  const uid = await odooAuth();
  if (!uid) {
    throw new Error('Authentication failed');
  }

  return new Promise((resolve, reject) => {
    const models = getClient('object');
    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs], (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// Busca oportunidades CRM (pipeline)
export async function getSalesPipeline() {
  try {
    const records = await odooCall('crm.lead', 'search_read', [
      [
        ['type', '=', 'opportunity'],
        ['active', '=', true],
        ['stage_id.is_won', '=', false],
        ['probability', '<', 100]
      ]
    ], {
      fields: ['name', 'partner_name', 'expected_revenue', 'probability', 'stage_id', 'user_id', 'date_deadline', 'kanban_state', 'medium_id', 'source_id', 'campaign_id'],
      limit: 100,
      order: 'expected_revenue desc',
    });
    return records;
  } catch (err) {
    console.error('getSalesPipeline failed', err);
    return getMockPipeline();
  }
}

// Busca faturas
export async function getInvoices(dateFrom?: string, dateTo?: string) {
  try {
    const domain: any[] = [['move_type', 'in', ['out_invoice', 'out_refund']], ['state', '=', 'posted']];
    if (dateFrom) domain.push(['invoice_date', '>=', dateFrom]);
    if (dateTo) domain.push(['invoice_date', '<=', dateTo]);

    const records = await odooCall('account.move', 'search_read', [domain], {
      fields: ['name', 'partner_id', 'amount_total', 'invoice_date', 'payment_state', 'user_id'],
      limit: 200,
      order: 'invoice_date desc',
    });
    return records;
  } catch {
    return getMockInvoices();
  }
}

// Busca metas de vendas
export async function getSalesTargets() {
  try {
    const records = await odooCall('sale.order', 'search_read', [
      [['state', 'in', ['sale', 'done']]]
    ], {
      fields: ['name', 'partner_id', 'amount_total', 'date_order', 'user_id', 'team_id'],
      limit: 200,
      order: 'date_order desc',
    });
    return records;
  } catch {
    return getMockSalesOrders();
  }
}

// Busca performance por vendedor (negócios ganhos)
export async function getTeamPerformance() {
  try {
    const records = await odooCall('crm.lead', 'search_read', [
      [['type', '=', 'opportunity'], ['stage_id.is_won', '=', true]]
    ], {
      fields: ['user_id', 'expected_revenue', 'date_closed'],
      limit: 500,
    });
    return records;
  } catch {
    return getMockTeamData();
  }
}

// ─── MOCK DATA (fallback quando Odoo não responde) ──────────────────────────

function getMockPipeline() {
  return [
    { id: 1, name: 'Colégio Augusto Laranja', partner_name: 'Augusto Laranja', expected_revenue: 38038.80, probability: 60, stage_id: [3, 'Proposta'], user_id: [1, 'Raissa'], kanban_state: 'normal', medium_id: [1, 'Email'], source_id: [1, 'Apollo'] },
    { id: 2, name: 'Colégio Magno', partner_name: 'Colégio Magno', expected_revenue: 26518.80, probability: 50, stage_id: [3, 'Proposta'], user_id: [1, 'Raissa'], kanban_state: 'normal', medium_id: [2, 'WhatsApp'], source_id: [2, 'Indicação'] },
    { id: 3, name: 'Colégio Rio Branco Campinas', partner_name: 'Rio Branco', expected_revenue: 41878.80, probability: 70, stage_id: [4, 'Negociação'], user_id: [1, 'Raissa'], kanban_state: 'blocked', medium_id: [1, 'Email'], source_id: [1, 'Apollo'] },
    { id: 4, name: 'Rede Alfa CEM Bilíngue', partner_name: 'Alfa CEM', expected_revenue: 115542.00, probability: 40, stage_id: [4, 'Negociação'], user_id: [2, 'João'], kanban_state: 'normal', medium_id: [3, 'LinkedIn'], source_id: [3, 'Inbound'] },
    { id: 5, name: 'Escola Pan Americana', partner_name: 'Pan Americana', expected_revenue: 54382.00, probability: 30, stage_id: [2, 'Qualificado'], user_id: [2, 'João'], kanban_state: 'normal', medium_id: [1, 'Email'], source_id: [1, 'Apollo'] },
    { id: 6, name: 'Rede Resolve Educação', partner_name: 'Resolve', expected_revenue: 86388.00, probability: 25, stage_id: [2, 'Qualificado'], user_id: [1, 'Raissa'], kanban_state: 'normal', medium_id: [1, 'Email'], source_id: [1, 'Apollo'] },
  ];
}

function getMockInvoices() {
  return [
    { id: 1, name: 'INV/2026/001', partner_id: [1, 'Colégio Pequeno Príncipe'], amount_total: 30563.00, invoice_date: '2026-03-15', payment_state: 'paid', user_id: [1, 'Raissa'] },
    { id: 2, name: 'INV/2026/002', partner_id: [2, 'Escola ABC'], amount_total: 12500.00, invoice_date: '2026-04-02', payment_state: 'not_paid', user_id: [2, 'João'] },
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
    { id: 2, user_id: [2, 'João'], expected_revenue: 45000.00, date_closed: '2026-03-20' },
  ];
}
