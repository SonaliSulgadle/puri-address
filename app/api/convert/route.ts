import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { parseGeminiResponse } from '@/lib/addressParser';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 60 * 1000;

function getIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

function looksLikeCoordinates(input: string): boolean {
  // Decimal: 37.5748, 126.9784 or 37.5748N 126.9784E
  const decimal = /\d{2}\.\d+[°\s,]+\d{3}\.\d+/;
  // DMS: 37°34'29.1"N 126°58'45.5"E
  const dms = /\d+°\d+'\d+(\.\d+)?"[NS]/i;
  // Google Maps share URL
  const mapsUrl = /maps\.google|maps\.app\.goo|goo\.gl\/maps/i;
  return decimal.test(input) || dms.test(input) || mapsUrl.test(input);
}

export async function POST(request: NextRequest) {
  const ip = getIP(request);
  const rateCheck = checkRateLimit(ip);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. You can convert up to 10 addresses per hour.' },
      { status: 429 }
    );
  }

  let body: { address?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (!address) {
    return NextResponse.json({ error: 'Address cannot be empty.' }, { status: 400 });
  }

  if (address.length > 500) {
    return NextResponse.json(
      { error: 'Address is too long. Maximum 500 characters.' },
      { status: 400 }
    );
  }

  if (looksLikeCoordinates(address)) {
  console.log('[convert] coordinate_blocked');
  return NextResponse.json(
    {
      error: 'Coordinates cannot be reliably converted without a geocoding service. Copy the place name from Google Maps instead — for example: "Microsoft Korea, 종로구 종로1길 50".',
      code: 'COORDINATE_BLOCKED',
    },
    { status: 422 }
  );
}

  try {
    const rawText = await callGemini(address);
    const parsed = parseGeminiResponse(rawText);
    return NextResponse.json({ result: parsed, remaining: rateCheck.remaining });
  } catch (error) {
    console.error('[convert] Error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
