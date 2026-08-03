'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { Target, Calendar, CheckCircle, Trophy, ArrowLeft, Users, TrendingUp } from 'lucide-react';

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
interface PreVendasReport {
  generatedAt: string;
  source: 'odoo';
  stageOrder: string[];
  sdrs: SdrSummary[];
  monthly: MonthlyPoint[];
  monthlyYear: number;
}

const COLORS = ['#00a69c', '#30b565', '#f5b845', '#ed6b4f', '#2f8af5', '#00b8ad', '#a855f7', '#6366f1', '#f59e0b', '#06b6d4'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

// Primeiro nome, para rótulos mais curtos
function firstName(name: string) { return name.split(' ')[0]; }

export default function PreVendasPage() {
  const [data, setData] = useState<PreVendasReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/pre-vendas', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro HTTP ${res.status}`);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido ao carregar o report.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="loading">
      <div className="spinner" />
      <span>Conectando ao Odoo...</span>
    </div>
  );
  if (error) return (
    <div className="loading">
      <span>⚠️ {error}</span>
    </div>
  );
  if (!data || !data.sdrs?.length) return <div className="loading"><span>Sem dados de pré-vendas no Odoo.</span></div>;

  // Totais consolidados
  const totalLeads = data.sdrs.reduce((s, x) => s + x.totalLeads, 0);
  const totalScheduled = data.sdrs.reduce((s, x) => s + x.meetingsScheduled, 0);
  const totalAttended = data.sdrs.reduce((s, x) => s + x.meetingsAttended, 0);
  const totalWon = data.sdrs.reduce((s, x) => s + x.won, 0);
  const showRate = totalScheduled > 0 ? (totalAttended / totalScheduled) * 100 : 0;

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
            <h1>Layers Education — Funil de Pré-vendas (SDR)</h1>
            <div className="header-sub">
              Funil por SDR · dados ao vivo do Odoo (crm.lead)
            </div>
          </div>
        </div>
        <div className="header-right">
          <Link href="/" className="tab-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Voltar ao Dashboard
          </Link>
          <span className="updated-at">Atualizado: {fmtDate(data.generatedAt)}</span>
        </div>
      </header>

      {/* KPIs consolidados */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': '#00B8AD' } as any}>
          <div className="kpi-icon"><Users color="#00a69c" size={26} /></div>
          <div className="kpi-label">Leads em Pré-vendas</div>
          <div className="kpi-value">{totalLeads.toLocaleString('pt-BR')}</div>
          <div className="kpi-sub">{data.sdrs.length} SDRs ativos</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#f59e0b' } as any}>
          <div className="kpi-icon"><Calendar color="#f5b845" size={26} /></div>
          <div className="kpi-label">Reuniões Agendadas</div>
          <div className="kpi-value">{totalScheduled}</div>
          <div className="kpi-sub">Total (todos os SDRs)</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#30b565' } as any}>
          <div className="kpi-icon"><CheckCircle color="#30b565" size={26} /></div>
          <div className="kpi-label">Reuniões Realizadas</div>
          <div className="kpi-value">{totalAttended}</div>
          <div className="kpi-sub">Show rate: {fmtPct(showRate)}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#ed6b4f' } as any}>
          <div className="kpi-icon"><Trophy color="#ed6b4f" size={26} /></div>
          <div className="kpi-label">Ganhos (Won)</div>
          <div className="kpi-value" style={{ color: '#30b565' }}>{totalWon}</div>
          <div className="kpi-sub">Leads em etapa ganha</div>
        </div>
      </div>

      {/* Placar SDR */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title"><Target size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Placar por SDR</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>SDR</th>
              <th>Leads</th>
              <th>Reuniões Agendadas</th>
              <th>Reuniões Realizadas</th>
              <th>Show Rate</th>
              <th>Ganhos</th>
            </tr>
          </thead>
          <tbody>
            {data.sdrs.map((s) => {
              const sr = s.meetingsScheduled > 0 ? (s.meetingsAttended / s.meetingsScheduled) * 100 : 0;
              return (
                <tr key={s.sdrId}>
                  <td style={{ color: 'var(--text)', fontWeight: 600 }}>{s.sdrName}</td>
                  <td>{s.totalLeads.toLocaleString('pt-BR')}</td>
                  <td><span className="badge badge-yellow">{s.meetingsScheduled}</span></td>
                  <td><span className="badge badge-blue">{s.meetingsAttended}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 5, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${Math.min(sr, 100)}%`, height: '100%', background: sr >= 60 ? '#30b565' : '#f5b845', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{sr.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td><span className="badge badge-green">{s.won}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Funil por SDR (um gráfico por SDR) */}
      <div className="charts-grid">
        {data.sdrs.map((s) => (
          <div className="chart-card" key={s.sdrId}>
            <div className="chart-title">Funil — {firstName(s.sdrName)}</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={s.funnel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fill: 'var(--text-sub)', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} formatter={(v: any) => [v, 'Leads']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {s.funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Comparativo de reuniões por SDR */}
      <div className="chart-card">
        <div className="chart-title">Reuniões: Agendadas vs. Realizadas por SDR</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.sdrs.map((s) => ({ nome: firstName(s.sdrName), Agendadas: s.meetingsScheduled, Realizadas: s.meetingsAttended }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="nome" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} />
            <Legend formatter={(v: any) => <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>{v}</span>} />
            <Bar dataKey="Agendadas" fill="#f5b845" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Realizadas" fill="#30b565" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tendência mensal (2026) — uma linha por SDR */}
      {data.monthly?.length > 0 && (() => {
        const sdrNames = data.sdrs.map((s) => s.sdrName);
        const leadsData = data.monthly.map((m) => ({ label: m.label, ...m.leads }));
        const meetingsData = data.monthly.map((m) => ({ label: m.label, ...m.meetings }));
        return (
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-title">
                <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Leads criados por mês — {data.monthlyYear}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={leadsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} />
                  <Legend formatter={(v: any) => <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>{firstName(v)}</span>} />
                  {sdrNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">
                <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Reuniões agendadas por mês — {data.monthlyYear}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={meetingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', boxShadow: 'var(--shadow-card)' }} />
                  <Legend formatter={(v: any) => <span style={{ color: 'var(--text-sub)', fontSize: 12 }}>{firstName(v)}</span>} />
                  {sdrNames.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
