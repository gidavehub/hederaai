// /app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // <-- THIS IS THE CRITICAL IMPORT

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hedera AI Assistant',
  description: 'An intelligent, conversational AI for the Hedera ecosystem.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}