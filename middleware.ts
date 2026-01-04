import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware for authentication and route protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookie
  const token = request.cookies.get('auth-token')?.value;

  // Protected routes that require authentication
  const protectedPaths = ['/studio', '/projects', '/settings', '/teams'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Auth routes (login, signup)
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to studio if already logged in and accessing auth pages
  if (isAuthPath && token) {
    const url = request.nextUrl.clone();
    url.pathname = '/studio';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
