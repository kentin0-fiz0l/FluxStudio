import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth';
import { StoreProvider } from '@/components/StoreProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'MetMap - Practice Smarter, Not Harder',
  description: 'Break down songs into sections, track your progress, and master every part with focused practice.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MetMap',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <StoreProvider>
            <div className="min-h-screen flex flex-col">
              {children}
            </div>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
