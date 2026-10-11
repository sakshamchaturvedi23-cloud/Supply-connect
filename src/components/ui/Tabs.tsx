'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from './cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  trackClassName = 'bg-surface-elevated',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  trackClassName?: string;
}) {
  return (
    <div className={cn('-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0', className)}>
      <div
        role="tablist"
        aria-label={label}
        className={cn('inline-flex items-center gap-1 rounded-lg border border-line p-1 shadow-sm', trackClassName)}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex h-7 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-all select-none',
                active
                  ? 'bg-surface-3 text-label shadow-xs font-semibold'
                  : 'text-label-2 hover:bg-surface-hover hover:text-label',
              )}
            >
              {o.icon}
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.2 text-[10px] font-mono tabular-nums',
                    active ? 'bg-surface-2 text-label font-medium' : 'bg-surface text-label-3',
                  )}
                >
                  {o.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Full Tab System context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeTab = value !== undefined ? value : internalValue;
  const setActiveTab = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 border-b border-line pb-px overflow-x-auto', className)}
    >
      {children}
    </div>
  );
}

export function TabTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabTrigger must be used inside Tabs');
  const active = ctx.activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setActiveTab(value)}
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors select-none -mb-px',
        active
          ? 'text-label border-b-2 border-accent font-semibold'
          : 'text-label-2 hover:text-label border-b-2 border-transparent',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabContent must be used inside Tabs');
  if (ctx.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn('pt-4', className)}>
      {children}
    </div>
  );
}

