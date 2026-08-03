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
  TrendingUp, Users, ArrowUpRight, Clock, PieChart as PieChartIcon,
  ShieldCheck, Zap, BookOpen, AlertCircle, FileText
} from 'lucide-react';

type Tab = 'vendas' | 'prevendas' | 'comissoes' | 'enablement';

const COLORS = ['#00a69c', '#30b565', '#f5b845', '#ed6b4f', '#2f8af5', '#00b8ad', '#a855f7', '#6366f1'];

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) { return `${(n || 0).toFixed(1)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function firstName(name: string) { return name?.split(' ')[0] || ''; }

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vendas');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const [v, p] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/pre-vendas', { cache: 'no-store' })
      ]);
      if (!v.ok || !p.ok) throw new Error('Falha na conexão com Odoo');
      const vJ = await v.json();
      const pJ = await p.json();
      setData({ ...vJ, prevendas: pJ });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading"><div className="spinner" /><span className="brand-font">Sincronizando Inteligência...</span></div>;
  if (error) return <div className="loading"><span>⚠️ {error}</span><button onClick={load} className="tab-btn">Tentar novamente</button></div>;

  const { kpis, funil, channels, pipeline, team, prevendas } = data;

  const stageBadge = (stage: string) => {
    const s = stage?.toLowerCase() || '';
    if (s.includes('won') || s.includes('ganho') || s.includes('confirmado')) return 'badge-green';
    return 'badge-soft';
  };

  return (
    <div className="shell">
      {/* Header Premium */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">L</div>
          <div>
            <h1 className="brand-font" style={{ fontSize: '1.5rem', color: '#1e293b' }}>Commercial Performance</h1>
            <div className="header-sub">Layers Education · Odoo BI v2.0</div>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span className="badge-live"><span className="dot-live" />Live Pipeline</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>{fmtDate(data.updatedAt)}</span>
        </div>
      </header>

      {/* Tabs Layout */}
      <div className="tabs-wrap">
        {['vendas', 'prevendas', 'comissoes', 'enablement'].map((t) => (
          <button 
            key={t}
            className={`tab-btn ${activeTab === t ? 'tab-active' : ''}`} 
            onClick={() => setActiveTab(t as Tab)}
          >
            {t === 'vendas' && <DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />}
            {t === 'prevendas' && <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />}
            {t === 'comissoes' && <Trophy size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />}
            {t === 'enablement' && <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 8 }} />}
            {t.charAt(0).toUpperCase() + t.slice(1).replace('prevendas', 'Pré-vendas').replace('comissoes', 'Metas')}
          </button>
        ))}
      </div>

      {/* ─── ABA VENDAS ──────────────────────────────────────────── */}
      {activeTab === 'vendas' && (
        <>
          <div className="kpi-grid">
            <div className="card" style={{ padding: '24px' }}>
              <div className="kpi-label">Meta Q3 Atingimento</div>
              <div className="kpi-value" style={{ color: '#00a69c' }}>{fmtPct(kpis.atingimento)}</div>
              <div className="prob-wrap" style={{ marginTop: 12, maxWidth: '100%' }}>
                <div className="prob-bg"><div className="prob-fill" style={{ width: `${Math.min(kpis.atingimento, 100)}%` }} /></div>
              </div>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div className="kpi-label">ARR Faturado (2026)</div>
              <div className="kpi-value">{fmt(kpis.totalFaturado)}</div>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div className="kpi-label">Deals Won</div>
              <div className="kpi-value">{kpis.dealsWon}</div>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div className="kpi-label">Ticket Médio (ARR)</div>
              <div className="kpi-value">{fmt(kpis.ticketMedio)}</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="section-title">Pipeline por Stage — Valor em Aberto</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funil} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" width={100} axisLine={false} tickLine={false} style={{ fontSize: 11, fontWeight: 700, color: '#475569' }} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={24}>
                    {funil.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="section-title">Top Canais de Ativação</div>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Canal (UTM)</th><th>Leads</th><th>Pipeline Gerado</th></tr>
                </thead>
                <tbody>
                  {channels.slice(0, 5).map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{c.nome}</td>
                      <td><span className="badge" style={{ background: '#F1F5F9', color: '#475569', minWidth: 28, textAlign: 'center' }}>{c.leads}</span></td>
                      <td className="val-primary">{fmt(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="section-title">Pipeline Ativo — Oportunidades em Aberto</div>
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr><th>Escola</th><th>Stage</th><th>Probabilidade</th><th>ARR Esperado</th><th>ARR Ponderado</th></tr>
              </thead>
              <tbody>
                {pipeline.slice(0, 15).map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 800 }}>{p.partner_name || p.name}</td>
                    <td><span className={`badge ${stageBadge(p.stage_id?.[1])}`}>{p.stage_id?.[1]}</span></td>
                    <td>
                      <div className="prob-wrap">
                        <div className="prob-bg"><div className="prob-fill" style={{ width: `${p.probability}%` }} /></div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 30 }}>{p.probability}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(p.expected_revenue)}</td>
                    <td className="val-primary">{fmt(p.expected_revenue * p.probability / 100)}</td>
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
            <div className="card" style={{ padding: '24px' }}><div className="kpi-label">Leads em Prospecção</div><div className="kpi-value">{prevendas.sdrs.reduce((s:any,x:any)=>s+x.totalLeads,0).toLocaleString('pt-BR')}</div></div>
            <div className="card" style={{ padding: '24px' }}><div className="kpi-label">Reuniões Agendadas</div><div className="kpi-value">{prevendas.sdrs.reduce((s:any,x:any)=>s+x.meetingsScheduled,0)}</div></div>
            <div className="card" style={{ padding: '24px' }}><div className="kpi-label">Show Rate</div><div className="kpi-value" style={{ color: '#00a69c' }}>{fmtPct((prevendas.sdrs.reduce((s:any,x:any)=>s+x.meetingsAttended,0)/prevendas.sdrs.reduce((s:any,x:any)=>s+x.meetingsScheduled,0))*100)}</div></div>
            <div className="card" style={{ padding: '24px' }}><div className="kpi-label">Passagem p/ Closer</div><div className="kpi-value">{prevendas.sdrs.reduce((s:any,x:any)=>s+x.won,0)}</div></div>
          </div>

          <div className="card">
            <div className="section-title">Esforço Operacional: Atividades Mês a Mês</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prevendas.activities.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} style={{fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} style={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Douglas" stackId="a" fill="#00a69c" radius={[0,0,0,0]} barSize={40} />
                <Bar dataKey="Luanna" stackId="a" fill="#1d2d35" radius={[6,6,0,0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="section-title">Distribuição por Canal</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prevendas.activities.byType} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="type" width={100} axisLine={false} tickLine={false} style={{fontSize: 11, fontWeight: 700}}/>
                  <Tooltip />
                  <Bar dataKey="Douglas" stackId="a" fill="#00a69c" barSize={18} />
                  <Bar dataKey="Luanna" stackId="a" fill="#1d2d35" radius={[0,4,4,0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="section-title">Tendência de Novos Leads</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={prevendas.monthly}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a69c" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00a69c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} style={{fontSize:12}} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey={(m:any)=>Object.values(m.leads).reduce((s:any,v:any)=>s+v,0)} name="Total Leads" stroke="#00a69c" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ─── ABA METAS ───────────────────────────────────────────── */}
      {activeTab === 'comissoes' && (
        <div className="card">
          <div className="section-title">Atingimento de Metas e Forecast</div>
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Membro do Time</th><th>Faturado Real</th><th>Atingimento</th><th>Comissão Est.</th><th>Forecast</th></tr>
            </thead>
            <tbody>
              {team.map((t:any, i:number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 800 }}>{t.nome}</td>
                  <td className="val-primary">{fmt(t.valor)}</td>
                  <td>
                    <div className="prob-wrap">
                      <div className="prob-bg"><div className="prob-fill" style={{ width: `${Math.min((t.valor/80000)*100, 100)}%`, background: '#30b565' }} /></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{Math.round((t.valor/80000)*100)}%</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(t.valor * 0.02)}</td>
                  <td style={{ color: '#94a3b8' }}>{fmt(t.valor * 1.2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ABA ENABLEMENT ──────────────────────────────────────── */}
      {activeTab === 'enablement' && (
        <div className="charts-grid">
          <div className="card">
            <div className="section-title">Playbooks & Assets</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { title: 'Manual da Marca Layers v2', sub: 'Identidade e tom de voz', icon: <FileText size={18} /> },
                { title: 'Script de Abordagem SDR', sub: 'Atualizado em Julho/2026', icon: <MessageSquare size={18} /> },
                { title: 'Guia de Contorno de Objeções', sub: 'Táticas de negociação', icon: <ShieldCheck size={18} /> }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 8, border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <div style={{ color: '#00a69c' }}>{item.icon}</div>
                  <div><div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.title}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-title">CRM Health Check</div>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Índice de Higiene</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#00a69c' }}>88%</div>
              <div className="badge badge-green" style={{ marginTop: 12 }}>+4% vs mês anterior</div>
            </div>
            <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Deals sem atividade</span>
                <span className="badge badge-soft">12 deals</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Campos obrigatórios vazios</span>
                <span className="badge badge-soft">5% leads</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
