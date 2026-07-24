'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Target, DollarSign, Trophy, LineChart as LineChartIcon, 
  Briefcase, Telescope, Calendar, School, MessageSquare, Tent 
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

interface DashData {
  kpis: KPIs;
  funil: { nome: string; valor: number; count: number }[];
  pipeline: { name: string; partner_name: string; expected_revenue: number; probability: number; stage_id: [number, string] }[];
  team: { nome: string; valor: number; deals: number }[];
  updatedAt: string;
}

type Tab = 'vendas' | 'prevendas';

const COLORS = ['#00a69c', '#30b565', '#f5b845', '#ed6b4f', '#2f8af5', '#00b8ad'];

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Mock mensal para charts de tendência
const monthlyData = [
  { mes: 'Jan', faturado: 0, pipeline: 160000, reunioes: 3 },
  { mes: 'Fev', faturado: 30563, pipeline: 220000, reunioes: 6 },
  { mes: 'Mar', faturado: 30563, pipeline: 280000, reunioes: 5 },
  { mes: 'Abr', faturado: 30563, pipeline: 320000, reunioes: 4 },
  { mes: 'Mai', faturado: 30563, pipeline: 362748, reunioes: 7 },
];

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vendas');

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      // silently use mock
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Conectando ao Odoo...</span>
    </div>
  );

  if (!data) return <div className="loading"><span>⚠️ Sem dados</span></div>;

  const { kpis, funil, pipeline, team } = data;

  const stageBadge = (stage: string) => {
    if (stage?.toLowerCase().includes('won') || stage?.toLowerCase().includes('ganho')) return 'badge-green';
    if (stage?.toLowerCase().includes('nego')) return 'badge-blue';
    if (stage?.toLowerCase().includes('prop')) return 'badge-yellow';
    return 'badge-blue';
  };

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 8 }}>
            <rect width="40" height="40" rx="10" fill="#00a69c" />
            <path d="M14 12V28H28V24H18.5V12H14Z" fill="white" />
          </svg>
          <div>
            <h1>Layers Education — Report Comercial</h1>
            <div className="header-sub">Acompanhamento comercial via Odoo · Atualização automática diária</div>
          </div>
        </div>
        <div className="header-right">
          <span className="badge-live"><span className="dot-live" />Ao Vivo</span>
          <span className="updated-at">Atualizado: {fmtDate(data.updatedAt)}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs-wrap">
        <button
          className={`tab-btn ${activeTab === 'vendas' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('vendas')}
          id="tab-vendas"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <DollarSign size={16} /> Vendas
        </button>
        <button
          className={`tab-btn ${activeTab === 'prevendas' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('prevendas')}
          id="tab-prevendas"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Target size={16} /> Pré-vendas
        </button>
      </div>

      {/* ─── ABA VENDAS ──────────────────────────────────────────── */}
      {activeTab === 'vendas' && (
        <>
          {/* KPIs Vendas */}
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': '#00B8AD' } as any}>
              <div className="kpi-icon"><Target color="#00a69c" size={26} /></div>
              <div className="kpi-label">Atingimento Meta Q2</div>
              <div className="kpi-value" style={{ color: kpis.atingimento >= 80 ? '#30b565' : kpis.atingimento >= 50 ? '#f5b845' : '#ed6b4f' }}>
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

            <div className="kpi-card" style={{ '--accent': '#009991' } as any}>
              <div className="kpi-icon"><DollarSign color="#00a69c" size={26} /></div>
              <div className="kpi-label">ARR Faturado</div>
              <div className="kpi-value" style={{ color: '#00B8AD' }}>{fmt(kpis.totalFaturado)}</div>
              <div className="kpi-sub">Receita recorrente realizada</div>
            </div>

            <div className="kpi-card" style={{ '--accent': '#F07070' } as any}>
              <div className="kpi-icon"><Trophy color="#ed6b4f" size={26} /></div>
              <div className="kpi-label">Deals Won Q2</div>
              <div className="kpi-value" style={{ color: '#30b565' }}>{kpis.dealsWon}</div>
              <div className="kpi-sub">Meta: 3 deals fechados</div>
            </div>

            <div className="kpi-card" style={{ '--accent': '#0d1f1f' } as any}>
              <div className="kpi-icon"><LineChartIcon color="#434e5b" size={26} /></div>
              <div className="kpi-label">Ticket Médio</div>
              <div className="kpi-value">{fmt(kpis.ticketMedio)}</div>
              <div className="kpi-sub">ARR médio por deal</div>
            </div>
          </div>

          {/* Charts Vendas */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title">Evolução do ARR Faturado</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gradFaturado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [fmt(Number(v)), 'ARR Faturado']} />
                  <Area type="monotone" dataKey="faturado" stroke="#30b565" strokeWidth={2} fill="url(#gradFaturado)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Deals por Stage</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={funil} dataKey="count" nameKey="nome" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {funil.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [v, 'Deals']} />
                  <Legend formatter={(v: any) => <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance por Vendedor */}
          {team.length > 0 && (
            <div className="table-card">
              <div className="table-header">
                <div className="table-title">Performance por Vendedor</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Deals Won</th>
                    <th>ARR Total</th>
                    <th>Ticket Médio</th>
                    <th>vs. Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((t, i) => {
                    const pct = (t.valor / kpis.metaQ2) * 100;
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text)', fontWeight: 600 }}>{t.nome}</td>
                        <td><span className="badge badge-green">{t.deals}</span></td>
                        <td style={{ color: '#30b565', fontWeight: 700 }}>{fmt(t.valor)}</td>
                        <td>{fmt(t.deals > 0 ? t.valor / t.deals : 0)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 5, overflow: 'hidden', minWidth: 60 }}>
                              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: 999 }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── ABA PRÉ-VENDAS ──────────────────────────────────────── */}
      {activeTab === 'prevendas' && (
        <>
          {/* KPIs Pré-vendas */}
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #a855f7, #06b6d4)' } as any}>
              <div className="kpi-icon"><Briefcase color="#00a69c" size={26} /></div>
              <div className="kpi-label">Pipeline Total</div>
              <div className="kpi-value">{fmt(kpis.totalPipeline)}</div>
              <div className="kpi-sub">{kpis.dealsEmNegociacao} oportunidades ativas</div>
            </div>

            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #6366f1, #a855f7)' } as any}>
              <div className="kpi-icon"><Telescope color="#00a69c" size={26} /></div>
              <div className="kpi-label">Pipeline Coverage</div>
              <div className="kpi-value">{fmtPct((kpis.totalPipeline / (kpis.metaQ2 * 10)) * 100)}</div>
              <div className="kpi-sub">do pipeline necessário gerado</div>
            </div>

            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #f59e0b, #6366f1)' } as any}>
              <div className="kpi-icon"><Calendar color="#f5b845" size={26} /></div>
              <div className="kpi-label">Reuniões Realizadas</div>
              <div className="kpi-value">10</div>
              <div className="kpi-sub">Meta Q2: 21 reuniões</div>
            </div>

            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #10b981, #f59e0b)' } as any}>
              <div className="kpi-icon"><School color="#30b565" size={26} /></div>
              <div className="kpi-label">Escolas Prospectadas</div>
              <div className="kpi-value">1.412</div>
              <div className="kpi-sub">Meta Q2: 2.400+ escolas</div>
            </div>

            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #06b6d4, #10b981)' } as any}>
              <div className="kpi-icon"><MessageSquare color="#2f8af5" size={26} /></div>
              <div className="kpi-label">Taxa de Resposta</div>
              <div className="kpi-value">9,2%</div>
              <div className="kpi-sub">~130 escolas responderam</div>
            </div>

            <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #ef4444, #f59e0b)' } as any}>
              <div className="kpi-icon"><Tent color="#ed6b4f" size={26} /></div>
              <div className="kpi-label">Show Rate</div>
              <div className="kpi-value" style={{ color: '#30b565' }}>77%</div>
              <div className="kpi-sub">10 de 13 agendadas</div>
            </div>
          </div>

          {/* Charts Pré-vendas */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title">Evolução do Pipeline</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gradPipeline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a69c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00a69c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [fmt(Number(v)), 'Pipeline']} />
                  <Area type="monotone" dataKey="pipeline" stroke="#00a69c" strokeWidth={2} fill="url(#gradPipeline)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Reuniões por Mês</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [v, 'Reuniões']} />
                  <Bar dataKey="reunioes" fill="#2f8af5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funil pré-vendas */}
          <div className="chart-card" style={{ marginBottom: 24 }}>
            <div className="chart-title">Pipeline por Stage — Valor em Aberto</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funil} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'var(--text-sub)', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [fmt(Number(v)), 'Valor']} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {funil.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline detalhado */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Pipeline Ativo — Oportunidades em Aberto</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Stage</th>
                  <th>Probabilidade</th>
                  <th>ARR Esperado</th>
                  <th>ARR Ponderado</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((p, i) => {
                  const ponderado = (p.expected_revenue * p.probability) / 100;
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{p.partner_name || p.name}</td>
                      <td><span className={`badge ${stageBadge(p.stage_id?.[1])}`}>{p.stage_id?.[1] || '—'}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${p.probability}%`, height: '100%', background: 'var(--primary)', borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{p.probability}%</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text)', fontWeight: 700 }}>{fmt(p.expected_revenue)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{fmt(ponderado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
