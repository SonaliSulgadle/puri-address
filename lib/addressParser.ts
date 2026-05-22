export interface ParsedAddress {
  type: string;
  normalized: string;
  short: string;
  detail: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  note: string | null;
}

// Patterns that should never appear in a map-searchable address
// These get stripped from NORMALIZED/SHORT and appended to DETAIL
const LOCATION_DETAIL_PATTERNS = [
  {
    pattern: /\s*지하\s*\d+층?/g,
    label: (m: string) => `Basement${m.replace('지하', '').trim()} (${m.trim()})`,
  },
  {
    pattern: /\s*\d+층/g,
    label: (m: string) => `Floor ${m.replace('층', '').trim()} (${m.trim()})`,
  },
];

function extractInlineDetails(address: string): { clean: string; extracted: string[] } {
  let clean = address;
  const extracted: string[] = [];

  for (const { pattern, label } of LOCATION_DETAIL_PATTERNS) {
    const matches = clean.match(pattern);
    if (matches) {
      matches.forEach((m) => extracted.push(label(m)));
      clean = clean.replace(pattern, '').trim();
    }
  }

  return { clean, extracted };
}

export function parseGeminiResponse(text: string): ParsedAddress {
  const lines = text.trim().split('\n');
  const result: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim().toUpperCase();
    const value = line.substring(colonIndex + 1).trim();
    if (key && value) {
      result[key] = value;
    }
  }

  let normalized = result['NORMALIZED'];
  let short = result['SHORT'];

  if (!normalized || !short) {
    throw new Error('AI returned an unexpected format. Please try again.');
  }

  // Strip any inline floor/basement details that snuck into NORMALIZED
  const normalizedExtraction = extractInlineDetails(normalized);
  const shortExtraction = extractInlineDetails(short);
  normalized = normalizedExtraction.clean;
  short = shortExtraction.clean;

  const inlineExtracted = [...normalizedExtraction.extracted, ...shortExtraction.extracted].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const existingDetail =
    result['DETAIL'] && result['DETAIL'].toUpperCase() !== 'NONE' ? result['DETAIL'] : null;

  const allDetails = [...(existingDetail ? [existingDetail] : []), ...inlineExtracted];

  const detail = allDetails.length > 0 ? allDetails.join(', ') : null;

  const note = result['NOTE'] && result['NOTE'].toUpperCase() !== 'NONE' ? result['NOTE'] : null;

  const rawConfidence = result['CONFIDENCE']?.toUpperCase();
  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    rawConfidence === 'HIGH' || rawConfidence === 'MEDIUM' || rawConfidence === 'LOW'
      ? rawConfidence
      : 'LOW';

  return {
    type: result['TYPE'] || '불완전',
    normalized,
    short,
    detail,
    confidence,
    note,
  };
}
