import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Dados Mockados para teste de layout
  const pipelineData = [
    { id: 1, name: 'Escola Modelo SP', expected_revenue: 45000, stage_id: [3, 'Em Negociação'], user_id: [1, 'Raissa'] },
    { id: 2, name: 'Colégio Estadual RJ', expected_revenue: 28000, stage_id: [2, 'Qualificado'], user_id: [2, 'Prianti'] },
    { id: 3, name: 'Instituto Saber', expected_revenue: 65000, stage_id: [4, 'Proposta Enviada'], user_id: [1, 'Raissa'] },
    { id: 4, name: 'Escola Nova Geração', expected_revenue: 15000, stage_id: [1, 'Novo'], user_id: [2, 'Prianti'] },
  ];

  const salesData = [
    { id: 10, amount_total: 35000, name: 'Venda - Colégio Alfa' },
    { id: 11, amount_total: 12500, name: 'Venda - Escola Beta' },
  ];

  // Calcular KPIs Fakes
  const totalPipeline = pipelineData.reduce((sum, o) => sum + o.expected_revenue, 0);
  const totalFaturado = salesData.reduce((sum, s) => sum + s.amount_total, 0);
  const META_Q2 = 101594;
  const atingimento = (totalFaturado / META_Q2) * 100;

  const funil = [
    { nome: 'Novo', valor: 15000, count: 1 },
    { nome: 'Qualificado', valor: 28000, count: 1 },
    { nome: 'Em Negociação', valor: 45000, count: 1 },
    { nome: 'Proposta Enviada', valor: 65000, count: 1 },
  ];

  const team = [
    { nome: 'Raissa', valor: 110000, deals: 2 },
    { nome: 'Prianti', valor: 43000, deals: 2 },
  ];

  return NextResponse.json({
    kpis: {
      totalPipeline,
      totalFaturado,
      metaQ2: META_Q2,
      atingimento,
      dealsWon: salesData.length,
      dealsEmNegociacao: pipelineData.length,
      ticketMedio: totalPipeline / pipelineData.length,
    },
    funil,
    pipeline: pipelineData,
    team,
    updatedAt: new Date().toISOString(),
  });
}
