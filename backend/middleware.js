import { NextResponse } from 'next/server';
import { updateSession } from './utils/supabase/middleware.ts';

// Origins allowed to call the API with credentials
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev server
  'http://localhost:3001',   // Alternative frontend port
  'https://avsmatrimony.com',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':      allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods':     'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization, X-Requested-With, x-admin-secret',
  };
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  // Handle preflight (OPTIONS) requests immediately
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Log all API requests
  console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);

  // Refresh the Supabase auth session on every request (keeps cookies fresh)
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
    '/((?\!_next/static|_next/image|favicon.ico).*)',
  ],
};
