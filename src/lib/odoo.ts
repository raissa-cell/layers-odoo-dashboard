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

export async function odooCall<T = any>(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<T> {
  const uid = await odooAuth();
  if (!uid) {
    throw new Error('Authentication failed');
  }

  return new Promise<T>((resolve, reject) => {
    const models = getClient('object');
    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs], (error: any, result: T) => {
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
  meetingsScheduled: number; // reuniões agendadas (crm.lead.sdr_meeting_start preenchido)
  meetingsAttended: number; // reuniões realizadas (crm.lead.sdr_meeting_attended = check-in)
  won: number; // leads em etapas ganhas (crm.stage.is_won = true)
}

export interface PreVendasReport {
  generatedAt: string;
  source: 'odoo';
  stageOrder: string[];
  sdrs: SdrSummary[];
  // Série mensal (apenas 2026) — uma entrada por mês, com valores por SDR.
  monthly: MonthlyPoint[];
  monthlyYear: number;
}

// Ponto mensal da tendência. `leads` e `meetings` mapeiam nome do SDR → contagem.
export interface MonthlyPoint {
  month: string; // 'YYYY-MM'
  label: string; // ex.: 'Jan', 'Fev'
  leads: Record<string, number>; // leads criados no mês (create_date), por SDR
  meetings: Record<string, number>; // reuniões agendadas no mês (sdr_meeting_start), por SDR
}

// Linha de agregação retornada por read_group agrupado por sdr_id + stage_id
interface FunnelRow {
  sdr_id: [number, string] | false;
  stage_id: [number, string] | false;
  __count: number;
}
// Linha de agregação retornada por read_group agrupado só por sdr_id
interface SdrCountRow {
  sdr_id: [number, string] | false;
  __count: number;
}
interface StageRow {
  name: string;
  is_won: boolean;
}
// Linha de read_group agrupado por sdr_id + <campo de data>:month.
// A chave do agrupamento mensal traz o rótulo localizado (ex.: "abril 2026") e
// um __range com as datas ISO — usamos o __range para extrair 'YYYY-MM' sem depender de locale.
interface MonthlyRow {
  sdr_id: [number, string] | false;
  __count: number;
  __range?: Record<string, { from: string; to: string }>;
  [key: string]: unknown;
}

/**
 * Report de pré-vendas por SDR — SOMENTE LEITURA do Odoo.
 *
 * Faz um número CONSTANTE de chamadas XML-RPC (não escala com o nº de SDRs):
 *   1. crm.stage → mapa de etapas ganhas (is_won) — fonte da verdade, sem hardcode
 *   2. crm.lead read_group por sdr_id + stage_id → funil completo de todos os SDRs
 *   3. crm.lead read_group por sdr_id (com sdr_meeting_start) → reuniões agendadas
 *   4. crm.lead read_group por sdr_id (com sdr_meeting_attended=true) → realizadas
 *   5. crm.lead read_group por sdr_id + create_date:month (2026) → leads criados/mês
 *   6. crm.lead read_group por sdr_id + sdr_meeting_start:month (2026) → reuniões agendadas/mês
 *
 * Em caso de falha (Odoo indisponível / credenciais), PROPAGA o erro — nunca
 * retorna dados fake. A camada de API converte isso em HTTP 500 e a UI mostra
 * uma mensagem de erro, garantindo que todo número exibido seja real.
 */
export async function getPreVendasReport(): Promise<PreVendasReport> {
  const MONTHLY_YEAR = 2026;
  const yearStart = `${MONTHLY_YEAR}-01-01 00:00:00`;
  const yearEnd = `${MONTHLY_YEAR}-12-31 23:59:59`;

  // Chamadas independentes em paralelo
  const [stages, funnelRows, scheduledRows, attendedRows, leadsMonthRows, meetingsMonthRows] = await Promise.all([
    odooCall<StageRow[]>('crm.stage', 'search_read', [[]], {
      fields: ['name', 'is_won'],
    }),
    // Funil completo (2026)
    odooCall<FunnelRow[]>('crm.lead', 'read_group', [
      [['sdr_id', '!=', false], ['create_date', '>=', yearStart], ['create_date', '<=', yearEnd]],
    ], {
      fields: ['sdr_id'],
      groupby: ['sdr_id', 'stage_id'],
      lazy: false,
    }),
    // Reuniões agendadas (2026)
    odooCall<SdrCountRow[]>('crm.lead', 'read_group', [
      [['sdr_id', '!=', false], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]],
    ], {
      fields: ['sdr_id'],
      groupby: ['sdr_id'],
      lazy: false,
    }),
    // Reuniões realizadas (2026)
    odooCall<SdrCountRow[]>('crm.lead', 'read_group', [
      [['sdr_id', '!=', false], ['sdr_meeting_attended', '=', true], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]],
    ], {
      fields: ['sdr_id'],
      groupby: ['sdr_id'],
      lazy: false,
    }),
    // Leads criados por mês (2026)
    odooCall<MonthlyRow[]>('crm.lead', 'read_group', [
      [['sdr_id', '!=', false], ['create_date', '>=', yearStart], ['create_date', '<=', yearEnd]],
    ], {
      fields: ['sdr_id'],
      groupby: ['sdr_id', 'create_date:month'],
      lazy: false,
    }),
    // Reuniões agendadas por mês (2026)
    odooCall<MonthlyRow[]>('crm.lead', 'read_group', [
      [['sdr_id', '!=', false], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]],
    ], {
      fields: ['sdr_id'],
      groupby: ['sdr_id', 'sdr_meeting_start:month'],
      lazy: false,
    }),
  ]);

  const wonStageNames = new Set(stages.filter((s) => s.is_won).map((s) => s.name));
  const scheduledBySdr = new Map<number, number>();
  for (const r of scheduledRows) if (r.sdr_id) scheduledBySdr.set(r.sdr_id[0], r.__count);
  const attendedBySdr = new Map<number, number>();
  for (const r of attendedRows) if (r.sdr_id) attendedBySdr.set(r.sdr_id[0], r.__count);

  // Monta o resumo por SDR a partir do funil agregado
  interface Acc { sdrName: string; counts: Map<string, number>; total: number; won: number }
  const bySdr = new Map<number, Acc>();

  for (const row of funnelRows) {
    if (!row.sdr_id) continue;
    const [sdrId, sdrName] = row.sdr_id;
    const stageName = row.stage_id ? row.stage_id[1] : 'Sem etapa';

    let acc = bySdr.get(sdrId);
    if (!acc) {
      acc = { sdrName, counts: new Map(), total: 0, won: 0 };
      bySdr.set(sdrId, acc);
    }
    acc.counts.set(stageName, (acc.counts.get(stageName) || 0) + row.__count);
    acc.total += row.__count;
    if (wonStageNames.has(stageName)) acc.won += row.__count;

    // Detecta drift de configuração: stage que existe no Odoo mas não na ordem canônica
    if (stageName !== 'Sem etapa' && !PRE_VENDAS_STAGE_ORDER.includes(stageName)) {
      console.warn(`[pre-vendas] Stage "${stageName}" não está em PRE_VENDAS_STAGE_ORDER — não aparecerá no funil.`);
    }
  }

  const summaries: SdrSummary[] = [];
  for (const [sdrId, acc] of bySdr) {
    const funnel: SdrFunnelStage[] = PRE_VENDAS_STAGE_ORDER
      .filter((s) => acc.counts.has(s))
      .map((s) => ({ stage: s, count: acc.counts.get(s)! }));

    summaries.push({
      sdrId,
      sdrName: acc.sdrName,
      // NOTA: totalLeads inclui leads em "Sem etapa" (stage_id vazio), que
      // intencionalmente NÃO aparece no funil. Por isso a soma das barras do
      // funil pode ser menor que totalLeads.
      totalLeads: acc.total,
      funnel,
      meetingsScheduled: scheduledBySdr.get(sdrId) || 0,
      meetingsAttended: attendedBySdr.get(sdrId) || 0,
      won: acc.won,
    });
  }

  summaries.sort((a, b) => b.totalLeads - a.totalLeads);

  // ── Série mensal (2026): leads criados + reuniões agendadas, por SDR ──
  // Extrai 'YYYY-MM' do __range (from = 'YYYY-MM-01 ...'), sem depender de locale.
  const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthMap = new Map<string, MonthlyPoint>();

  function ensureMonth(ym: string): MonthlyPoint {
    let pt = monthMap.get(ym);
    if (!pt) {
      const monthIdx = Number(ym.slice(5, 7)) - 1;
      pt = { month: ym, label: MONTH_LABELS[monthIdx] ?? ym, leads: {}, meetings: {} };
      monthMap.set(ym, pt);
    }
    return pt;
  }

  function ymFromRow(row: MonthlyRow, field: string): string | null {
    const from = row.__range?.[field]?.from;
    return from ? from.slice(0, 7) : null; // 'YYYY-MM'
  }

  for (const row of leadsMonthRows) {
    if (!row.sdr_id) continue;
    const ym = ymFromRow(row, 'create_date:month');
    if (!ym) continue;
    const pt = ensureMonth(ym);
    pt.leads[row.sdr_id[1]] = (pt.leads[row.sdr_id[1]] || 0) + row.__count;
  }
  for (const row of meetingsMonthRows) {
    if (!row.sdr_id) continue;
    const ym = ymFromRow(row, 'sdr_meeting_start:month');
    if (!ym) continue;
    const pt = ensureMonth(ym);
    pt.meetings[row.sdr_id[1]] = (pt.meetings[row.sdr_id[1]] || 0) + row.__count;
  }

  const monthly = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    generatedAt: new Date().toISOString(),
    source: 'odoo',
    stageOrder: PRE_VENDAS_STAGE_ORDER,
    sdrs: summaries,
    monthly,
    monthlyYear: MONTHLY_YEAR,
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
