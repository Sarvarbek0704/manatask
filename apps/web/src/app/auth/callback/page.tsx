'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Spinner } from '@/components/ui/primitives';

function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (!accessToken || !refreshToken) {
      router.replace('/login');
      return;
    }
    (async () => {
      setAuth({ accessToken, refreshToken });
      try {
        const { data } = await api.get('/users/me');
        useAuth.getState().setUser(data);
      } catch {
        /* ignore */
      }
      router.replace('/dashboard');
    })();
  }, [params, router, setAuth]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner /></div>}>
      <Callback />
    </Suspense>
  );
}
