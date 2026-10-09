"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setError(
          "Sign-in failed. Check your email and password. If you have not verified your email, request a new verification link below.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setResendBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Email verification is temporarily unavailable.",
        );
        return;
      }

      setNotice(
        data.message ||
          "If your account needs verification, check your inbox and spam folder.",
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>

      {error && (
        <p style={{ color: "#FF5A4E", fontSize: 13 }} role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p style={{ fontSize: 13 }} role="status">
          {notice}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={busy || resendBusy}
      >
        {busy ? "Signing in…" : "Log in"}
      </button>

      <button
        type="button"
        className="btn"
        style={{ width: "100%", marginTop: 10 }}
        onClick={resendVerification}
        disabled={busy || resendBusy}
      >
        {resendBusy ? "Requesting…" : "Resend verification email"}
      </button>
    </form>
  );
}