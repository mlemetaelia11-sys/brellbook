"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupForm() {
  const [v, setV] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  async function resendVerification() {
    setResendBusy(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: v.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not request a verification email.");
      } else {
        setNotice(data.message || "Check your inbox and spam folder.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendBusy(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }

      setEmailSent(Boolean(data.emailSent));
      setCreated(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
  return (
    <div className="signup-success">
      <h2>Account created</h2>

      <p>
        {emailSent
          ? `We sent a verification link to ${v.email}. Check your inbox and spam folder.`
          : `Your account was created, but we could not confirm that a verification email was sent to ${v.email}. Request a new link below.`}
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={resendBusy}
        onClick={resendVerification}
      >
        {resendBusy ? "Requesting…" : "Resend verification email"}
      </button>

      <p>
        After verifying your email, continue to <Link href="/login">login</Link>.
      </p>
    </div>
  );
}

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="signup-name">Full name</label>
        <input
          id="signup-name"
          autoComplete="name"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          minLength={2}
          maxLength={100}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          autoComplete="email"
          value={v.email}
          onChange={(e) => setV({ ...v, email: e.target.value })}
          type="email"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="signup-phone">Phone / WhatsApp</label>
        <input
          id="signup-phone"
          autoComplete="tel"
          value={v.phone}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
          placeholder="2557XXXXXXXX"
          minLength={9}
          maxLength={30}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          autoComplete="new-password"
          value={v.password}
          onChange={(e) => setV({ ...v, password: e.target.value })}
          type="password"
          minLength={8}
          maxLength={128}
          required
        />
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%" }}
        disabled={busy}
      >
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}