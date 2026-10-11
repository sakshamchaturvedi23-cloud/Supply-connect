'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export function MagicLinkForm({
  email,
  onEmailChange,
  onSubmit,
  sending,
  disabled,
}: {
  email: string;
  onEmailChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  sending: boolean;
  disabled: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="email" className="sr-only">
        Work Email address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="name@company.com"
        disabled={disabled}
        className="h-10 w-full rounded-xl liquid-glass px-3.5 text-sm text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-white/30 disabled:opacity-60 shadow-sm"
      />
      <Button
        type="submit"
        size="md"
        variant="primary"
        loading={sending}
        className="w-full font-medium"
        disabled={disabled || !email.trim()}
      >
        {sending ? 'Dispatching link...' : 'Email magic link'}
      </Button>
    </form>
  );
}

