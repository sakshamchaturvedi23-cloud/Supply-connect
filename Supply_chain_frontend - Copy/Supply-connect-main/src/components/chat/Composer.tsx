'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ArrowUp, Square } from 'lucide-react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  streaming: boolean;
  placeholder: string;
  footnote?: React.ReactNode;
};

/** Auto-growing chat input. Enter sends, Shift+Enter adds a line. */
export const Composer = forwardRef<HTMLTextAreaElement | null, Props>(function Composer(
  { value, onChange, onSend, onStop, streaming, placeholder, footnote },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

  useEffect(() => {
    const ta = inner.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <div className="px-4 pb-4 pt-2 sm:px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-[26px] bg-surface p-2 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-accent/60"
      >
        <textarea
          ref={inner}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-label outline-none placeholder:text-label-3"
        />
        {streaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-label text-canvas transition-opacity hover:opacity-85"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || streaming}
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:bg-surface-3 disabled:text-label-3"
          >
            <ArrowUp className="h-[18px] w-[18px]" />
          </button>
        )}
      </form>
      {footnote && <p className="mx-auto mt-2 max-w-3xl text-center text-[12px] text-label-3">{footnote}</p>}
    </div>
  );
});
