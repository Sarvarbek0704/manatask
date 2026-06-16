'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Building2, ArrowRight, AlertCircle } from 'lucide-react';
import type { AuthResponse } from '@manatask/shared';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', workspaceName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { ...form, locale });
      setAuth(data);
      // New accounts must confirm their email via a 6-digit code first.
      router.replace('/verify-email');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const fields = [
    { key: 'name' as const, label: t('auth.name'), icon: User, type: 'text', placeholder: 'Jane Cooper' },
    { key: 'email' as const, label: t('auth.email'), icon: Mail, type: 'email', placeholder: 'you@company.com' },
    { key: 'password' as const, label: t('auth.password'), icon: Lock, type: 'password', placeholder: '••••••••' },
    { key: 'workspaceName' as const, label: t('auth.workspaceName'), icon: Building2, type: 'text', placeholder: 'Acme Inc.' },
  ];

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.register')}</h1>
        <p className="mt-1.5 text-sm text-muted">Create your account and workspace in seconds.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <div className="relative">
              <f.icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id={f.key}
                type={f.type}
                value={form[f.key]}
                onChange={set(f.key)}
                required
                minLength={f.key === 'password' ? 8 : undefined}
                className="pl-9"
                placeholder={f.placeholder}
              />
            </div>
          </div>
        ))}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {t('auth.register')}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </AuthShell>
  );
}
