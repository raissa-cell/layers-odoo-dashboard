'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Target, DollarSign, Trophy, LineChart as LineChartIcon, 
  Briefcase, Telescope, Calendar, School, MessageSquare, Tent, 
  TrendingUp, Users, ArrowUpRight, Clock, PieChart as PieChartIcon
} from 'lucide-react';

interface KPIs {
  totalPipeline: number;
  totalFaturado: number;
  metaQ2: number;
  atingimento: number;
  dealsWon: number;
  dealsEmNegociacao: number;
  ticketMedio: number;
}

interface SdrFunnelStage { stage: string; count: number }
interface SdrSummary {
  sdrId: number;
  sdrName: string;
  totalLeads: number;
  funnel: SdrFunnelStage[];
  meetingsScheduled: number;
  meetingsAttended: number;
  won: number;
}
interface MonthlyPoint {
  month: string;
  label: string;
  leads: Record<string, number>;
  meetings: Record<string, number>;
}

interface DashData {
  kpis: KPIs;
  funil: { nome: string; valor: number; count: number }[];
  channels: { nome: string; leads: number; value: number }[];
  pipeline: { name: string; partner_name: string; expected_revenue: number; probability: number; stage_id: [number, string] }[];
  team: { nome: string; valor: number; deals: number }[];
  prevendas?: {
    generatedAt: string;
    sdrs: SdrSummary[];
    monthly: MonthlyPoint[];
    monthlyYear: number;
  };
  updatedAt: string;
}

type Tab = 'vendas' | 'prevendas';

const COLORS = ['#00a69c', '#30b565', '#f5b845', '#ed6b4f', '#2f8af5', '#00b8ad', '#a855f7', '#6366f1'];

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function firstName(name: string) { return name.split(' ')[0]; }

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vendas');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      
      // Busca dados de Vendas e Pré-vendas em paralelo
      const [vendasRes, prevendasRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/pre-vendas', { cache: 'no-store' })
      ]);

      if (!vendasRes.ok) throw new Error('Falha ao carregar dados de vendas');
      
      const vendasJson = await vendasRes.json();
      const prevendasJson = prevendasRes.ok ? await prevendasRes.json() : null;

      setData({
        ...vendasJson,
        prevendas: prevendasJson
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span className="brand-font">Sincronizando com Layers Odoo...</span>
    </div>
  );

  if (error) return (
    <div className="loading">
      <span style={{ color: 'var(--danger)' }}>⚠️ {error}</span>
      <button onClick={load} className="tab-btn" style={{ marginTop: 16, background: 'var(--surface-2)' }}>Tentar novamente</button>
    </div>
  );

  if (!data) return <div className="loading"><span>⚠️ Sem dados disponíveis</span></div>;

  const { kpis, funil, channels, pipeline, team, prevendas } = data;

  const stageBadge = (stage: string) => {
    const s = stage?.toLowerCase() || '';
    if (s.includes('won') || s.includes('ganho') || s.includes('confirmado')) return 'badge-green';
    if (s.includes('nego') || s.includes('prop')) return 'badge-yellow';
    return 'badge-blue';
  };

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">L</div>
          <div>
            <h1>Layers Education — Report Comercial</h1>
            <div className="header-sub">Inteligência Comercial em tempo real via Odoo ERP</div>
          </div>
        </div>
        <div className="header-right">
          <span className="badge-live"><span className="dot-live" />Live Data</span>
          <span className="updated-at">Refresco: {fmtDate(data.updatedAt)}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs-wrap">
        <button
          className={`tab-btn ${activeTab === 'vendas' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('vendas')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} /> Vendas (Closer)
          </div>
        </button>
        <button
          className={`tab-btn ${activeTab === 'prevendas' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('prevendas')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Pré-vendas (SDR)
          </div>
        </button>
      </div>

      {/* ─── ABA VENDAS ──────────────────────────────────────────── */}
      {activeTab === 'vendas' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><Target size={20} /></div>
              <div className="kpi-label">Meta Q3 (Atingimento)</div>
              <div className="kpi-value" style={{ color: kpis.atingimento >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                {fmtPct(kpis.atingimento)}
              </div>
              <div className="progress-wrap">
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(kpis.atingimento, 100)}%` }} />
                </div>
                <div className="progress-labels">
                  <span>{fmt(kpis.totalFaturado)}</span>
                  <span>Meta: {fmt(kpis.metaQ2)}</span>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><TrendingUp size={20} /></div>
              <div className="kpi-label">ARR Faturado (2026)</div>
              <div className="kpi-value">{fmt(kpis.totalFaturado)}</div>
              <div className="kpi-sub">Receita recorrente acumulada no ano</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><Trophy size={20} /></div>
              <div className="kpi-label">Deals Won</div>
              <div className="kpi-value">{kpis.dealsWon}</div>
              <div className="kpi-sub">Oportunidades fechadas no período</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><LineChartIcon size={20} /></div>
              <div className="kpi-label">Ticket Médio (ARR)</div>
              <div className="kpi-value">{fmt(kpis.ticketMedio)}</div>
              <div className="kpi-sub">Valor médio por novo contrato</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title"><Briefcase size={16} /> Volume por Etapa (Valor)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funil} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} width={120} style={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip formatter={(v: any) => fmt(v)} cursor={{ fill: 'var(--bg)' }} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {funil.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3 className="chart-title"><PieChartIcon size={16} /> Canais de Ativação</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={channels} dataKey="value" nameKey="nome" cx="50%" cy="50%" outerRadius={80} innerRadius={60} paddingAngle={5}>
                    {channels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-card">
            <h3 className="table-title"><Clock size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Pipeline Ativo — Closer Visibility</h3>
            <table>
              <thead>
                <tr>
                  <th>Parceiro / Escola</th>
                  <th>Etapa Atual</th>
                  <th>Probabilidade</th>
                  <th>ARR Estimado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.slice(0, 10).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{p.partner_name || p.name}</td>
                    <td><span className={`badge ${stageBadge(p.stage_id?.[1])}`}>{p.stage_id?.[1]}</span></td>
                    <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, background: '#f1f5f9', height: 6, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${p.probability}%`, background: 'var(--primary)', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: 11, width: 30 }}>{p.probability}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 800 }}>{fmt(p.expected_revenue)}</td>
                    <td><ArrowUpRight size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── ABA PRÉ-VENDAS ──────────────────────────────────────── */}
      {activeTab === 'prevendas' && prevendas && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><Users size={20} /></div>
              <div className="kpi-label">Leads em Prospecção</div>
              <div className="kpi-value">{prevendas.sdrs.reduce((s, x) => s + x.totalLeads, 0).toLocaleString('pt-BR')}</div>
              <div className="kpi-sub">{prevendas.sdrs.length} SDRs ativos em 2026</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><Calendar size={20} /></div>
              <div className="kpi-label">Agendamentos</div>
              <div className="kpi-value">{prevendas.sdrs.reduce((s, x) => s + x.meetingsScheduled, 0)}</div>
              <div className="kpi-sub">Total de reuniões marcadas</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><MessageSquare size={20} /></div>
              <div className="kpi-label">Reuniões Realizadas</div>
              <div className="kpi-value">{prevendas.sdrs.reduce((s, x) => s + x.meetingsAttended, 0)}</div>
              <div className="kpi-sub">Taxa de comparência: {fmtPct((prevendas.sdrs.reduce((s, x) => s + x.meetingsAttended, 0) / prevendas.sdrs.reduce((s, x) => s + x.meetingsScheduled, 0)) * 100)}</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon"><ArrowUpRight size={20} /></div>
              <div className="kpi-label">Passagem p/ Closer</div>
              <div className="kpi-value">{prevendas.sdrs.reduce((s, x) => s + x.won, 0)}</div>
              <div className="kpi-sub">Leads qualificados e avançados</div>
            </div>
          </div>

          <div className="table-card">
            <h3 className="table-title">Performance Mensal por SDR (Leads Criados)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={prevendas.monthly}>
                <defs>
                  {prevendas.sdrs.map((s, i) => (
                    <linearGradient key={s.sdrId} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} style={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: 12 }} />
                <Tooltip cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} />
                <Legend />
                {prevendas.sdrs.map((s, i) => (
                  <Area 
                    key={s.sdrId} 
                    type="monotone" 
                    dataKey={(m: any) => m.leads[s.sdrName] || 0} 
                    name={firstName(s.sdrName)} 
                    stroke={COLORS[i % COLORS.length]} 
                    fill={`url(#grad${i})`} 
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-grid">
            {prevendas.sdrs.map((s, i) => (
              <div className="chart-card" key={s.sdrId}>
                <h3 className="chart-title">Funil — {firstName(s.sdrName)}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={s.funnel} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="stage" width={100} style={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--bg)' }} />
                    <Bar dataKey="count" fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </>
      )}
      
      {!prevendas && activeTab === 'prevendas' && (
        <div className="loading"><span>SDR Report indisponível no momento.</span></div>
      )}
    </div>
  );
}
