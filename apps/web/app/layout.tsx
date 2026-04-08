import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'sonner';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
});

export const metadata: Metadata = {
  title: 'Tools Act — ระบบจัดการเช่าเครื่องจักร',
  description: 'Equipment Rental Management System for Tools Act',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${figtree.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: 'Figtree, system-ui, sans-serif' }}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
