import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ODOO_URL = 'https://odoo.layers.digital';
  const ODOO_DB = 'layers-digital-odoo-erp-main-16134201';
  const ODOO_USER = 'raissa.rios@layers.education';
  const ODOO_API_KEY = '751e97cc9d704cb2b4d6697cd78d6425ece08045';

  const results: any = {
    step1_url: ODOO_URL,
    step2_dns: 'pending',
    step3_auth: 'pending',
    error: null
  };

  try {
    // Teste DNS/Conexão Básica
    const url = new URL(ODOO_URL);
    const client = xmlrpc.createSecureClient({
      host: url.hostname,
      port: 443,
      path: '/xmlrpc/2/common'
    });

    results.step2_dns = 'OK - connected to ' + url.hostname;

    return new Promise((resolve) => {
      client.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}], (error: any, uid: any) => {
        if (error) {
          results.step3_auth = 'FAILED';
          results.error = error;
          resolve(NextResponse.json(results, { status: 500 }));
        } else if (!uid) {
          results.step3_auth = 'DENIED - check DB name or credentials';
          resolve(NextResponse.json(results, { status: 401 }));
        } else {
          results.step3_auth = 'SUCCESS - uid: ' + uid;
          resolve(NextResponse.json(results));
        }
      });
    });
  } catch (err: any) {
    return NextResponse.json({ fatal: err.message }, { status: 500 });
  }
}
