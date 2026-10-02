// src/components/chat/Markdown.tsx
// Renders LLM markdown like a real chat app: styled headings, tables, lists, code blocks.
// npm i react-markdown remark-gfm
'use client';

import React, { memo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded-md border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-400 opacity-0 transition hover:text-white group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre
        ref={ref}
        className="overflow-x-auto p-4 text-[13px] leading-relaxed text-neutral-200 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
      >
        {children}
      </pre>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => <h2 className="mb-3 mt-6 text-lg font-semibold text-white first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mb-2.5 mt-6 text-base font-semibold text-white first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-5 text-[15px] font-semibold text-white first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mb-2 mt-4 text-sm font-semibold text-neutral-200 first:mt-0">{children}</h5>,

  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-neutral-300">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-emerald-400 underline decoration-emerald-400/40 underline-offset-2 hover:decoration-emerald-400">
      {children}
    </a>
  ),

  ul: ({ children }) => <ul className="my-3 space-y-1.5 pl-5 marker:text-emerald-500 [list-style-type:disc]">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-emerald-500">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7 [&>p]:my-0">{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-lg border-l-2 border-emerald-500 bg-emerald-500/5 py-2 pl-4 pr-3 text-neutral-300 [&>p]:my-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-neutral-800" />,

  code: ({ children, className }) => (
    <code className={`rounded-md bg-neutral-800 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-300 ${className ?? ''}`}>{children}</code>
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,

  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-400">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-neutral-800/80">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-neutral-900/60">{children}</tr>,
  th: ({ children }) => <th className="whitespace-nowrap px-3.5 py-2.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3.5 py-2.5 align-top leading-relaxed text-neutral-300">{children}</td>,
};

function MarkdownImpl({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-[15px] text-neutral-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
export default Markdown;
