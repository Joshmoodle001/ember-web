"use client";

import { useState, type FormEvent } from "react";
import { passwordLoginNextPath } from "@/lib/password-login";

type LoginMode = "password" | "email";
type LoginFormProps = { mode?: LoginMode };

function responseField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[key];
}

function responseMessage(value: unknown, fallback: string) {
  const error = responseField(value, "error");
  return typeof error === "string" ? error : fallback;
}

function PasswordLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(result, "Email or password is incorrect."));
      if (responseField(result, "next") !== passwordLoginNextPath) throw new Error("Sign-in could not be completed. Please try again.");
      setPassword("");
      window.location.assign(passwordLoginNextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in is temporarily unavailable. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form className="form-stack" onSubmit={submit}>
        <label className="field" htmlFor="staff-email">
          Work email
          <input disabled={pending} id="staff-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field" htmlFor="staff-password">
          Password
          <input disabled={pending} id="staff-password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {message ? <p className="form-message error" role="alert">{message}</p> : null}
        <button className="button button-primary" type="submit" disabled={pending || !email.trim() || !password}>
          {pending ? "Signing in…" : "Sign in with password"}
        </button>
      </form>
      <p className="micro-note">Password access is limited to approved EmberWeb staff accounts. Your password is used only to sign in and is not saved by this workspace.</p>
      <a className="quiet-link" href="https://portal.emberweb.co.za/login?method=email">Use an email sign-in link instead</a>
    </>
  );
}

function EmailLinkLoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(result, "Sign-in is temporarily unavailable."));
      const message = responseField(result, "message");
      setMessage(typeof message === "string"
        ? message
        : "If this address is eligible for workspace access, a one-time sign-in link will be sent when the request is accepted.");
    } catch (requestError) {
      setError(true);
      setMessage(requestError instanceof Error ? requestError.message : "We couldn’t send a sign-in link. Check the address and workspace configuration, then try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form className="form-stack" onSubmit={submit}>
        <label className="field" htmlFor="staff-email">
          Work email
          <input disabled={pending} id="staff-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button className="button button-primary" type="submit" disabled={pending || !email.trim()}>
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </button>
        <p className={`form-message${error ? " error" : ""}`} aria-live="polite">{message}</p>
        <p className="micro-note">Workspace access is limited to the approved staff list. A valid email link alone does not grant access.</p>
      </form>
      <a className="quiet-link" href="https://emberweb.co.za/login">Use password sign-in instead</a>
    </>
  );
}

export default function LoginForm({ mode = "password" }: LoginFormProps) {
  return mode === "email" ? <EmailLinkLoginForm /> : <PasswordLoginForm />;
}
