import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'SecureVault Password Manager',
  description: 'A zero-knowledge cloud-based password manager with client-side encryption.',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SecureVault',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
