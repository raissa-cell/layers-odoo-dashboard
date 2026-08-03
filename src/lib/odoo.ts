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
    port: url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80),
    path: `/xmlrpc/2/${path}`,
  };
  return url.protocol === 'https:' ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);
}

export async function odooAuth(): Promise<number | null> {
  if (uidPromise) return uidPromise;

  uidPromise = new Promise((resolve, reject) => {
    const common = getClient('common');
    common.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}], (error: any, uid: any) => {
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
    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs], (error: any, result: any) => {
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

// ─── PRÉ-VENDAS (SDR) ───────────────────────────────────────────────────────
// IMPORTANTE: todas as chamadas abaixo são SOMENTE LEITURA (search_read/read_group/
// search_count). NUNCA usar create/write/unlink neste projeto.

// Ordem canônica do funil de pré-vendas (stage_id.name no Odoo da Layers)
export const PRE_VENDAS_STAGE_ORDER = [
  'Novo',
  'Sem contato',
  'Contato',
  'Agendado',
  'NoShow',
  'Qualified',
  'Cotação Enviada',
  'Proposta Visualizada',
  'Pagamento confirmado',
  'Pedido Confirmado',
];

export interface SdrFunnelStage {
  stage: string;
  count: number;
}

export interface SdrSummary {
  sdrId: number;
  sdrName: string;
  totalLeads: number;
  funnel: SdrFunnelStage[];
  meetingsScheduled: number; // reuniões com data de qualificação
  meetingsAttended: number; // reuniões com check-in realizado
  won: number; // leads em stages is_won
}

export interface PreVendasReport {
  generatedAt: string;
  source: 'odoo' | 'mock';
  stageOrder: string[];
  sdrs: SdrSummary[];
}

// Descobre dinamicamente os SDRs (usuários preenchidos em crm.lead.sdr_id)
async function getSdrUsers(): Promise<Array<[number, string]>> {
  const groups = await odooCall('crm.lead', 'read_group', [
    [['sdr_id', '!=', false]],
  ], {
    fields: ['sdr_id'],
    groupby: ['sdr_id'],
  });
  return (groups as Array<{ sdr_id: [number, string] }>)
    .filter((g) => g.sdr_id)
    .map((g) => g.sdr_id);
}

export async function getPreVendasReport(): Promise<PreVendasReport> {
  try {
    const sdrs = await getSdrUsers();
    const wonStages = new Set(['Pagamento confirmado', 'Pedido Confirmado']);

    const summaries: SdrSummary[] = [];

    for (const [sdrId, sdrName] of sdrs) {
      // Funil: agrupa por stage para este SDR (read_group = agregação, read-only)
      const byStage = (await odooCall('crm.lead', 'read_group', [
        [['sdr_id', '=', sdrId]],
      ], {
        fields: ['stage_id'],
        groupby: ['stage_id'],
        lazy: false,
      })) as Array<{ stage_id: [number, string] | false; __count: number }>;

      const counts = new Map<string, number>();
      let total = 0;
      let won = 0;
      for (const row of byStage) {
        const stageName = row.stage_id ? row.stage_id[1] : 'Sem etapa';
        counts.set(stageName, (counts.get(stageName) || 0) + row.__count);
        total += row.__count;
        if (wonStages.has(stageName)) won += row.__count;
      }

      const funnel: SdrFunnelStage[] = PRE_VENDAS_STAGE_ORDER
        .filter((s) => counts.has(s))
        .map((s) => ({ stage: s, count: counts.get(s) || 0 }));

      const meetingsScheduled = (await odooCall('crm.lead', 'search_count', [
        [['sdr_id', '=', sdrId], ['sdr_meeting_start', '!=', false]],
      ])) as unknown as number;

      const meetingsAttended = (await odooCall('crm.lead', 'search_count', [
        [['sdr_id', '=', sdrId], ['sdr_meeting_attended', '=', true]],
      ])) as unknown as number;

      summaries.push({
        sdrId,
        sdrName,
        totalLeads: total,
        funnel,
        meetingsScheduled,
        meetingsAttended,
        won,
      });
    }

    summaries.sort((a, b) => b.totalLeads - a.totalLeads);

    return {
      generatedAt: new Date().toISOString(),
      source: 'odoo',
      stageOrder: PRE_VENDAS_STAGE_ORDER,
      sdrs: summaries,
    };
  } catch (err) {
    console.error('getPreVendasReport failed', err);
    return getMockPreVendas();
  }
}

function getMockPreVendas(): PreVendasReport {
  return {
    generatedAt: new Date().toISOString(),
    source: 'mock',
    stageOrder: PRE_VENDAS_STAGE_ORDER,
    sdrs: [
      {
        sdrId: 104,
        sdrName: 'Douglas da Costa Junior',
        totalLeads: 1103,
        meetingsScheduled: 39,
        meetingsAttended: 25,
        won: 6,
        funnel: [
          { stage: 'Novo', count: 655 },
          { stage: 'Sem contato', count: 314 },
          { stage: 'Contato', count: 53 },
          { stage: 'Agendado', count: 16 },
          { stage: 'NoShow', count: 4 },
          { stage: 'Qualified', count: 17 },
          { stage: 'Cotação Enviada', count: 6 },
          { stage: 'Proposta Visualizada', count: 3 },
          { stage: 'Pedido Confirmado', count: 6 },
        ],
      },
      {
        sdrId: 103,
        sdrName: 'Luanna Santos de Almeida',
        totalLeads: 885,
        meetingsScheduled: 33,
        meetingsAttended: 15,
        won: 19,
        funnel: [
          { stage: 'Novo', count: 79 },
          { stage: 'Sem contato', count: 726 },
          { stage: 'Contato', count: 16 },
          { stage: 'Agendado', count: 7 },
          { stage: 'Qualified', count: 13 },
          { stage: 'Cotação Enviada', count: 9 },
          { stage: 'Proposta Visualizada', count: 16 },
          { stage: 'Pedido Confirmado', count: 19 },
        ],
      },
    ],
  };
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
