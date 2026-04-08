'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      const from = searchParams.get('from') ?? '/dashboard';
      router.replace(from);
      toast.success('Signed in successfully');
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#f5f6f8' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
            style={{ backgroundColor: '#0f3d47' }}
          >
            TA
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f3d47' }}>Tools Act</h1>
          <p className="text-sm mt-1" style={{ color: '#676879' }}>Equipment Rental Management</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-6 space-y-4"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
        >
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@toolsact.co.th"
              className="w-full border rounded px-3 py-2 text-sm outline-none transition-colors"
              style={{
                borderColor: '#e6e9ef',
                height: 36,
                borderRadius: 4,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00897b')}
              onBlur={(e) => (e.target.style.borderColor = '#e6e9ef')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#323338' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full border rounded px-3 py-2 text-sm outline-none transition-colors"
              style={{
                borderColor: '#e6e9ef',
                height: 36,
                borderRadius: 4,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00897b')}
              onBlur={(e) => (e.target.style.borderColor = '#e6e9ef')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2 rounded transition-colors disabled:opacity-60"
            style={{
              backgroundColor: loading ? '#006b5e' : '#00897b',
              borderRadius: 4,
              height: 38,
              fontSize: 14,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#e0f2f1', color: '#006b5e' }}>
          <p className="font-semibold mb-1">Demo accounts (shared with xCRM):</p>
          <p>admin@demo.com · Admin123!</p>
          <p>manager@demo.com · Manager123!</p>
          <p>pm.heavy@demo.com · PM123!</p>
          <p>rep1@demo.com · Rep123!</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
