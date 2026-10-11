import type { Metadata, Viewport } from 'next';
import { Poppins, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Supply Connect — Global Supply Chain Intelligence & Risk Telemetry',
    template: '%s · Supply Connect',
  },
  description:
    'Global supply-chain intelligence, real-time disruption monitoring, and AI-powered impact analysis. See disruptions before they reach your business and plan prioritized mitigations.',
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${poppins.variable} ${sourceSerif.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas text-label antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
