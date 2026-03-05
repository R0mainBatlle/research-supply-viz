import { NextRequest, NextResponse } from 'next/server';

const API_TOKEN = process.env.API_TOKEN;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

// Rate limiter: 60 requests per minute per IP
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits) {
    if (now > val.resetAt) hits.delete(key);
  }
}, 5 * 60_000);

function checkRateLimit(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: RATE_LIMIT - entry.count };
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  // Allow same-origin, localhost dev, and configured origins
  const isAllowed = origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    ALLOWED_ORIGINS.includes(origin);
  if (!isAllowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // Auth: skip for same-origin requests (browser fetches from our own pages)
  const fetchSite = req.headers.get('sec-fetch-site');
  const isSameOrigin = fetchSite === 'same-origin';

  if (!isSameOrigin && API_TOKEN) {
    const authHeader = req.headers.get('authorization');
    const queryToken = req.nextUrl.searchParams.get('token');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken || queryToken;

    if (token !== API_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
  }

  // Rate limit
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const { ok, remaining } = checkRateLimit(ip);

  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60', ...cors } },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
