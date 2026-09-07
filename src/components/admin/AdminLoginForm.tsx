'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface AdminLoginFormProps {
  setup: boolean;
}

export default function AdminLoginForm({ setup }: AdminLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (setup && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, setup }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not sign in.');
        return;
      }
      router.replace('/admin/articles');
      router.refresh();
    } catch {
      setError('Network error. Is npm run dev running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login" onSubmit={(e) => void onSubmit(e)}>
      <label className="admin-label" htmlFor="studio-password">
        Password
      </label>
      <input
        id="studio-password"
        className="admin-input"
        type="password"
        autoComplete={setup ? 'new-password' : 'current-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={setup ? 8 : undefined}
        required
      />
      {setup ? (
        <>
          <label className="admin-label mt-4" htmlFor="studio-password-confirm">
            Confirm password
          </label>
          <input
            id="studio-password-confirm"
            className="admin-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </>
      ) : null}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="admin-btn-primary mt-5 w-full"
        disabled={busy}
      >
        {busy ? 'Please wait…' : setup ? 'Create password & enter' : 'Enter studio'}
      </button>
    </form>
  );
}
