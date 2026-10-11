import React from 'react';
import { Card } from '@/components/ui/Card';

export function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md liquid-glass-strong rounded-3xl p-8 sm:p-10 shadow-2xl">
      {children}
    </div>
  );
}

