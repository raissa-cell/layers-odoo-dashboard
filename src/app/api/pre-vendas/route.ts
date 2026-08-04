import { NextRequest, NextResponse } from 'next/server';
import { getPreVendasReport } from '@/lib/odoo';

// Report de pré-vendas por SDR. SOMENTE LEITURA do Odoo.
export const dynamic = 'force-dynamic';

// Mesmo esquema de auth do resto do app (cookie definido em /api/auth).
// O middleware libera /api/*, então protegemos a rota aqui explicitamente,
// já que ela expõe dado comercial (leads/SDR/ganhos).
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'layers2026';
const COOKIE = 'layers_auth';

export async function GET(req: NextRequest) {
  if (req.cookies.get(COOKIE)?.value !== PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await getPreVendasReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error('API pre-vendas Error:', error);
    // NUNCA retorna dados fake: em falha do Odoo devolve 500 e a UI mostra erro.
    return NextResponse.json(
      { error: 'Falha ao conectar no Odoo. Verifique as credenciais/conexão.' },
      { status: 500 },
    );
  }
}

