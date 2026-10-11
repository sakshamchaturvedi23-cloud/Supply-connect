import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { cn } from './cn';

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const sizeStyles = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  };

  const statusStyles = {
    online: 'bg-low',
    busy: 'bg-critical',
    offline: 'bg-label-3',
  };

  const getInitials = (str?: string) => {
    if (!str) return '';
    const parts = str.trim().split(/[\s._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || str[0]?.toUpperCase() || '';
  };

  const initials = getInitials(name);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'grid place-items-center rounded-lg border border-line bg-surface-elevated font-semibold text-label overflow-hidden select-none',
          sizeStyles[size],
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UserIcon className="h-1/2 w-1/2 text-label-2" strokeWidth={1.8} />
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas',
            statusStyles[status],
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

