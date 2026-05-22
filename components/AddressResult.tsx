'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import type { ParsedAddress } from '@/lib/addressParser';

interface AddressResultProps {
  result: ParsedAddress;
}

const confidenceConfig = {
  HIGH: {
    label: 'HIGH CONFIDENCE',
    style: { backgroundColor: '#DCE6DE', color: '#192B20', borderColor: '#B8D4BF' },
  },
  MEDIUM: {
    label: 'MEDIUM CONFIDENCE',
    style: { backgroundColor: '#FEF3C7', color: '#78350F', borderColor: '#FDE68A' },
  },
  LOW: {
    label: 'LOW CONFIDENCE',
    style: { backgroundColor: '#FCE8E8', color: '#702626', borderColor: '#FCCACA' },
  },
};

export default function AddressResult({ result }: AddressResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.normalized);
    } catch {
      const el = document.createElement('textarea');
      el.value = result.normalized;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    track('copy_clicked', { confidence: result.confidence });
  };

  const encodedShort = encodeURIComponent(result.short);
  const encodedNormalized = encodeURIComponent(result.normalized);
  const naverAppUrl = `nmap://search?query=${encodedShort}&appname=io.puri.address`;
  const naverWebUrl = `https://map.naver.com/p/search/${encodedShort}`;
  const kakaoUrl = `https://map.kakao.com/?q=${encodedShort}&webview=0`;
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[nickname]=${encodedShort}&dropoff[formatted_address]=${encodedNormalized}`;

  const handleNaverClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    track('naver_map_clicked', { confidence: result.confidence });
    window.location.href = naverAppUrl;
    const fallback = setTimeout(() => {
      window.open(naverWebUrl, '_blank');
    }, 1500);
    window.addEventListener('blur', () => clearTimeout(fallback), { once: true });
  };

  const confidence = confidenceConfig[result.confidence] ?? confidenceConfig.LOW;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border-2 bg-white shadow-sm overflow-hidden"
        style={{ borderColor: '#E8EDE8' }}
      >
        <div
          className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundColor: '#F6FAF6', borderColor: '#E8EDE8' }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: '#5C8A6E' }}
          >
            Naver &amp; Kakao Map-Ready Address
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={confidence.style}
          >
            {confidence.label}
          </span>
        </div>
        <div className="px-5 pt-4 pb-2 flex flex-col gap-1">
          <p className="text-xl font-bold leading-snug" style={{ color: '#1A1C1A' }}>
            {result.normalized}
          </p>
          <p className="text-sm" style={{ color: '#727972' }}>
            {result.short}
          </p>
        </div>
        <div className="px-5 pb-4 pt-2">
          <button
            onClick={handleCopy}
            className="text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: '#C1C8C1', color: '#424942', backgroundColor: 'white' }}
          >
            {copied ? '✓ Copied!' : '📋 Copy address'}
          </button>
        </div>
      </div>

      {result.detail && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: '#78350F' }}
          >
            Location Detail
          </p>
          <p className="text-sm" style={{ color: '#78350F' }}>
            {result.detail}
          </p>
        </div>
      )}

      {result.note && (
        <div
          className="rounded-xl border px-5 py-4 flex gap-3 items-start"
          style={{ backgroundColor: '#F0F7F2', borderColor: '#B8D4BF' }}
        >
          <span className="text-lg leading-none mt-0.5">ℹ️</span>
          <p className="text-sm" style={{ color: '#3E5C49' }}>
            {result.note}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={naverAppUrl}
          onClick={handleNaverClick}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#03C75A' }}
        >
          <span>🗺️</span>
          <span>Open in Naver Map</span>
        </a>

        <a
          href={kakaoUrl}
          onClick={(e) => {
            e.preventDefault();
            track('kakao_map_clicked', { confidence: result.confidence });
            window.open(kakaoUrl, '_blank', 'noopener,noreferrer');
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#FAE100', color: '#3A1D1D' }}
        >
          <span>🗺️</span>
          <span>Open in Kakao Map</span>
        </a>
      </div>

      <a
        href={uberUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('uber_clicked', { confidence: result.confidence })}
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-colors"
        style={{ borderColor: '#5C8A6E', color: '#3E5C49', backgroundColor: 'white' }}
      >
        <span>🚕</span>
        <span>Get a cab to this address</span>
      </a>

      <p className="text-xs text-gray-400 text-center px-4">
        AI-generated — verify important addresses before visiting
      </p>
    </div>
  );
}
