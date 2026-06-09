import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LivekitRoomProvider } from '@livekit/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VideoConf Platform',
  description: 'A production-grade video conferencing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* LiveKit Room Provider - wraps the entire app to provide room context */}
        <LivekitRoomProvider
          // We'll initialize the room when joining a meeting
          // For now, we'll leave it uninitialized
        >
          {children}
        </LivekitRoomProvider>
      </body>
    </html>
  );
}