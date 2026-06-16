'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, AlertCircle } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth, useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { hydrated, accessToken } = useAuth();
  const setWorkspace = useWorkspace((s) => s.setWorkspace);
  const [status, setStatus] = useState<'idle' | 'working'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace(`/login?next=/invite/${token}`);
    }
  }, [hydrated, accessToken, router, token]);

  const accept = async () => {
    setStatus('working');
    setError('');
    try {
      const { data } = await api.post(`/workspaces/invitations/${token}/accept`);
      setWorkspace(data.id);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(apiErrorMessage(err));
      setStatus('idle');
    }
  };

  if (!hydrated) {
    return <div className="flex h-screen items-center justify-center bg-background"><Spinner className="h-6 w-6" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">You've been invited</h1>
        <p className="mt-1.5 text-sm text-muted">Join this workspace on manaTask to start collaborating.</p>
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-left text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <Button onClick={accept} loading={status === 'working'} size="lg" className="mt-6 w-full">
          Accept invitation
        </Button>
      </div>
    </div>
  );
}
