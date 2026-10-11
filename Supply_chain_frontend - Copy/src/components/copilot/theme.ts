import { AlertOctagon, Layers, Target, type LucideIcon } from 'lucide-react';
import type { LevelKey } from '@/lib/impact-schema';

/** Monochrome liquid-glass hierarchy: Level 1 (Global shock), Level 2 (Regional ripple), Level 3 (Your business). */
export const LEVEL_THEME: Record<LevelKey, { label: string; name: string; hex: string; text: string; ring: string; Icon: LucideIcon }> = {
  macro: { label: 'Level 1', name: 'Global shock', hex: '#FFFFFF', text: 'text-white', ring: 'ring-white/30', Icon: AlertOctagon },
  regional: { label: 'Level 2', name: 'Regional ripple', hex: '#D4D4D8', text: 'text-white/80', ring: 'ring-white/20', Icon: Layers },
  direct: { label: 'Level 3', name: 'Your business', hex: '#A1A1AA', text: 'text-white/90', ring: 'ring-white/25', Icon: Target },
};
