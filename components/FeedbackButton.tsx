'use client';

import { useState } from 'react';

const TALLY_URL = 'https://tally.so/r/81AWlz';

export default function FeedbackButton() {
  const [tooltip, setTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 flex flex-col items-end gap-2 z-50">
      {tooltip && (
        <div className="bg-[#1A1B2E] text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-[180px] text-center leading-snug">
          Got a wrong result? Tell us and we will fix it.
        </div>
      )}
      
      <a  href={TALLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#4D51B1] hover:bg-[#6A37D4] text-white text-sm font-semibold shadow-lg transition-colors"
      >
        <span>&#128172;</span>
        <span>Feedback</span>
      </a>
    </div>
  );
}
