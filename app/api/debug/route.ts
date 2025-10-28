import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic'
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { session }, error } = await supabase.auth.getSession();
  return NextResponse.json({
    cookies: request.cookies.getAll(),
    user: session?.user,
    session,
    error,
  });
} 