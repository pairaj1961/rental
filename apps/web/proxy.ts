import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, type UserRole } from './lib/auth';

// ── Role → allowed route prefixes ─────────────────────────────────────────────
const ADMIN_ROUTES    = ['*'];
const PRODUCTION_ROUTES = ['/dashboard', '/equipment', '/maintenance', '/delivery'];
const MANAGER_ROUTES  = ['/dashboard', '/rentals', '/contracts', '/customers', '/equipment', '/reports'];
const REP_ROUTES      = ['/dashboard', '/rentals', '/contracts', '/customers'];

const ROLE_ROUTES: Partial<Record<UserRole, string[]>> = {
  SYSTEM_ADMIN: ADMIN_ROUTES, ADMIN: ADMIN_ROUTES,
  PRODUCTION_MANAGER: PRODUCTION_ROUTES, PRODUCT_MANAGER: PRODUCTION_ROUTES,
  SALES_MANAGER: MANAGER_ROUTES, MANAGER: MANAGER_ROUTES,
  SALES_REP: REP_ROUTES, REP: REP_ROUTES,
};

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'),
  );
}

function canAccess(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_ROUTES[role] ?? [];
  if (allowed.includes('*')) return true;
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow public paths and Next.js internals
  if (isPublic(pathname) || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const isProtected =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/equipment') ||
    pathname.startsWith('/rentals') ||
    pathname.startsWith('/contracts') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/audit-logs') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/delivery');

  if (!isProtected) return NextResponse.next();

  // Extract token from cookie (auth-token) or Authorization header
  const cookieToken = request.cookies.get('auth-token')?.value;
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken ?? headerToken ?? null;

  if (!token) return redirectOrUnauthorized(request, pathname);

  const user = await verifyToken(token);
  if (!user) return redirectOrUnauthorized(request, pathname);

  // Role-based route guard — applies to UI pages only.
  // API routes (/api/*) handle their own authorization downstream.
  if (!pathname.startsWith('/api/') && !canAccess(user.role as UserRole, pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Forward user info as headers so API routes can read without re-verifying
  const res = NextResponse.next();
  res.headers.set('x-user-id', user.userId);
  res.headers.set('x-user-role', user.role);
  res.headers.set('x-user-email', user.email);
  return res;
}

function redirectOrUnauthorized(request: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete('auth-token');
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$).*)',
  ],
};
