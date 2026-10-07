import './globals.css';
import type { Metadata } from 'next';

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),

  title: "BrellBook — Book it. Don't miss it.",
  description:
    'Modern booking and appointment management for growing businesses.',

  icons: {
    icon: '/brellbook-icon.png',
    apple: '/brellbook-icon.png',
  },

  openGraph: {
    title: "BrellBook — Book it. Don't miss it.",
    description:
      'Modern booking and appointment management for growing businesses.',
    url: appUrl,
    siteName: 'BrellBook',
    type: 'website',
    images: ['/brellbook-icon.png'],
  },

  twitter: {
    card: 'summary',
    title: "BrellBook — Book it. Don't miss it.",
    description:
      'Modern booking and appointment management for growing businesses.',
    images: ['/brellbook-icon.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-TZ">
      <body>{children}</body>
    </html>
  );
}