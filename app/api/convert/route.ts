import { NextRequest, NextResponse } from 'next/server';
import { callGemini, translateAddressOptions } from '@/lib/gemini';
import { parseGeminiResponse } from '@/lib/addressParser';
import {
  searchKakaoAddress,
  searchKakaoKeyword,
  extractStationQuery,
  type KakaoResult,
} from '@/lib/kakao';
import { resolveAlias } from '@/lib/aliases';

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

function isSingleWordOrArea(input: string): boolean {
  const words = input.trim().split(/\s+/);
  const hasNumber = /\d/.test(input);
  const hasRoadSuffix = /(로|길|대로|동|구|시|도)\s*\d/.test(input);
  // Only treat as area if truly just 1-2 words with no numbers AND no road suffix
  // Multi-word landmark names like "Jeju Island Seongsan Ilchulbong" should NOT match
  return words.length <= 2 && !hasNumber && !hasRoadSuffix;
}

function koreanizeQuery(input: string): string {
  return (
    input
      // Major cities
      .replace(/seoul/gi, '서울')
      .replace(/busan/gi, '부산')
      .replace(/incheon/gi, '인천')
      .replace(/daegu/gi, '대구')
      .replace(/daejeon/gi, '대전')
      .replace(/gwangju/gi, '광주')
      .replace(/ulsan/gi, '울산')
      .replace(/sejong/gi, '세종')
      // Provinces
      .replace(/gangwon/gi, '강원')
      .replace(/gyeonggi/gi, '경기')
      .replace(/chungbuk/gi, '충북')
      .replace(/chungnam/gi, '충남')
      .replace(/jeonbuk/gi, '전북')
      .replace(/jeonnam/gi, '전남')
      .replace(/gyeongbuk/gi, '경북')
      .replace(/gyeongnam/gi, '경남')
      .replace(/jeju/gi, '제주')
      // Major non-Seoul cities
      .replace(/gangneung/gi, '강릉')
      .replace(/jeonju/gi, '전주')
      .replace(/gyeongju/gi, '경주')
      .replace(/sokcho/gi, '속초')
      .replace(/yeosu/gi, '여수')
      .replace(/tongyeong/gi, '통영')
      .replace(/suwon/gi, '수원')
      .replace(/seongnam/gi, '성남')
      .replace(/goyang/gi, '고양')
      .replace(/changwon/gi, '창원')
      .replace(/pohang/gi, '포항')
      .replace(/andong/gi, '안동')
      .replace(/cheonan/gi, '천안')
      .replace(/cheongju/gi, '청주')
      .replace(/jeonju/gi, '전주')
      // Seoul districts
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
      // Road suffixes
      .replace(/(\w+)-daero/gi, (_, name) => `${name}대로`)
      .replace(/(\w+)-ro/gi, (_, name) => `${name}로`)
      .replace(/(\w+)-gil/gi, (_, name) => `${name}길`)
      .trim()
  );
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
    // Step 1 — Resolve known aliases (N Seoul Tower → N서울타워 etc)
    const aliasResolved = resolveAlias(address);
    const workingAddress = aliasResolved !== address ? aliasResolved : address;

    // Step 2 — Skip Kakao for clearly informal inputs, go straight to Gemini
    if (looksLikeInformal(workingAddress)) {
      console.log('[convert] Informal input, Gemini fallback for:', address);
      const rawText = await callGemini(address);
      const parsed = parseGeminiResponse(rawText);
      return NextResponse.json({
        result: parsed,
        remaining: rateCheck.remaining,
        source: 'gemini',
      });
    }

    let kakaoResult: KakaoResult | null = null;

    // Step 3 — Try Kakao address search
    kakaoResult = await searchKakaoAddress(workingAddress);

    // Step 3b — If no result, try without lot number (for jibun addresses)
    if (!kakaoResult) {
      const withoutLotNumber = workingAddress.replace(/\s+\d+-?\d*$/, '').trim();
      if (withoutLotNumber !== workingAddress) {
        const partialResult = await searchKakaoAddress(withoutLotNumber);
        if (partialResult) {
          // Found the area but not the exact lot — return MEDIUM confidence
          partialResult.confidence = 'MEDIUM';
          partialResult.note =
            'Exact lot number not found — this is the nearest area. Verify the specific building on arrival.';
          kakaoResult = partialResult;
          console.log('[convert] Kakao partial hit for:', address);
        }
      }
    }

    // Step 4 — Try koreanized version for mixed English/Korean input
    if (!kakaoResult) {
      const koreanized = koreanizeQuery(workingAddress);
      if (koreanized !== workingAddress) {
        kakaoResult = await searchKakaoAddress(koreanized);
        if (kakaoResult) {
          console.log('[convert] Kakao hit (koreanized) for:', address);
        }
      }
    }

    // Step 5 — Try keyword search with exit stripped
    if (!kakaoResult) {
      const { stationQuery, exitDetail } = extractStationQuery(workingAddress);
      const koreanized = koreanizeQuery(stationQuery);
      const searchQuery = koreanized !== stationQuery ? koreanized : stationQuery;

      const keywordResult = await searchKakaoKeyword(searchQuery, 3);

      if (keywordResult) {
        if ('multiple' in keywordResult && keywordResult.multiple) {
          const translations = await translateAddressOptions(
            keywordResult.options.map((opt) => ({
              placeName: opt.placeName,
              short: opt.short,
            }))
          );

          const translatedOptions = keywordResult.options.map((opt, i) => ({
            ...opt,
            placeNameEn: translations[i]?.placeNameEn ?? '',
            shortEn: translations[i]?.shortEn ?? '',
            exitDetail,
          }));

          return NextResponse.json({
            disambiguation: true,
            options: translatedOptions,
            remaining: rateCheck.remaining,
          });
        }

        kakaoResult = keywordResult as KakaoResult;
        if (exitDetail && kakaoResult) {
          kakaoResult.detail = exitDetail;
          kakaoResult.note = 'Station address shown — your destination is near the exit indicated.';
        }
        console.log('[convert] Kakao keyword hit for:', address);
      }
    }

    // Step 6 — Single word / area only with no Kakao result
    // Don't fabricate — return LOW confidence with helpful note
    if (!kakaoResult && isSingleWordOrArea(workingAddress)) {
      console.log('[convert] Area-only input, Gemini fallback for:', address);
      const rawText = await callGemini(address);
      console.log('[gemini] raw:', rawText.substring(0, 200));
      const parsed = parseGeminiResponse(rawText);
      console.log('[gemini] parsed:', JSON.stringify(parsed));
      // Force LOW confidence for area-only inputs
      parsed.confidence = 'LOW';
      parsed.note =
        parsed.note ||
        'Area name only — search this in Naver Map and navigate to the specific location.';
      return NextResponse.json({
        result: parsed,
        remaining: rateCheck.remaining,
        source: 'gemini',
      });
    }

    // Step 7 — Gemini fallback for everything else
    if (!kakaoResult) {
      console.log('[convert] Gemini fallback for:', address);
      const rawText = await callGemini(address);
      const parsed = parseGeminiResponse(rawText);
      return NextResponse.json({
        result: parsed,
        remaining: rateCheck.remaining,
        source: 'gemini',
      });
    }

    console.log('[convert] Kakao hit for:', address);
    return NextResponse.json({
      result: kakaoResult,
      remaining: rateCheck.remaining,
      source: 'kakao',
    });
  } catch (error) {
    console.error('[convert] Error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
