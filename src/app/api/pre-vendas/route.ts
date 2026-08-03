import { NextResponse } from 'next/server';
import { getPreVendasReport } from '@/lib/odoo';

// Report de pré-vendas por SDR. SOMENTE LEITURA do Odoo.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await getPreVendasReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error('API pre-vendas Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pré-vendas report from Odoo' },
      { status: 500 },
    );
  }
}
