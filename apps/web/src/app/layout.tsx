import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ChunkReloader } from '@/components/ChunkReloader';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'manaTask',
  description: 'Plan, track and ship — together.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning className={jakarta.variable}>
      <body className="font-sans">
        <ChunkReloader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
