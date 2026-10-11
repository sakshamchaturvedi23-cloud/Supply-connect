import React from 'react';

export function StreamingIndicator({ text = 'Supply AI is generating...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono text-label-3" aria-live="polite">
      <div className="flex items-center gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
      <span>{text}</span>
    </div>
  );
}

