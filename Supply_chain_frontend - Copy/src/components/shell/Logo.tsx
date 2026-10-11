import Link from 'next/link';

export function Logo({ onClick, href = '/' }: { onClick?: () => void; href?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg group focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none transition-all"
      aria-label="Supply Connect home"
    >
      <div className="relative flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 border border-white/20 shadow-inner">
        <svg viewBox="0 0 28 28" className="h-5 w-5" aria-hidden>
          <path d="M8 18.5 14 9.5l6 9" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="18.5" r="2.5" fill="#fff" />
          <circle cx="14" cy="9.5" r="2.5" fill="#fff" />
          <circle cx="20" cy="18.5" r="2.5" fill="#fff" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-[14px] font-medium tracking-tight text-white group-hover:text-white/90 transition-colors">
          Supply Connect
        </span>
      </div>
    </Link>
  );
}
