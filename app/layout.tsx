import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'FluxStudio - Creative Feedback & Collaboration',
    template: '%s | FluxStudio',
  },
  description: 'A collaborative creative feedback tool for images, video, audio, and 3D models. Streamline your creative workflow with real-time annotations and team collaboration.',
  keywords: ['creative feedback', 'collaboration', 'design review', 'video review', 'audio feedback', '3D model review', 'annotation tool'],
  authors: [{ name: 'FluxStudio Team' }],
  creator: 'FluxStudio',
  publisher: 'FluxStudio',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fluxstudio.io',
    siteName: 'FluxStudio',
    title: 'FluxStudio - Creative Feedback & Collaboration',
    description: 'Streamline your creative workflow with real-time annotations and team collaboration.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FluxStudio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FluxStudio - Creative Feedback & Collaboration',
    description: 'Streamline your creative workflow with real-time annotations and team collaboration.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
