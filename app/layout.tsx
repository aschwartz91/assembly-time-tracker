import type { Metadata } from 'next';
import '@fontsource/inter';
import './globals.css';
import Bridge from '@/lib/bridge';

export const metadata: Metadata = {
  title: 'Assembly app',
  description: 'An Assembly marketplace app.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Bridge />
        {children}
      </body>
    </html>
  );
}
