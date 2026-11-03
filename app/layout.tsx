import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import { THEME_SCRIPT } from '@/lib/site/theme-script';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
  preload: false, // the admin's face; the public site brings its own (app/(site)/layout.tsx)
});

const siteUrl = process.env.SITE_URL || 'https://www.lykamimics.com';

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
  // Day or night is set before the first paint (a saved choice, else the system's), so the page never flashes.
  return (
    <html
      lang='en'
      data-scroll-behavior='smooth'
      suppressHydrationWarning
    >
      <head>
        <meta name='color-scheme' content='light dark' suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={newsreader.variable}>
        {children}
      </body>
    </html>
  );
}
