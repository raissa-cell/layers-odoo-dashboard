'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

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

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      setError('Erro ao carregar dados. Verifique as credenciais do Odoo.');
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

  if (error || !data) return (
    <div className="loading">
      <span>⚠️ {error || 'Sem dados'}</span>
    </div>
  );

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
          <div className="header-logo">📊</div>
          <div>
            <h1>Layers Education — Dashboard de Metas</h1>
            <div className="header-sub">Acompanhamento comercial via Odoo · Atualização automática diária</div>
          </div>
        </div>
        <div className="header-right">
          <span className="badge-live"><span className="dot-live" />Ao Vivo</span>
          <span className="updated-at">Atualizado: {fmtDate(data.updatedAt)}</span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {/* Atingimento Meta */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #6366f1, #a855f7)' } as React.CSSProperties}>
          <div className="kpi-icon">🎯</div>
          <div className="kpi-label">Atingimento Meta Q2</div>
          <div className="kpi-value" style={{ color: kpis.atingimento >= 80 ? '#10b981' : kpis.atingimento >= 50 ? '#f59e0b' : '#ef4444' }}>
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

        {/* Pipeline Total */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #a855f7, #06b6d4)' } as React.CSSProperties}>
          <div className="kpi-icon">💼</div>
          <div className="kpi-label">Pipeline Total</div>
          <div className="kpi-value">{fmt(kpis.totalPipeline)}</div>
          <div className="kpi-sub">{kpis.dealsEmNegociacao} oportunidades ativas</div>
        </div>

        {/* Ticket Médio */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #10b981, #06b6d4)' } as React.CSSProperties}>
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value">{fmt(kpis.ticketMedio)}</div>
          <div className="kpi-sub">ARR por oportunidade</div>
        </div>

        {/* Deals Won */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #10b981, #6366f1)' } as React.CSSProperties}>
          <div className="kpi-icon">🏆</div>
          <div className="kpi-label">Deals Won Q2</div>
          <div className="kpi-value">{kpis.dealsWon}</div>
          <div className="kpi-sub">Meta: 3 deals</div>
        </div>

        {/* Faturado */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #f59e0b, #ef4444)' } as React.CSSProperties}>
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Faturado</div>
          <div className="kpi-value">{fmt(kpis.totalFaturado)}</div>
          <div className="kpi-sub">ARR realizado</div>
        </div>

        {/* Coverage */}
        <div className="kpi-card" style={{ '--accent': 'linear-gradient(90deg, #06b6d4, #6366f1)' } as React.CSSProperties}>
          <div className="kpi-icon">🔭</div>
          <div className="kpi-label">Pipeline Coverage</div>
          <div className="kpi-value">{fmtPct((kpis.totalPipeline / (kpis.metaQ2 * 10)) * 100)}</div>
          <div className="kpi-sub">do necessário gerado</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Funil por Stage */}
        <div className="chart-card">
          <div className="chart-title">Funil por Stage</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={funil} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="nome" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v: any) => [fmt(Number(v)), 'Valor']}
              />
              <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição Pipeline */}
        <div className="chart-card">
          <div className="chart-title">Distribuição do Pipeline</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={funil} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {funil.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9' }}
                formatter={(v: any) => [fmt(Number(v)), 'Valor']}
              />
              <Legend formatter={(v: any) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
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
              </tr>
            </thead>
            <tbody>
              {team.map((t, i) => (
                <tr key={i}>
                  <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.nome}</td>
                  <td><span className="badge badge-green">{t.deals}</span></td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{fmt(t.valor)}</td>
                  <td>{fmt(t.deals > 0 ? t.valor / t.deals : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pipeline Detalhado */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Pipeline Ativo — Top Oportunidades</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Escola</th>
              <th>Stage</th>
              <th>Probabilidade</th>
              <th>ARR Esperado</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((p, i) => (
              <tr key={i}>
                <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{p.partner_name || p.name}</td>
                <td><span className={`badge ${stageBadge(p.stage_id?.[1])}`}>{p.stage_id?.[1] || '—'}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${p.probability}%`, height: '100%', background: '#6366f1', borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.probability}%</span>
                  </div>
                </td>
                <td style={{ color: '#f1f5f9', fontWeight: 700 }}>{fmt(p.expected_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
