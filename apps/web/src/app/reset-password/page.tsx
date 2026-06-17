'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Label, PasswordInput } from '@/components/ui/input';
import { Spinner } from '@/components/ui/primitives';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1600);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-muted">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted">Choose a strong password for your account.</p>
      </div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" leftIcon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!token}>Update password</Button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-muted hover:text-foreground">Back to sign in</Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
