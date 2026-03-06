import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'SecureVault Password Manager',
  description: 'A zero-knowledge cloud-based password manager with client-side encryption.',
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
