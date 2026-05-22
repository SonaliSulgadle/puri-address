'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';

const TALLY_URL = 'https://tally.so/r/81AWlz';

export default function FeedbackButton() {
  const [tooltip, setTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 flex flex-col items-end gap-2 z-50">
      {tooltip && (
        <div
          className="text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-[180px] text-center leading-snug"
          style={{ backgroundColor: '#1A1C1A' }}
        >
          Got a wrong result? Tell us and we will fix it.
        </div>
      )}

      <a
        href={TALLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('feedback_clicked')}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg transition-colors"
        style={{ background: 'linear-gradient(135deg, #5C8A6E 0%, #3E5C49 100%)' }}
      >
        <span>&#128172;</span>
        <span>Feedback</span>
      </a>
    </div>
  );
}
