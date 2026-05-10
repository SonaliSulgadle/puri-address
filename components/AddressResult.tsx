'use client';

import { useState } from 'react';
import type { ParsedAddress } from '@/lib/addressParser';

interface AddressResultProps {
  result: ParsedAddress;
}

const confidenceConfig = {
  HIGH: { label: 'HIGH CONFIDENCE', className: 'bg-green-100 text-green-700 border-green-200' },
  MEDIUM: { label: 'MEDIUM CONFIDENCE', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  LOW: { label: 'LOW CONFIDENCE', className: 'bg-red-100 text-red-700 border-red-200' },
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
  };

  const encodedShort = encodeURIComponent(result.short);
  const naverAppUrl = `nmap://search?query=${encodedShort}&appname=io.puri.address`;
  const naverWebUrl = `https://map.naver.com/p/search/${encodedShort}`;
  const kakaoUrl = `https://map.kakao.com/?q=${encodedShort}`;

  const handleNaverClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.href = naverAppUrl;
    const fallback = setTimeout(() => {
      window.open(naverWebUrl, '_blank');
    }, 1500);
    window.addEventListener('blur', () => clearTimeout(fallback), { once: true });
  };

  const confidence = confidenceConfig[result.confidence] ?? confidenceConfig.LOW;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border-2 border-indigo-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            Naver &amp; Kakao Map-Ready Address
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${confidence.className}`}>
            {confidence.label}
          </span>
        </div>
        <div className="px-5 pt-4 pb-2 flex flex-col gap-1">
          <p className="text-xl font-bold text-[#1A1B2E] leading-snug">{result.normalized}</p>
          <p className="text-sm text-gray-500">{result.short}</p>
        </div>
        <div className="px-5 pb-4 pt-2">
          <button
            onClick={handleCopy}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy address'}
          </button>
        </div>
      </div>

      {result.detail && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Location Detail</p>
          <p className="text-sm text-amber-800">{result.detail}</p>
        </div>
      )}

      {result.note && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex gap-3 items-start">
          <span className="text-lg leading-none mt-0.5">ℹ️</span>
          <p className="text-sm text-blue-800">{result.note}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={naverAppUrl}
          onClick={handleNaverClick}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#03C75A] hover:bg-[#02a84c] text-white font-semibold text-sm transition-colors"
        >
          <span>🗺️</span>
          <span>Open in Naver Map</span>
        </a>
        
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#FAE100] hover:bg-[#e8cf00] text-[#3A1D1D] font-semibold text-sm transition-colors"
        >
          <span>🗺️</span>
          <span>Open in Kakao Map</span>
        </a>
      </div>

      <p className="text-xs text-gray-400 text-center px-4">
        AI-generated — verify important addresses before visiting
      </p>
    </div>
  );
}
