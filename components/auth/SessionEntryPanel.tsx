"use client";

import { FormEvent, useEffect, useState } from "react";

type SessionResponse = {
  data?: {
    id: string;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
  };
  error?: {
    message?: string;
  };
};

export default function SessionEntryPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkExistingSession() {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (response.ok) {
        window.location.href = "/dashboard";
      }
    }

    void checkExistingSession();
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json().catch(() => null)) as SessionResponse | null;
    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "Unable to sign in.");
      setIsLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <section className="mt-10 max-w-xl rounded-[28px] border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">
        Sign in to workspace
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Minimal app-owned authentication using an existing user email and password.
      </p>

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <form onSubmit={handleSignIn} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@company.com"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          required
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 sm:justify-self-start"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
