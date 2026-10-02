import Link from 'next/link';

/** Wordmark: three linked nodes — a shock travelling down a supply chain. */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5 rounded-lg" aria-label="Supply Connect home">
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden>
        <rect width="28" height="28" rx="8" fill="#0a84ff" />
        <path d="M8 18.5 14 9.5l6 9" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="18.5" r="2.4" fill="#fff" />
        <circle cx="14" cy="9.5" r="2.4" fill="#fff" />
        <circle cx="20" cy="18.5" r="2.4" fill="#fff" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-label">Supply Connect</span>
    </Link>
  );
}
