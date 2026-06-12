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
    icon: [
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    shortcut: "/assets/favicon.ico",
    apple: "/assets/apple-icon.png"
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
