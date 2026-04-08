'use client';

import { useAuth } from '@/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 rounded mx-auto mb-3 flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: '#00897b' }}
          >
            TA
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}
