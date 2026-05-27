'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import AddressInput from '@/components/AddressInput';
import AddressResult from '@/components/AddressResult';
import ErrorState from '@/components/ErrorState';
import FeedbackButton from '@/components/FeedbackButton';
import type { ParsedAddress } from '@/lib/addressParser';

type DisambiguationOption = {
  normalized: string;
  short: string;
  detail: string | null;
  placeName: string;
  exitDetail: string | null;
  cityEnglish: string;
  placeNameEn: string;
  shortEn: string;
};

export default function Home() {
  const [result, setResult] = useState<ParsedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [disambiguation, setDisambiguation] = useState<DisambiguationOption[] | null>(null);
  const [lastDisambiguation, setLastDisambiguation] = useState<DisambiguationOption[] | null>(null);

  const handleConvert = async (address: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setDisambiguation(null);
    setLastDisambiguation(null);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to convert address. Please try again.');
        track('error_shown', { status: res.status, code: data.code ?? 'UNKNOWN' });
        return;
      }

      if (data.disambiguation) {
        setDisambiguation(data.options);
        return;
      }

      setResult(data.result);
      track('result_shown', { confidence: data.result.confidence });
      if (typeof data.remaining === 'number') {
        setRemaining(data.remaining);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDisambiguation = (opt: DisambiguationOption) => {
    setLastDisambiguation(disambiguation);
    setDisambiguation(null);

    let detail: string | null = null;
    if (opt.exitDetail) {
      detail = opt.exitDetail;
    } else if (opt.placeNameEn) {
      detail = opt.placeNameEn;
    }

    setResult({
      type: '건물명',
      normalized: opt.normalized,
      short: opt.short,
      detail: detail,
      confidence: 'HIGH' as const,
      note: opt.exitDetail
        ? 'Station address shown — your destination is near the exit indicated.'
        : null,
    });
  };

  const remainingColor =
    remaining === null
      ? ''
      : remaining > 5
        ? 'text-[#5C8A6E]'
        : remaining > 2
          ? 'text-[#B8860B]'
          : 'text-[#8B3A3A]';

  return (
    <main className="min-h-screen bg-[#F6FAF6]">
      <div
        className="px-4 py-12 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #5C8A6E 0%, #3E5C49 100%)' }}
      >
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Puri <span className="opacity-70 font-normal text-2xl">(풀이)</span>
          </h1>
          <p className="text-lg mb-3" style={{ color: '#DCE6DE' }}>
            Convert any Korean address instantly
          </p>
          <p
            className="text-xs rounded-full px-4 py-1.5 inline-block"
            style={{ color: '#DCE6DE', backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            From the Puri app — daily life assistant for foreigners in Korea
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
        {remaining !== null && (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs text-[#727972]">Conversions remaining this hour:</span>
            <span className={`text-xs font-bold ${remainingColor}`}>{remaining} / 10</span>
          </div>
        )}

        <AddressInput onSubmit={handleConvert} isLoading={isLoading} />

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full animate-bounce"
                  style={{
                    backgroundColor: '#5C8A6E',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-sm" style={{ color: '#727972' }}>
              Converting address...
            </p>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={() => setError(null)} />}

        {/* Disambiguation card */}
        {disambiguation && !isLoading && (
          <div
            className="rounded-xl border-2 bg-white shadow-sm overflow-hidden"
            style={{ borderColor: '#E8EDE8' }}
          >
            <div
              className="px-5 py-3 border-b"
              style={{ backgroundColor: '#F6FAF6', borderColor: '#E8EDE8' }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#5C8A6E' }}
              >
                Multiple locations found — which one?
              </p>
            </div>
            <div className="flex flex-col divide-y" style={{ borderColor: '#E8EDE8' }}>
              {disambiguation.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectDisambiguation(opt)}
                  className="px-5 py-4 text-left hover:bg-[#F6FAF6] transition-colors w-full"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold" style={{ color: '#1A1C1A' }}>
                      {opt.placeNameEn || opt.placeName}
                    </p>
                    {opt.cityEnglish && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ backgroundColor: '#DCE6DE', color: '#3E5C49' }}
                      >
                        {opt.cityEnglish}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#424942' }}>
                    {opt.shortEn || opt.short}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#C1C8C1' }}>
                    {opt.placeName} · {opt.short}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && <AddressResult result={result} />}

        {/* Back to options button */}
        {result && !isLoading && lastDisambiguation && (
          <button
            onClick={() => {
              setDisambiguation(lastDisambiguation);
              setLastDisambiguation(null);
              setResult(null);
            }}
            className="text-sm px-4 py-2.5 rounded-xl border-2 w-full transition-colors"
            style={{ borderColor: '#C1C8C1', color: '#424942', backgroundColor: 'white' }}
          >
            ← Show other options
          </button>
        )}

        <div className="text-xs text-[#727972] text-center pb-4 flex flex-col gap-1">
          <p>Free tier: 10 conversions per hour per device</p>
          <p>Best for standard addresses and subway stations. Always verify before visiting.</p>
        </div>
      </div>

      <FeedbackButton />
    </main>
  );
}
