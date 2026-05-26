// Canonical Korean name for places with multiple known names
// Key: any known alias (lowercase) → Value: canonical Korean search term
export const PLACE_ALIASES: Record<string, string> = {
  // N Seoul Tower / Namsan Tower
  'n seoul tower': 'N서울타워',
  'namsan tower': 'N서울타워',
  서울타워: 'N서울타워',
  namsan: '남산',

  // COEX
  coex: '코엑스',
  'coex mall': '코엑스몰',

  // DDP
  ddp: '동대문디자인플라자',
  'dongdaemun design plaza': '동대문디자인플라자',

  // Gwanghwamun
  'gwanghwamun square': '광화문광장',
  gwanghwamun: '광화문',

  // Lotte World Tower
  'lotte world tower': '롯데월드타워',
  'lotte tower': '롯데월드타워',

  // Gyeongbokgung
  'gyeongbokgung palace': '경복궁',
  gyeongbokgung: '경복궁',
  'gyeongbok palace': '경복궁',

  // Bukchon
  'bukchon hanok village': '북촌한옥마을',
  bukchon: '북촌한옥마을',

  // Nami Island
  'nami island': '남이섬',
  namiseom: '남이섬',

  // Insadong
  insadong: '인사동',

  // Itaewon
  itaewon: '이태원',

  // Myeongdong
  myeongdong: '명동',

  // Busan landmarks
  'gamcheon culture village': '감천문화마을',
  gamcheon: '감천문화마을',
  haeundae: '해운대',
  'haeundae beach': '해운대해수욕장',
  'jagalchi market': '자갈치시장',
  jagalchi: '자갈치시장',

  // Jeju
  'seongsan ilchulbong': '성산일출봉',
  hallasan: '한라산',
  'jeju black pork street': '제주 흑돼지거리',
  'jeju love land': '제주러브랜드',

  // Gyeongju
  bulguksa: '불국사',
  'bulguksa temple': '불국사',
  cheomseongdae: '첨성대',

  // Seoraksan
  seoraksan: '설악산',
  'seoraksan national park': '설악산국립공원',
};

export function resolveAlias(input: string): string {
  const lower = input.toLowerCase().trim();

  // Check exact match first
  if (PLACE_ALIASES[lower]) {
    return PLACE_ALIASES[lower];
  }

  // Check if input contains a known alias
  for (const [alias, canonical] of Object.entries(PLACE_ALIASES)) {
    if (lower.includes(alias)) {
      return input.replace(new RegExp(alias, 'gi'), canonical);
    }
  }

  return input;
}
