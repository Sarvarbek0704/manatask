'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';

const LEN = 6;

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LEN).split('').slice(0, LEN);

  const setAt = (i: number, d: string) => {
    const next = value.split('');
    next[i] = d;
    onChange(next.join('').slice(0, LEN).replace(/\s/g, ''));
  };

  return (
    <div className="flex justify-center gap-2" onPaste={(e) => {
      const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
      if (txt) { e.preventDefault(); onChange(txt); refs.current[Math.min(txt.length, LEN - 1)]?.focus(); }
    }}>
      {Array.from({ length: LEN }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i]?.trim() ?? ''}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            if (!d && e.target.value !== '') return;
            setAt(i, d || ' ');
            if (d && i < LEN - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          className={cn(
            'h-13 w-11 rounded-lg border bg-surface text-center text-xl font-semibold text-foreground transition-colors',
            'border-input focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
            'h-12',
          )}
        />
      ))}
    </div>
  );
}

function Verify() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const { user, accessToken, hydrated, setUser, clear } = useAuth();
  const linkToken = params.get('token');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [linkState, setLinkState] = useState<'idle' | 'ok' | 'error'>('idle');

  // Not logged in (and no legacy link token) → go to login.
  useEffect(() => {
    if (hydrated && !accessToken && !linkToken) router.replace('/login');
  }, [hydrated, accessToken, linkToken, router]);

  // Already verified → straight to the app.
  useEffect(() => {
    if (user?.emailVerified) router.replace('/dashboard');
  }, [user, router]);

  // Legacy magic-link path.
  useEffect(() => {
    if (!linkToken) return;
    api.post('/auth/verify-email', { token: linkToken })
      .then(() => { setLinkState('ok'); setTimeout(() => router.replace('/dashboard'), 1200); })
      .catch(() => setLinkState('error'));
  }, [linkToken, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (value = code) => {
    if (value.length !== LEN) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/verify-otp', { code: value });
      if (data?.user) setUser(data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await api.post('/auth/resend-verification');
      setCooldown(45);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const signOut = () => { clear(); router.replace('/login'); };

  if (linkToken) {
    return (
      <div className="text-center">
        {linkState === 'idle' && <div className="flex flex-col items-center gap-3 py-6"><Spinner className="h-6 w-6" /><p className="text-sm text-muted">Verifying…</p></div>}
        {linkState === 'ok' && <p className="text-sm text-success">Email verified. Redirecting…</p>}
        {linkState === 'error' && <p className="text-sm text-danger">This link is invalid or expired. Sign in to get a new code.</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="mt-1.5 text-sm text-muted">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{user?.email ?? 'your email'}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === LEN) submit(v); }} disabled={loading} />

      <Button onClick={() => submit()} loading={loading} disabled={code.length !== LEN} size="lg" className="mt-6 w-full">
        Verify
      </Button>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button onClick={signOut} className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Sign out
        </button>
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline disabled:text-muted disabled:no-underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
        <Verify />
      </Suspense>
    </AuthShell>
  );
}
