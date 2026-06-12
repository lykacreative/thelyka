import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
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
    default: 'lyka mimics',
    template: '%s · lyka mimics',
  },
  description: 'hey i am lyka and this is my portfolio',
  openGraph: {
    title: 'lyka mimics',
    description: 'hey i am lyka and this is my portfolio',
    url: siteUrl,
    siteName: 'lyka mimics',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'lyka mimics',
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
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var theme=localStorage.getItem('lyka-theme');if(theme==='dark'||theme==='light'){document.documentElement.dataset.theme=theme;}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
