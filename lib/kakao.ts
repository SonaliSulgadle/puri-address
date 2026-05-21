export interface KakaoResult {
  normalized: string;
  short: string;
  type: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string | null;
  note: string | null;
}

export interface KakaoMultipleResults {
  multiple: true;
  options: Array<{
    normalized: string;
    short: string;
    detail: string | null;
    placeName: string;
  }>;
  exitDetail: string | null;
}

interface KakaoDocument {
  address_name: string;
  address_type: string;
  road_address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    road_name: string;
    building_no: string;
    building_name: string;
    underground_yn: string;
  } | null;
  address: {
    address_name: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
    main_address_no: string;
    sub_address_no: string;
  } | null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildShort(normalized: string): string {
  return normalized
    .replace('서울특별시', '서울')
    .replace('부산광역시', '부산')
    .replace('인천광역시', '인천')
    .replace('대구광역시', '대구')
    .replace('대전광역시', '대전')
    .replace('광주광역시', '광주')
    .replace('울산광역시', '울산')
    .replace('세종특별자치시', '세종')
    .trim();
}

function extractDetail(doc: KakaoDocument): string | null {
  const buildingName = doc.road_address?.building_name;
  if (buildingName && buildingName.trim()) {
    return `${buildingName} Building (${buildingName})`;
  }
  return null;
}

export function extractStationQuery(input: string): {
  stationQuery: string;
  exitDetail: string | null;
} {
  const exitMatch = input.match(/(\d+)\s*번?\s*출구|exit\s*(\d+)/i);
  const exitNum = exitMatch ? (exitMatch[1] || exitMatch[2]) : null;
  const exitDetail = exitNum ? `Exit ${exitNum} (${exitNum}번 출구)` : null;

  const stationQuery = input
    .replace(/\s*(\d+)\s*번?\s*출구/g, '')
    .replace(/\s*exit\s*\d+/gi, '')
    .trim();

  return { stationQuery, exitDetail };
}

export async function searchKakaoAddress(
  query: string
): Promise<KakaoResult | null> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) {
    console.warn('[kakao] KAKAO_API_KEY not set');
    return null;
  }

  const MAX_RETRIES = 2;
  const RETRY_DELAYS = [1000, 2000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encoded}&size=1`;

      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${apiKey}` },
      });

      if (response.status === 503 || response.status === 504) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        return null;
      }

      if (!response.ok) {
        console.error('[kakao] API error:', response.status);
        return null;
      }

      const data = await response.json();
      const documents: KakaoDocument[] = data.documents;

      if (!documents || documents.length === 0) return null;

      const doc = documents[0];
      const roadAddress = doc.road_address;
      const jibunAddress = doc.address;

      if (roadAddress) {
        const normalized = roadAddress.address_name;
        const short = buildShort(normalized);
        const detail = extractDetail(doc);
        return { normalized, short, type: '도로명', confidence: 'HIGH', detail, note: null };
      }

      if (jibunAddress) {
        const normalized = jibunAddress.address_name;
        const short = buildShort(normalized);
        return {
          normalized, short, type: '지번', confidence: 'MEDIUM', detail: null,
          note: 'Jibun (land lot) address — 도로명주소 not available for this location.',
        };
      }

      return null;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      console.error('[kakao] Fetch error:', error);
      return null;
    }
  }

  return null;
}

export async function searchKakaoKeyword(
  query: string,
  size: number = 1
): Promise<KakaoResult | KakaoMultipleResults | null> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) return null;

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encoded}&size=${size}`;

    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!response.ok) {
      console.error('[kakao] Keyword API error:', response.status);
      return null;
    }

    const data = await response.json();
    const documents = data.documents;

    if (!documents || documents.length === 0) return null;

    // Multiple results — filter and return for disambiguation
    if (size > 1 && documents.length > 1) {
      const options = documents
        .filter((doc: any) => {
          const category = doc.category_group_code || '';
          const hasRoadAddress = !!doc.road_address_name;
          return hasRoadAddress || ['SW8', 'AT4', 'CT1', 'PO3'].includes(category);
        })
        .slice(0, 3)
        .map((doc: any) => ({
          normalized: doc.road_address_name || doc.address_name,
          short: buildShort(doc.road_address_name || doc.address_name),
          detail: doc.place_name || null,
          placeName: doc.place_name || '',
          categoryCode: doc.category_group_code || '',
        }));

      if (options.length === 0) return null;

      // Only one meaningful result after filtering — return directly
      if (options.length === 1) {
        return {
          normalized: options[0].normalized,
          short: options[0].short,
          type: '건물명',
          confidence: 'HIGH',
          detail: options[0].detail,
          note: null,
        };
      }

      return { multiple: true, options, exitDetail: null };
    }

    const doc = documents[0];
    const normalized = doc.road_address_name || doc.address_name;
    if (!normalized) return null;

    const short = buildShort(normalized);
    const detail = doc.place_name || null;

    return { normalized, short, type: '건물명', confidence: 'HIGH', detail, note: null };
  } catch (error) {
    console.error('[kakao] Keyword fetch error:', error);
    return null;
  }
}
