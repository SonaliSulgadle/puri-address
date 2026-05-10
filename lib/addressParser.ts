export interface ParsedAddress {
  type: string;
  normalized: string;
  short: string;
  detail: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  note: string | null;
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

  const normalized = result['NORMALIZED'];
  const short = result['SHORT'];

  if (!normalized || !short) {
    throw new Error('AI returned an unexpected format. Please try again.');
  }

  const detail =
    result['DETAIL'] && result['DETAIL'].toUpperCase() !== 'NONE'
      ? result['DETAIL']
      : null;

  const note =
    result['NOTE'] && result['NOTE'].toUpperCase() !== 'NONE'
      ? result['NOTE']
      : null;

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
