'use client';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm text-gray-500">Converting address...</p>
    </div>
  );
}
