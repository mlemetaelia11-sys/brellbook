'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyEmailForm() {
  const q = useSearchParams();
  const r = useRouter();

  const [msg, setMsg] = useState('Verifying your email…');

  useEffect(() => {
    const token = q.get('token');

    if (!token) {
      setMsg('Verification token is missing.');
      return;
    }

    fetch('/api/verify-email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(async (x) => {
        const d = await x.json();

        setMsg(
          x.ok
            ? 'Email verified successfully.'
            : d.error || 'Verification failed.'
        );

        if (x.ok) {
          setTimeout(() => r.push('/login'), 1200);
        }
      })
      .catch(() => {
        setMsg('Verification failed. Please try again.');
      });
  }, [q, r]);

  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="eyebrow">BrellBook Security</div>
        <h1>{msg}</h1>
      </div>
    </main>
  );
}

function VerifyEmailFallback() {
  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="eyebrow">BrellBook Security</div>
        <h1>Verifying your email…</h1>
      </div>
    </main>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailForm />
    </Suspense>
  );
}