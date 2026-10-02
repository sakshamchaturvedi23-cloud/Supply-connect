import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Supply Connect | Global Supply Chain Early Warning & Impact Analysis System",
  description: "Anticipate disruptions before they hit. Real-time AI early warning, downstream ripple effect mapping, what-if simulations, and startup opportunity advisory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-[#090d16] dark:bg-[#050811] dark:text-[#f1f5f9] transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
