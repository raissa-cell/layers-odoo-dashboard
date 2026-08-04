import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ODOO_URL = 'https://odoo.layers.digital';
  const ODOO_DB = 'layers-digital-odoo-erp-main-16134201';
  const ODOO_USER = 'raissa.rios@layers.education';
  const ODOO_API_KEY = '751e97cc9d704cb2b4d6697cd78d6425ece08045';

  const results: Record<string, string> = {
    step1_url: ODOO_URL,
    step2_dns: 'pending',
    step3_auth: 'pending',
  };

  try {
    const url = new URL(ODOO_URL);
    results.step2_dns = `OK - connected to ${url.hostname}`;

    const uid = await new Promise<number | null>((resolve, reject) => {
      const client = xmlrpc.createSecureClient({
        host: url.hostname,
        port: 443,
        path: '/xmlrpc/2/common',
      });
      client.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}], (error: any, uid: any) => {
        if (error) return reject(error);
        resolve(uid);
      });
    });

    if (!uid) {
      results.step3_auth = 'DENIED - check DB name or credentials';
      return NextResponse.json(results, { status: 401 });
    }

    results.step3_auth = `SUCCESS - uid: ${uid}`;
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Connection failed', ...results },
      { status: 500 },
    );
  }
}