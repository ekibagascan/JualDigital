import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes (critical for webhooks like Xendit)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Skip middleware for login page to prevent redirect loops
  if (pathname === '/login' || pathname === '/register' || pathname === '/auth/callback' || pathname === '/mulai-jualan') {
    return NextResponse.next();
  }
  
  // 🔒 ADMIN ROUTE PROTECTION

  // Check if accessing admin routes (excluding login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Check for admin authentication cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;

    if (!adminAuth) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Verify admin session
    try {
      if (adminAuth !== 'authenticated') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 🔐 USER AUTHENTICATION FOR PROTECTED ROUTES
  const { pathname: userPathname } = request.nextUrl;

  // Protected user routes that require authentication
  const protectedUserRoutes = [
    '/dashboard',
    '/profile',
    '/purchases',
    '/wishlist',
    '/seller',
    '/seller/',
  ];

  // Cart and checkout should be accessible even without full auth
  // but we'll check for basic session
  const cartRoutes = ['/cart'];
  const isCartRoute = cartRoutes.some(route => userPathname.startsWith(route));

  const isProtectedUserRoute = protectedUserRoutes.some(route => 
    userPathname.startsWith(route)
  );

  if (isProtectedUserRoute) {
    // Check for any Supabase authentication cookies
    const anySupabaseCookie = request.cookies.getAll().some(cookie => 
      cookie.name.startsWith('sb-') && cookie.value
    );

    // If any Supabase cookie exists, allow access
    if (anySupabaseCookie) {
      return NextResponse.next();
    }

    // Only redirect if no authentication cookies found
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(userPathname)}`, request.url));
  }

  // For cart routes, be more lenient - allow access if there are any session cookies
  if (isCartRoute) {
    // Allow access to cart even without full authentication
    // The cart component will handle showing appropriate UI
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 