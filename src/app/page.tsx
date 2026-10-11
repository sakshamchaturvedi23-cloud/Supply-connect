import { LandingHero } from '@/components/landing/LandingHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Supply Connect — Global Supply Chain Intelligence',
  description:
    'AI-powered supply-chain intelligence for a world in motion. Interactive global risk radar, impact copilot, and predictive disruption telemetry.',
};

export default function LandingPage() {
  return <LandingHero />;
}
