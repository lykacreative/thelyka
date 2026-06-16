import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import { ThemeInit } from '@/components/ThemeInit';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
});

const siteUrl = process.env.SITE_URL || 'https://lykamimics.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Lyka Mimics',
    template: '%s · Lyka Mimics',
  },
  description: 'hey i am lyka and this is my portfolio',
  openGraph: {
    title: 'Lyka Mimics',
    description: 'hey i am lyka and this is my portfolio',
    url: siteUrl,
    siteName: 'Lyka Mimics',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyka Mimics',
    description: 'hey i am lyka and this is my portfolio',
  },
  icons: {
    icon: "/assets/favicon.svg",
    apple: "/assets/favicon.svg"
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <body className={`${newsreader.variable} ${newsreader.className}`}>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
