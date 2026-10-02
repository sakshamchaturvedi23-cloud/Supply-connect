import { AlertTriangle, Target, Zap, type LucideIcon } from 'lucide-react';
import type { LevelKey } from '@/lib/impact-schema';

/** Level 1 = the shock (red), Level 2 = the ripple (orange), Level 3 = you (accent blue). */
export const LEVEL_THEME: Record<LevelKey, { label: string; name: string; hex: string; text: string; ring: string; Icon: LucideIcon }> = {
  macro: { label: 'Level 1', name: 'Global shock', hex: '#ff453a', text: 'text-critical', ring: 'ring-critical/25', Icon: AlertTriangle },
  regional: { label: 'Level 2', name: 'Regional ripple', hex: '#ff9f0a', text: 'text-high', ring: 'ring-high/25', Icon: Zap },
  direct: { label: 'Level 3', name: 'Your business', hex: '#0a84ff', text: 'text-accent', ring: 'ring-accent/25', Icon: Target },
};
