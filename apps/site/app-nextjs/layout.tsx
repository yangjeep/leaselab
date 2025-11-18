import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Welcome to Rent-In-Ottawa!',
  description: 'Demo rental listings site (Next.js + Google Sheets)',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <div className="container h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">Welcome to Rent-In-Ottawa!</Link>
            <nav className="flex gap-4 text-sm">
              <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
        <footer className="border-t border-white/10 mt-12">
          <div className="container py-8 text-sm opacity-70">
            © {new Date().getFullYear()} Welcome to Rent-In-Ottawa!
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
