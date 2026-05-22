const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGemini(address: string): Promise<string> {
  const prompt = `You are a Korean address normalization assistant for foreigners in South Korea.
Output is used to search Naver Map and Kakao Map. Accuracy is more important than completeness.

INPUT ADDRESS: "${address}"

INPUT FORMATS HANDLED:
A — 지번 (land lot): 서울 마포구 서교동 395-166
B — 도로명 (road name): 서울 마포구 와우산로29길 17
C — English/romanized: 17, Wausan-ro 29-gil, Mapo-gu, Seoul
D — Building/landmark: 홍대입구역 2번출구 스타벅스
E — Informal/vague: 홍대 근처 편의점 옆 골목
F — Subway exit: 2호선 홍대입구 9번 출구
G — Google Maps English: Seoul, Gangnam District, Yeoksam-dong, Seolleung-ro, 551
H — Phonetic/romanized area: "Mapo-goo Hongdae", "Itaewon-dong"
I — Mixed Korean/English: "Gangnam-gu 선릉로 551 새롬빌딩"

ROMANIZATION RULES — convert these suffixes and patterns directly:
-ro → 로 (e.g. Seolleung-ro → 선릉로, Teheran-ro → 테헤란로)
-daero → 대로 (e.g. Gangnam-daero → 강남대로)
-gil → 길 (e.g. Wausan-ro 29-gil → 와우산로29길)
-gu → 구 (e.g. Gangnam-gu → 강남구, Mapo-gu → 마포구)
-dong → 동 (e.g. Itaewon-dong → 이태원동, Yeoksam-dong → 역삼동)
-si → 시, -do → 도
Seoul → 서울특별시
Busan → 부산광역시
Incheon → 인천광역시
Gangnam District → 강남구
Yeongdeungpo District → 영등포구

EXTRACTION PRIORITY — follow this order strictly:
1. If the input contains a romanized or English road name AND a building number: convert the road name directly using romanization rules and use the number as-is. Do NOT substitute a different road name from your knowledge.
2. If the input contains a Korean road name and number: use as-is.
3. If the input contains only a district/dong and building name with no road: use your knowledge to find the road address, set CONFIDENCE MEDIUM.
4. If the input is vague with no number: use nearest landmark, set CONFIDENCE LOW.

TASK:
1. Identify format
2. Apply EXTRACTION PRIORITY above
3. Convert to Korean 도로명주소
4. Extract floor/unit/building to DETAIL field separately
5. For landmarks and businesses: provide the actual verified road address
6. For subway exits: provide the station road address, note the exit in DETAIL

CRITICAL RULES:
- If a road name is present in the input, ALWAYS use it — never substitute a different road
- NEVER fabricate a building number not present in the input
- Building name (새롬빌딩, 파크빌) is NOT a building number — never use it as one
- If road number is ambiguous: omit it and set CONFIDENCE: MEDIUM
- Floor/unit/building name go in DETAIL only — never in NORMALIZED or SHORT
- For vague/informal input: use nearest landmark address, set CONFIDENCE: LOW

STATION RULES:
- 신촌역 (Sinchon) is in 서대문구 — NOT 마포구
- 홍대입구역 (Hongdae) is in 마포구 양화로
- 강남역 is in 강남구 강남대로
- Never return 마포구 for non-Mapo stations

DETAIL EXTRACTION:
- 지하[n]층 = basement: "Basement floor [n] (지하[n]층)"
- [n]층 = floor: "Floor [n] ([n]층)"
- [n]호 = unit: "Unit [n] ([n]호)"
- Building name: "[Name] Building ([Korean])"
- Subway exit: "[Station name], Exit [n] ([역이름] [n]번 출구)"
- Multiple details: combine with comma
- None present: NONE

CONFIDENCE:
HIGH = road name and number both present in input and unambiguous
MEDIUM = road name present but number missing or estimated, or resolved from building name only
LOW = only approximate — user must look around on arrival

Respond EXACTLY in this format, no other text, no markdown:
TYPE: [지번|도로명|영문|건물명|불완전]
NORMALIZED: [full Korean 도로명주소 — no floor/unit/building]
SHORT: [for map search — omit 특별시/광역시]
DETAIL: [floor/unit/building/exit in English with Korean, or NONE]
CONFIDENCE: [HIGH|MEDIUM|LOW]
NOTE: [one sentence caveat, or NONE]

EXAMPLES:

Input: Seoul, Gangnam District, Yeoksam-dong, Seolleung-ro, 551 새롬빌딩
TYPE: 영문
NORMALIZED: 서울특별시 강남구 선릉로 551
SHORT: 강남구 선릉로 551
DETAIL: Sarom Building (새롬빌딩)
CONFIDENCE: HIGH
NOTE: NONE

Input: Seoul, Gwanak-gu, Gwanak-ro, 164 지하1층
TYPE: 영문
NORMALIZED: 서울특별시 관악구 관악로 164
SHORT: 관악구 관악로 164
DETAIL: Basement floor 1 (지하1층)
CONFIDENCE: HIGH
NOTE: NONE

Input: 파크빌 1층 41호 관악구 남부순환로216길
TYPE: 도로명
NORMALIZED: 서울특별시 관악구 남부순환로216길
SHORT: 관악구 남부순환로216길
DETAIL: Pakvil Building, Floor 1, Unit 41 (파크빌 1층 41호)
CONFIDENCE: MEDIUM
NOTE: Building number omitted — search the street name and look for 파크빌.

Input: 2호선 홍대입구역 9번 출구
TYPE: 건물명
NORMALIZED: 서울특별시 마포구 양화로 188
SHORT: 마포구 양화로 188
DETAIL: Hongik University Station, Exit 9 (홍대입구역 9번 출구)
CONFIDENCE: HIGH
NOTE: This is the station address — your destination is near Exit 9.

Input: near Itaewon CGV
TYPE: 건물명
NORMALIZED: 서울특별시 용산구 이태원로 222
SHORT: 용산구 이태원로 222
DETAIL: CGV Itaewon (CGV 이태원)
CONFIDENCE: HIGH
NOTE: NONE

Input: Hongdae cafe alley near exit 9
TYPE: 불완전
NORMALIZED: 서울특별시 마포구 홍대입구역
SHORT: 마포구 홍대입구역
DETAIL: Near Exit 9 (9번 출구 근처)
CONFIDENCE: LOW
NOTE: Too vague for a specific address — search 홍대입구역 9번 출구 in Naver Map and look nearby.

Input: 서교동 395-166
TYPE: 지번
NORMALIZED: 서울특별시 마포구 와우산로29길 17
SHORT: 마포구 와우산로29길 17
DETAIL: NONE
CONFIDENCE: HIGH
NOTE: NONE

Input: Sinchon station exit 3
TYPE: 건물명
NORMALIZED: 서울특별시 서대문구 신촌역로 1
SHORT: 서대문구 신촌역로 1
DETAIL: Sinchon Station, Exit 3 (신촌역 3번 출구)
CONFIDENCE: HIGH
NOTE: This is the station address — your destination is near Exit 3.`;

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 },
      }),
    });

    // Retry on 503 (overloaded) and 429 (rate limit from Google)
    if (response.status === 503 || response.status === 429) {
      const isLastAttempt = attempt === MAX_RETRIES - 1;
      if (isLastAttempt) {
        throw new Error('The AI service is temporarily busy. Please try again in a few seconds.');
      }
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  }

  throw new Error('The AI service is temporarily busy. Please try again in a few seconds.');
}
