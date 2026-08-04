import xmlrpc from 'xmlrpc';

// Odoo XML-RPC Client
const ODOO_URL = 'https://odoo.layers.digital';
const ODOO_DB = 'layers-digital-odoo-erp-main-16134201';
const ODOO_USER = 'raissa.rios@layers.education';
const ODOO_API_KEY = '751e97cc9d704cb2b4d6697cd78d6425ece08045';

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
      if (error) { uidPromise = null; return reject(error); }
      if (!uid) { uidPromise = null; return resolve(null); }
      resolve(uid);
    });
  });
  return uidPromise;
}

export async function odooCall<T = any>(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<T> {
  const uid = await odooAuth();
  if (!uid) throw new Error('Authentication failed');
  return new Promise<T>((resolve, reject) => {
    const models = getClient('object');
    models.methodCall('execute_kw', [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs], (error: any, result: T) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// ─── VENDAS (CLOSER) ────────────────────────────────────────────────────────

export async function getSalesPipeline() {
  return odooCall<any[]>('crm.lead', 'search_read', [[['type', '=', 'opportunity'], ['active', '=', true], ['stage_id.is_won', '=', false], ['probability', '<', 100]]], {
    fields: ['name', 'partner_name', 'expected_revenue', 'probability', 'stage_id', 'user_id'],
    limit: 200,
    order: 'expected_revenue desc',
  });
}

export async function getInvoices() {
  return odooCall<any[]>('account.move', 'search_read', [[['move_type', 'in', ['out_invoice', 'out_refund']], ['state', '=', 'posted'], ['invoice_date', '>=', '2026-01-01']]], {
    fields: ['name', 'partner_id', 'amount_total', 'invoice_date', 'user_id'],
    limit: 500,
  });
}

export async function getTeamPerformance() {
  return odooCall<any[]>('crm.lead', 'search_read', [[['type', '=', 'opportunity'], ['stage_id.is_won', '=', true], ['date_closed', '>=', '2026-01-01']]], {
    fields: ['user_id', 'expected_revenue', 'date_closed'],
  });
}

// ─── PRÉ-VENDAS (SDR) ───────────────────────────────────────────────────────

export const PRE_VENDAS_STAGE_ORDER = ['Novo', 'Sem contato', 'Contato', 'Agendado', 'NoShow', 'Qualified', 'Cotação Enviada', 'Proposta Visualizada', 'Pagamento confirmado', 'Pedido Confirmado'];

export interface SdrSummary {
  sdrId: number;
  sdrName: string;
  totalLeads: number;
  funnel: Array<{ stage: string; count: number }>;
  meetingsScheduled: number;
  meetingsAttended: number;
  won: number;
}

export interface PreVendasReport {
  generatedAt: string;
  sdrs: SdrSummary[];
  monthly: Array<{ month: string; label: string; leads: Record<string, number>; meetings: Record<string, number> }>;
  activities: {
    monthly: Array<{ month: string; label: string; Douglas: number; Luanna: number }>;
    byType: Array<{ type: string; Douglas: number; Luanna: number }>;
  };
}

export async function getPreVendasReport(): Promise<PreVendasReport> {
  const yearStart = '2026-01-01 00:00:00';
  const yearEnd = '2026-12-31 23:59:59';
  const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const [stages, funnelRows, scheduledRows, attendedRows, leadsMonthRows, meetingsMonthRows, activitiesMonthRows, activitiesTypeRows] = await Promise.all([
    odooCall<any[]>('crm.stage', 'search_read', [[]], { fields: ['name', 'is_won'] }),
    odooCall<any[]>('crm.lead', 'read_group', [[['sdr_id', '!=', false], ['create_date', '>=', yearStart], ['create_date', '<=', yearEnd]]], { fields: ['sdr_id'], groupby: ['sdr_id', 'stage_id'], lazy: false }),
    odooCall<any[]>('crm.lead', 'read_group', [[['sdr_id', '!=', false], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]]], { fields: ['sdr_id'], groupby: ['sdr_id'], lazy: false }),
    odooCall<any[]>('crm.lead', 'read_group', [[['sdr_id', '!=', false], ['sdr_meeting_attended', '=', true], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]]], { fields: ['sdr_id'], groupby: ['sdr_id'], lazy: false }),
    odooCall<any[]>('crm.lead', 'read_group', [[['sdr_id', '!=', false], ['create_date', '>=', yearStart], ['create_date', '<=', yearEnd]]], { fields: ['sdr_id'], groupby: ['sdr_id', 'create_date:month'], lazy: false }),
    odooCall<any[]>('crm.lead', 'read_group', [[['sdr_id', '!=', false], ['sdr_meeting_start', '>=', yearStart], ['sdr_meeting_start', '<=', yearEnd]]], { fields: ['sdr_id'], groupby: ['sdr_id', 'sdr_meeting_start:month'], lazy: false }),
    odooCall<any[]>('mail.message', 'read_group', [[['model', '=', 'crm.lead'], ['author_id.user_ids', 'in', [103, 104]], ['date', '>=', yearStart], ['date', '<=', yearEnd]]], { fields: ['author_id'], groupby: ['author_id', 'date:month'], lazy: false }),
    odooCall<any[]>('mail.activity', 'read_group', [[['user_id', 'in', [103, 104]]]], { fields: ['activity_type_id', 'user_id'], groupby: ['activity_type_id', 'user_id'], lazy: false }),
  ]);

  const wonStageNames = new Set(stages.filter(s => s.is_won).map(s => s.name));
  const scheduledBySdr = new Map(); scheduledRows.forEach(r => r.sdr_id && scheduledBySdr.set(r.sdr_id[0], r.__count));
  const attendedBySdr = new Map(); attendedRows.forEach(r => r.sdr_id && attendedBySdr.set(r.sdr_id[0], r.__count));

  const bySdr = new Map<number, any>();
  funnelRows.forEach(row => {
    if (!row.sdr_id) return;
    const [id, name] = row.sdr_id;
    if (!bySdr.has(id)) bySdr.set(id, { name, counts: new Map(), total: 0, won: 0 });
    const acc = bySdr.get(id);
    const stageName = row.stage_id ? row.stage_id[1] : 'Sem etapa';
    acc.counts.set(stageName, (acc.counts.get(stageName) || 0) + row.__count);
    acc.total += row.__count;
    if (wonStageNames.has(stageName)) acc.won += row.__count;
  });

  const monthMap = new Map<string, any>();
  const ensureMonth = (ym: string) => {
    if (!monthMap.has(ym)) monthMap.set(ym, { month: ym, label: MONTH_LABELS[Number(ym.slice(5,7))-1], leads: {}, meetings: {} });
    return monthMap.get(ym);
  };
  leadsMonthRows.forEach(r => { const ym = r.__range?.['create_date:month']?.from.slice(0,7); if (ym) ensureMonth(ym).leads[r.sdr_id[1]] = r.__count; });
  meetingsMonthRows.forEach(r => { const ym = r.__range?.['sdr_meeting_start:month']?.from.slice(0,7); if (ym) ensureMonth(ym).meetings[r.sdr_id[1]] = r.__count; });

  const activityMonthMap = new Map();
  activitiesMonthRows.forEach(r => {
    const ym = r.__range?.['date:month']?.from.slice(0,7); if (!ym) return;
    if (!activityMonthMap.has(ym)) activityMonthMap.set(ym, { label: MONTH_LABELS[Number(ym.slice(5,7))-1], month: ym, Douglas: 0, Luanna: 0 });
    const name = r.author_id[1].includes('Douglas') ? 'Douglas' : 'Luanna';
    activityMonthMap.get(ym)[name] += r.__count;
  });

  const typeMap = new Map();
  const normalize = (t: string) => t.toLowerCase().includes('email') ? 'Email' : t.toLowerCase().includes('call') ? 'Call' : t.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'CRM/Outros';
  activitiesTypeRows.forEach(r => {
    const type = normalize(r.activity_type_id[1]);
    if (!typeMap.has(type)) typeMap.set(type, { type, Douglas: 0, Luanna: 0 });
    const name = r.user_id[1].includes('Douglas') ? 'Douglas' : 'Luanna';
    typeMap.get(type)[name] += r.__count;
  });

  return {
    generatedAt: new Date().toISOString(),
    sdrs: Array.from(bySdr.entries()).map(([id, acc]) => ({
      sdrId: id, sdrName: acc.name, totalLeads: acc.total, won: acc.won,
      meetingsScheduled: scheduledBySdr.get(id) || 0, meetingsAttended: attendedBySdr.get(id) || 0,
      funnel: PRE_VENDAS_STAGE_ORDER.filter(s => acc.counts.has(s)).map(s => ({ stage: s, count: acc.counts.get(s) }))
    })).sort((a,b) => b.totalLeads - a.totalLeads),
    monthly: Array.from(monthMap.values()).sort((a,b) => a.month.localeCompare(b.month)),
    activities: { 
      monthly: Array.from(activityMonthMap.values()).sort((a,b) => a.month.localeCompare(b.month)),
      byType: Array.from(typeMap.values())
    }
  };
}
