import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthUser } from '@/lib/auth';
import { Menu, X, ArrowRight } from 'lucide-react';

export function LandingHeader() {
  const { user } = useAuthUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/explore', label: 'Disruption Radar' },
    { href: '/impact-copilot', label: 'Impact Copilot' },
    { href: '/chat', label: 'Supply AI' },
    { href: '/startup-advisor', label: 'Strategy Advisor' },
  ];

  return (
    <header className="w-full max-w-[1520px] mx-auto px-6 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex items-center justify-between z-40 select-none">
      {/* Brand / Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 group outline-none"
        aria-label="Supply Connect Home"
      >
        <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-[#051e18]/70 border border-teal-500/30 group-hover:border-teal-400/60 transition-colors shadow-sm shadow-[#02130e]/50">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-teal-400 fill-none stroke-current" strokeWidth="1.8">
            <circle cx="6" cy="17" r="2.5" className="fill-teal-400/20" />
            <circle cx="12" cy="7" r="2.5" className="fill-teal-400/20" />
            <circle cx="18" cy="17" r="2.5" className="fill-teal-400/20" />
            <path d="M7.8 15.3l3-6.6 3 6.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#EDF7F2] group-hover:text-white transition-colors">
            Supply Connect
          </span>
          <span className="text-[10px] tracking-wider uppercase font-mono text-teal-400/70 -mt-0.5">
            Global Intelligence
          </span>
        </div>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#061f19]/65 border border-teal-500/15 backdrop-blur-md shadow-lg shadow-black/20">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3.5 py-1 text-[13px] font-medium text-[#B2D6C5] hover:text-white transition-colors rounded-full hover:bg-teal-500/10"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Action / Auth Buttons */}
      <div className="hidden sm:flex items-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#E2F4EB] text-[#031914] hover:bg-white transition-all shadow-md shadow-[#02130e]/30 hover:scale-[1.02]"
          >
            <span>Console Overview</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#C1E2D2] hover:text-white hover:bg-teal-500/10 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#E2F4EB] text-[#031914] hover:bg-white transition-all shadow-md shadow-[#02130e]/30 hover:scale-[1.02]"
            >
              <span>Explore Platform</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden p-2 rounded-lg text-[#C1E2D2] hover:text-white hover:bg-teal-500/10"
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-4 top-20 z-50 rounded-2xl bg-[#051c17]/95 border border-teal-500/25 p-5 shadow-2xl backdrop-blur-xl">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#D8ECE0] hover:text-white rounded-lg hover:bg-teal-500/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-teal-500/20 flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-xs font-semibold bg-[#E2F4EB] text-[#031914] hover:bg-white transition-colors"
              >
                Enter Supply Connect
              </Link>
              {!user && (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-medium text-[#B2D6C5] hover:text-white"
                >
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
