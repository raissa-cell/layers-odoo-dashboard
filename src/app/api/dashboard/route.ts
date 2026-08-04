import { NextResponse } from 'next/server';
import { getSalesPipeline, getTeamPerformance, getInvoices } from '@/lib/odoo';

export async function GET() {
  try {
    const pipelineData = await getSalesPipeline();
    const salesData = await getInvoices();
    const teamData = await getTeamPerformance();

    const totalPipeline = pipelineData.reduce((sum: number, o: any) => sum + (o.expected_revenue || 0), 0);
    const totalFaturado = salesData.reduce((sum: number, s: any) => sum + (s.amount_total || 0), 0);
    const META_Q2 = 101594;
    const atingimento = (totalFaturado / META_Q2) * 100;

    // Build funil
    const funilMap: Record<string, { valor: number, count: number }> = {};
    pipelineData.forEach((lead: any) => {
      const stageName = lead.stage_id?.[1] || 'Novo';
      if (!funilMap[stageName]) funilMap[stageName] = { valor: 0, count: 0 };
      funilMap[stageName].valor += (lead.expected_revenue || 0);
      funilMap[stageName].count += 1;
    });

    const funil = Object.entries(funilMap).map(([nome, stats]) => ({
      nome,
      valor: stats.valor,
      count: stats.count
    }));

    // Build channels
    const channelsMap: Record<string, { leads: number, value: number }> = {};
    pipelineData.forEach((lead: any) => {
      const channel = lead.medium_id?.[1] || lead.source_id?.[1] || 'Desconhecido';
      if (!channelsMap[channel]) channelsMap[channel] = { leads: 0, value: 0 };
      channelsMap[channel].leads += 1;
      channelsMap[channel].value += (lead.expected_revenue || 0);
    });

    const channels = Object.entries(channelsMap).map(([nome, stats]) => ({
      nome,
      leads: stats.leads,
      value: stats.value
    })).sort((a, b) => b.value - a.value);

    // Build team
    const teamMap: Record<string, { valor: number, deals: number }> = {};
    
    // Team active pipeline
    pipelineData.forEach((lead: any) => {
      const rep = lead.user_id?.[1] || 'Unassigned';
      if (!teamMap[rep]) teamMap[rep] = { valor: 0, deals: 0 };
      teamMap[rep].valor += (lead.expected_revenue || 0);
    });

    // We can also mix won deals if needed, but keeping it simple for the active pipeline or general won performance
    teamData.forEach((won: any) => {
      const rep = won.user_id?.[1] || 'Unassigned';
      if (!teamMap[rep]) teamMap[rep] = { valor: 0, deals: 0 };
      teamMap[rep].deals += 1;
      // if we want to add won value to the total:
      // teamMap[rep].valor += won.expected_revenue;
    });

    const team = Object.entries(teamMap).map(([nome, stats]) => ({
      nome,
      valor: stats.valor,
      deals: stats.deals
    }));

    return NextResponse.json({
      kpis: {
        totalPipeline,
        totalFaturado,
        metaQ2: META_Q2,
        atingimento,
        dealsWon: salesData.length,
        dealsEmNegociacao: pipelineData.length,
        ticketMedio: salesData.length > 0 ? totalFaturado / salesData.length : 0,
      },
      funil,
      channels,
      pipeline: pipelineData,
      team,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Falha na conexão com Odoo', 
      details: error.message || 'Erro desconhecido',
      hint: 'Verifique se ODOO_API_KEY e ODOO_DB estão corretos na Vercel.'
    }, { status: 500 });
  }
}
