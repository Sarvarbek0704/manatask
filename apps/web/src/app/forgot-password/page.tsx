'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on its way.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
            <p className="mt-1.5 text-sm text-muted">Enter your email and we'll send a reset link.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" placeholder="you@company.com" />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
          </form>
          <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </>
      )}
    </AuthShell>
  );
}
