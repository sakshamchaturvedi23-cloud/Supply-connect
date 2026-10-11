import { Bot, Compass, Home, Network, Sparkles, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; description: string };

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Home, description: 'Today’s risk picture' },
  { href: '/explore', label: 'Disruption Radar', icon: Compass, description: 'Live global risk signals' },
  { href: '/impact-copilot', label: 'Impact Copilot', icon: Network, description: 'How a shock reaches your business' },
  { href: '/chat', label: 'Supply AI', icon: Bot, description: 'Ask anything about supply chains' },
  { href: '/startup-advisor', label: 'Strategy Advisor', icon: Sparkles, description: 'AI crisis mitigation & response' },
];

export function isActivePath(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`);
}

