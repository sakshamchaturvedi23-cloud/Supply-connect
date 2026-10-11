import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'Supply Connect — supply chain early warning',
    template: '%s · Supply Connect',
  },
  description:
    'See global supply chain disruptions early, understand how they reach your business, and plan a response with AI.',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
