'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import type { AuthResponse } from '@manatask/shared';
import { api, apiErrorMessage, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { AuthShell } from '@/components/AuthShell';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/input';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      setAuth(data);
      router.replace(data.user.emailVerified ? '/dashboard' : '/verify-email');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.login')}</h1>
        <p className="mt-1.5 text-sm text-muted">Welcome back. Enter your details to continue.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" placeholder="you@company.com" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-accent hover:underline">
              Forgot?
            </Link>
          </div>
          <PasswordInput id="password" leftIcon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {t('auth.login')}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <a
        href={`${API_URL}/auth/google`}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {t('auth.continueGoogle')}
      </a>

      <p className="mt-7 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </AuthShell>
  );
}
