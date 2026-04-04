import { NextResponse } from 'next/server';

export function middleware(request) {
  // Capture request payload dimensions
  const timestamp = new Date().toISOString();
  console.log(`[Backend Request] ${timestamp} | ${request.method} ${request.nextUrl.pathname}`);
  
  const response = NextResponse.next();
  
  // Log successful/failed proxy returns
  console.log(`[Backend Response] ${timestamp} | Status: ${response.status} | URL: ${request.nextUrl.pathname}`);
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
