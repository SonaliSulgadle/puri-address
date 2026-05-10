'use client';

import { useState, useEffect } from 'react';

interface AddressInputProps {
  onSubmit: (address: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  '서교동 395-166',
  'Hongdae exit 9 near GS25',
  '파크빌 1층 41호 관악구 남부순환로216길',
  '2호선 홍대입구역 9번 출구',
];

export default function AddressInput({ onSubmit, isLoading }: AddressInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter an address.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Address is too long (max 500 characters).');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const handleClear = () => {
    setValue('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="relative">
          <textarea
            className={`w-full rounded-xl border-2 p-4 pr-10 text-base resize-none focus:outline-none focus:border-indigo-500 transition-colors text-[#1A1B2E] placeholder-gray-400 bg-white ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-200'
            }`}
            placeholder={'Paste any Korean address here...\n\nExamples:\n• 서교동 395-166\n• Hongdae exit 9 near GS25'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={6}
          />
          {value.length > 0 && !isLoading && (
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-xs transition-colors"
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-500 px-1">{error}</p>}
        <p className="text-xs text-gray-400 px-1">
          Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to convert
        </p>
      </div>

      <button
        onClick={handleSubmit || !mounted}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-[#4D51B1] hover:bg-[#6A37D4] text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Converting...' : 'Convert Address'}
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setValue(ex)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
