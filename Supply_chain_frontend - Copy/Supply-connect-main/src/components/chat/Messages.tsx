'use client';

import React, { useState } from 'react';
import { Check, Copy, Cpu, RotateCcw, Sparkles } from 'lucide-react';
import Markdown from '@/components/chat/Markdown';
import { splitFollowups } from '@/lib/chat/stream';

export function UserBubble({ children, attachment }: { children?: React.ReactNode; attachment?: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end gap-2 sm:max-w-[75%]">
        {attachment}
        {children && (
          <div className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed text-label">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex h-7 items-center gap-1" aria-label="Supply AI is writing">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-label-3" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  );
}

export function AssistantMessage({
  content,
  error,
  streaming,
  isLast,
  canAct,
  modelUsed,
  hideActions,
  onRegenerate,
  onFollowup,
}: {
  content: string;
  error?: boolean;
  streaming?: boolean;
  isLast?: boolean;
  canAct?: boolean;
  modelUsed?: string;
  /** For canned intro messages that don't need copy/regenerate. */
  hideActions?: boolean;
  onRegenerate?: () => void;
  onFollowup?: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { body, followups } = splitFollowups(content);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        {streaming && !body ? (
          <TypingDots />
        ) : error ? (
          <p className="rounded-2xl bg-critical/10 px-4 py-3 text-sm text-critical">{body}</p>
        ) : (
          <Markdown content={body} />
        )}

        {!streaming && body && !hideActions && (
          <div className="mt-2 flex items-center gap-1 text-label-3">
            <button onClick={copy} className="rounded-full p-1.5 transition-colors hover:bg-surface hover:text-label" aria-label="Copy reply">
              {copied ? <Check className="h-3.5 w-3.5 text-low" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {isLast && canAct && onRegenerate && (
              <button onClick={onRegenerate} className="rounded-full p-1.5 transition-colors hover:bg-surface hover:text-label" aria-label="Regenerate reply">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {modelUsed && (
              <span className="ml-1 flex items-center gap-1 text-[11px]">
                <Cpu className="h-3 w-3" /> {modelUsed}
              </span>
            )}
          </div>
        )}

        {isLast && canAct && onFollowup && followups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {followups.map((q) => (
              <button
                key={q}
                onClick={() => onFollowup(q)}
                className="rounded-full px-3.5 py-1.5 text-[13px] text-label-2 ring-1 ring-line transition-colors hover:bg-surface hover:text-label"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
