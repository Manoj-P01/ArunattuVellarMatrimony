import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function corsHeaders(origin: string) {
  // Reflect incoming origin to allow any domain (needed for Allow-Credentials: true)
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods':     'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization, X-Requested-With, x-admin-secret',
  };
}

export async function updateSession(request: NextRequest) {
  // Create an initial response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Initialize the server client safely for Edge
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session without using prohibited Node.js APIs
  await supabase.auth.getUser()

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  // Handle preflight (OPTIONS) requests immediately
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Log all API requests
  console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);

  // Refresh the Supabase auth session
  const response = await updateSession(request);

  // Attach CORS headers to all responses
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));

  return response;
}

export const config = {
  matcher: [
    // Match all API routes; skip Next.js internals and static files
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
