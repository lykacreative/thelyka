import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: "lyka mimics",
  description: "hey i am lyka and this is my portfolio"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${newsreader.variable} ${newsreader.className}`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var theme=localStorage.getItem('lyka-theme');if(theme==='dark'||theme==='light'){document.documentElement.dataset.theme=theme;}}catch(e){}"
          }}
        />
        {children}
      </body>
    </html>
  );
}
