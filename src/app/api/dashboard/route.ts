import { NextResponse } from 'next/server';
import { getSalesPipeline, getInvoices, getSalesTargets, getTeamPerformance } from '@/lib/odoo';

export const revalidate = 3600; // cache 1 hora

export async function GET() {
  try {
    const [pipeline, invoices, salesOrders, teamData] = await Promise.allSettled([
      getSalesPipeline(),
      getInvoices(),
      getSalesTargets(),
      getTeamPerformance(),
    ]);

    const pipelineData = pipeline.status === 'fulfilled' ? pipeline.value : [];
    const invoicesData = invoices.status === 'fulfilled' ? invoices.value : [];
    const salesData = salesOrders.status === 'fulfilled' ? salesOrders.value : [];
    const teamPerf = teamData.status === 'fulfilled' ? teamData.value : [];

    // Calcular KPIs
    const totalPipeline = pipelineData.reduce((sum: number, o: { expected_revenue: number }) => sum + (o.expected_revenue || 0), 0);
    const totalFaturado = invoicesData
      .filter((i: { payment_state: string }) => i.payment_state === 'paid')
      .reduce((sum: number, i: { amount_total: number }) => sum + (i.amount_total || 0), 0);
    const totalVendas = salesData.reduce((sum: number, s: { amount_total: number }) => sum + (s.amount_total || 0), 0);

    // Meta Q2
    const META_Q2 = 101594;
    const atingimento = totalFaturado > 0 ? (totalFaturado / META_Q2) * 100 : (totalVendas / META_Q2) * 100;

    // Funil por stage
    const stageMap: Record<string, { nome: string; valor: number; count: number }> = {};
    pipelineData.forEach((o: { stage_id: [number, string]; expected_revenue: number }) => {
      const stage = o.stage_id?.[1] || 'Sem Stage';
      if (!stageMap[stage]) stageMap[stage] = { nome: stage, valor: 0, count: 0 };
      stageMap[stage].valor += o.expected_revenue || 0;
      stageMap[stage].count += 1;
    });

    // Performance por vendedor
    const teamMap: Record<string, { nome: string; valor: number; deals: number }> = {};
    teamPerf.forEach((o: { user_id: [number, string]; expected_revenue: number }) => {
      const user = o.user_id?.[1] || 'Sem Atribuição';
      if (!teamMap[user]) teamMap[user] = { nome: user, valor: 0, deals: 0 };
      teamMap[user].valor += o.expected_revenue || 0;
      teamMap[user].deals += 1;
    });

    return NextResponse.json({
      kpis: {
        totalPipeline,
        totalFaturado: totalFaturado || totalVendas,
        metaQ2: META_Q2,
        atingimento: Math.min(atingimento, 100),
        dealsWon: salesData.length,
        dealsEmNegociacao: pipelineData.length,
        ticketMedio: pipelineData.length > 0 ? totalPipeline / pipelineData.length : 0,
      },
      funil: Object.values(stageMap),
      pipeline: pipelineData.slice(0, 10),
      team: Object.values(teamMap),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}
