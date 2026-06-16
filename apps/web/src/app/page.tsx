'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { Spinner } from '@/components/ui/primitives';

export default function Home() {
  const router = useRouter();
  const { hydrated, accessToken } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hydrated, accessToken, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}
