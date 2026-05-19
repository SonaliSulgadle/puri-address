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
            className="w-full rounded-xl border-2 p-4 pr-10 text-base resize-none focus:outline-none transition-colors text-[#1A1C1A] bg-white"
            style={{
              borderColor: error ? '#8B3A3A' : value ? '#5C8A6E' : '#C1C8C1',
            }}
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
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors"
              style={{ backgroundColor: '#E8EDE8', color: '#424942' }}
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>
        {error && <p className="text-sm px-1" style={{ color: '#8B3A3A' }}>{error}</p>}
        <p className="text-xs px-1" style={{ color: '#727972' }}>
          Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to convert
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !mounted}
        className="w-full py-3 rounded-xl text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #5C8A6E 0%, #3E5C49 100%)' }}
      >
        {isLoading ? 'Converting...' : 'Convert Address'}
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#727972' }}>
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setValue(ex)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-full border bg-white transition-colors disabled:opacity-60"
              style={{ borderColor: '#C1C8C1', color: '#424942' }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.borderColor = '#5C8A6E';
                (e.target as HTMLButtonElement).style.color = '#3E5C49';
                (e.target as HTMLButtonElement).style.backgroundColor = '#DCE6DE';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.borderColor = '#C1C8C1';
                (e.target as HTMLButtonElement).style.color = '#424942';
                (e.target as HTMLButtonElement).style.backgroundColor = 'white';
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
