import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { parseGeminiResponse } from '@/lib/addressParser';
import {
  searchKakaoAddress,
  searchKakaoKeyword,
  extractStationQuery,
  KakaoResult,
} from '@/lib/kakao';

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
  const decimal = /\d{2}\.\d+[°\s,]+\d{3}\.\d+/;
  const dms = /\d+°\d+'\d+(\.\d+)?"[NS]/i;
  const mapsUrl = /maps\.google|maps\.app\.goo|goo\.gl\/maps/i;
  return decimal.test(input) || dms.test(input) || mapsUrl.test(input);
}

function looksLikeInformal(input: string): boolean {
  const informalPatterns = [
    /근처/,
    /옆/,
    /앞/,
    /골목/,
    /편의점/,
    /near\s/i,
    /next\s+to/i,
    /across\s+from/i,
  ];
  return informalPatterns.some((pattern) => pattern.test(input));
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
    return NextResponse.json(
      {
        error:
          'Coordinates cannot be reliably converted without a geocoding service. Copy the place name from Google Maps instead — for example: "Microsoft Korea, 종로구 종로1길 50".',
        code: 'COORDINATE_BLOCKED',
      },
      { status: 422 }
    );
  }

  try {
    // Step 1 — try Kakao first (fast, database-accurate)
    // Skip Kakao for clearly informal/vague inputs
    if (!looksLikeInformal(address)) {
      let kakaoResult = await searchKakaoAddress(address);

      // If no result, try koreanized version for mixed English/Korean input
      if (!kakaoResult) {
        const koreanized = koreanizeQuery(address);
        if (koreanized !== address) {
          kakaoResult = await searchKakaoAddress(koreanized);
          if (kakaoResult) {
            console.log('[convert] Kakao hit (koreanized) for:', address);
          }
        }
      }

      // Try keyword search with exit stripped out
      // Try keyword search with exit stripped
      if (!kakaoResult) {
        const { stationQuery, exitDetail } = extractStationQuery(address);
        const koreanized = koreanizeQuery(stationQuery);
        const searchQuery = koreanized !== stationQuery ? koreanized : stationQuery;

        // Fetch up to 3 results to detect disambiguation
        const keywordResult = await searchKakaoKeyword(searchQuery, 3);

        if (keywordResult) {
          if ('multiple' in keywordResult && keywordResult.multiple) {
            // Multiple stations with same name — return disambiguation response
            return NextResponse.json({
              disambiguation: true,
              options: keywordResult.options.map((opt) => ({
                ...opt,
                exitDetail,
              })),
              remaining: rateCheck.remaining,
            });
          }

          // Single result
          kakaoResult = keywordResult as KakaoResult;
          if (exitDetail && kakaoResult) {
            kakaoResult.detail = exitDetail;
            kakaoResult.note =
              'Station address shown — your destination is near the exit indicated.';
          }
          console.log('[convert] Kakao keyword hit for:', address);
        }
      }

      if (kakaoResult) {
        console.log('[convert] Kakao hit for:', address);
        return NextResponse.json({
          result: kakaoResult,
          remaining: rateCheck.remaining,
          source: 'kakao',
        });
      }
    }

    // Step 2 — fall back to Gemini for vague/informal/landmark inputs
    console.log('[convert] Gemini fallback for:', address);
    const rawText = await callGemini(address);
    const parsed = parseGeminiResponse(rawText);
    return NextResponse.json({
      result: parsed,
      remaining: rateCheck.remaining,
      source: 'gemini',
    });
  } catch (error) {
    console.error('[convert] Error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  function koreanizeQuery(input: string): string {
    return input
      .replace(/seoul/gi, '서울')
      .replace(/busan/gi, '부산')
      .replace(/incheon/gi, '인천')
      .replace(/gangnam[- ]gu/gi, '강남구')
      .replace(/mapo[- ]gu/gi, '마포구')
      .replace(/gwanak[- ]gu/gi, '관악구')
      .replace(/yongsan[- ]gu/gi, '용산구')
      .replace(/seodaemun[- ]gu/gi, '서대문구')
      .replace(/songpa[- ]gu/gi, '송파구')
      .replace(/jongno[- ]gu/gi, '종로구')
      .replace(/jung[- ]gu/gi, '중구')
      .replace(/yeongdeungpo[- ]gu/gi, '영등포구')
      .replace(/seongdong[- ]gu/gi, '성동구')
      .replace(/gangdong[- ]gu/gi, '강동구')
      .replace(/gangbuk[- ]gu/gi, '강북구')
      .replace(/(\w+)-daero/gi, (_, name) => `${name}대로`)
      .replace(/(\w+)-ro/gi, (_, name) => `${name}로`)
      .replace(/(\w+)-gil/gi, (_, name) => `${name}길`)
      .trim();
  }
}
