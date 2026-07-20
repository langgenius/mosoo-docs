import { DM_Sans, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/provider';
import type { Metadata } from 'next';
import './global.css';

// Body & UI — calm neo-grotesque
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

// Display — warm, soft headings
const display = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Code
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mosoo.ai'),
  title: {
    default: 'Mosoo Docs',
    template: '%s | Mosoo Docs',
  },
  description: 'Developer documentation for calling published Mosoo Agents through the API.',
  icons: {
    icon: '/docs/images/brand/favicon.svg',
  },
  openGraph: {
    siteName: 'Mosoo Docs',
    type: 'website',
    url: '/docs/',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
