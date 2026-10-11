import React from 'react';
import Link from 'next/link';
import { ChevronRight, Network, Bot, Sparkles } from 'lucide-react';
import { Card, SectionHeading } from '@/components/ui/Card';

const RESPONSE_TOOLS = [
  {
    href: '/impact-copilot',
    title: 'Impact Copilot',
    description: 'Map global disruptions onto your business tier-by-tier with mitigation playbooks.',
    icon: Network,
    badge: 'Causal Graph',
  },
  {
    href: '/chat',
    title: 'Supply AI',
    description: 'Conversational streaming intelligence for supplier diversification and market risk.',
    icon: Bot,
    badge: 'Streaming RAG',
  },
  {
    href: '/startup-advisor',
    title: 'Strategy Advisor',
    description: 'Turn supply bottlenecks into B2B software and logistics venture opportunities.',
    icon: Sparkles,
    badge: 'Opportunity Engine',
  },
];

export function QuickActions() {
  return (
    <section className="min-w-0">
      <SectionHeading title="Plan a response" description="Autonomous AI intelligence workflows" />
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {RESPONSE_TOOLS.map(({ href, title, description, icon: Icon, badge }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-surface-elevated group"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-accent/20 bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors mt-0.5">
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-label group-hover:text-white transition-colors">
                      {title}
                    </span>
                    <span className="rounded px-1.5 py-0.2 text-[10px] font-mono font-medium bg-surface-3 text-label-3 border border-line">
                      {badge}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-label-3 leading-relaxed">
                    {description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-label-3 group-hover:text-label transition-colors mt-1" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

