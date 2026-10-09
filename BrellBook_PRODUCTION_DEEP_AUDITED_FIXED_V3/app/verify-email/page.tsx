"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function verify() {
      if (!token) {
        setMessage("Verification link is missing or invalid.");
        return;
      }

      try {
        const response = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!active) return;

        if (!response.ok) {
          setMessage(
            data.error || "This verification link is invalid or has expired.",
          );
          return;
        }

        setMessage("Email verified successfully. Redirecting to login…");
        timer = setTimeout(() => {
          if (active) router.push("/login");
        }, 1200);
      } catch {
        if (active) {
          setMessage("Network error. Please open the verification link again.");
        }
      }
    }

    void verify();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [token, router]);

  return (
    <main className="auth">
      <div className="auth-card card">
        <div className="eyebrow">BrellBook Security</div>
        <h1>{message}</h1>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="auth">Loading…</main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}