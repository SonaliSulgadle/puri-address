'use client';

import { useState } from 'react';
import AddressInput from '@/components/AddressInput';
import AddressResult from '@/components/AddressResult';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import FeedbackButton from '@/components/FeedbackButton';
import type { ParsedAddress } from '@/lib/addressParser';
import { track } from '@vercel/analytics';

export default function Home() {
  const [result, setResult] = useState<ParsedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const handleConvert = async (address: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to convert address. Please try again.');
        track('error_shown', { 
          status: res.status,
          code: data.code ?? 'UNKNOWN'
        });
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

  const remainingColor =
    remaining === null ? '' :
    remaining > 5 ? 'text-[#5C8A6E]' :
    remaining > 2 ? 'text-[#B8860B]' :
    'text-[#8B3A3A]';

  return (
    <main className="min-h-screen bg-[#F5F6FC]">
      <div
        className="px-4 py-12 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #5C8A6E 0%, #3E5C49 100%)' }}
      >
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Puri{' '}
            <span className="opacity-70 font-normal text-2xl">(풀이)</span>
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
            <span className={`text-xs font-bold ${remainingColor}`}>
              {remaining} / 10
            </span>
          </div>
        )}

        <AddressInput onSubmit={handleConvert} isLoading={isLoading} />

        {isLoading && <LoadingState />}

        {error && (
          <ErrorState
            message={error}
            onRetry={() => setError(null)}
          />
        )}

        {result && !isLoading && <AddressResult result={result} />}

        <div className="text-xs text-[#727972] text-center pb-4 flex flex-col gap-1">
          <p>Free tier: 10 conversions per hour per device</p>
          <p>Best for standard addresses and subway stations. Always verify before visiting.</p>
        </div>
      </div>

      <FeedbackButton />
    </main>
  );
}
