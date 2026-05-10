import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Puri (풀이) — Korean Address Converter',
  description: 'Convert any Korean address format to a Naver Map and Kakao Map ready address instantly.',
  keywords: ['Korean address', 'Naver Map', 'Kakao Map', 'foreigner Korea', 'address converter'],
  openGraph: {
    title: 'Puri — Korean Address Converter',
    description: 'Convert any Korean address instantly for Naver Map and Kakao Map',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
