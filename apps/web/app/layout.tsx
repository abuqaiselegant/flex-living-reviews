import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flex Living Reviews Dashboard',
  description: 'Multi-source review management system for vacation rentals',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
