import { type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // Debug: Log all cookies received
  console.log('[MIDDLEWARE] Cookies:', request.cookies.getAll());
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  // Debug: Log user and error
  console.log('[MIDDLEWARE] supabase.auth.getUser:', { user, error });
  return response;
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
}; 