import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { title: 'Musikquiz' };
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Grenze+Gotisch:wght@600;800&family=Barlow+Condensed:wght@500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
