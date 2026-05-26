"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auth, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await auth.login({ login, password });
      await refresh();
      router.push("/dashboard");
    } catch (e) {
      const apiErr = e as ApiError;
      setErr(apiErr.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div>
          <h1 className="font-display font-black text-4xl tracking-tight">
            welcome <span className="text-sakura">back</span>
          </h1>
          <p className="text-text-secondary mt-2">Log in to keep building your gallery.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="username or email"
            value={login}
            onChange={setLogin}
            autoFocus
            autoComplete="username"
          />
          <Field
            label="password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {err && (
            <div className="text-sm text-sakura font-mono border border-sakura/40 bg-sakura/10 px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !login || !password}
            className="btn-brut disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {busy ? "logging in…" : "log in →"}
          </button>
        </form>

        <div className="text-sm text-text-secondary border-t border-border-subtle pt-6">
          new here?{" "}
          <Link href="/register" className="text-sakura hover:underline">
            create an account
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, type = "text", autoComplete, autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 px-3 bg-bg-surface border border-border-subtle text-text-primary focus:border-sakura focus:outline-none transition-colors"
      />
    </label>
  );
}
