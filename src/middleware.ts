import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = process.env.DASHBOARD_PASSWORD || 'layers2026';
const COOKIE = 'layers_auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Libera a API e a própria rota de login
  if (pathname.startsWith('/api') || pathname === '/login') {
    return NextResponse.next();
  }

  // Verifica cookie de autenticação
  const auth = req.cookies.get(COOKIE)?.value;
  if (auth === PASSWORD) return NextResponse.next();

  // Redireciona para login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manual-marca.pdf).*)'],
};
