"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { auth, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<Record<string, string[]> | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrs(null);
    setTopErr(null);
    setBusy(true);
    try {
      await auth.register({
        username,
        email,
        display_name: displayName || undefined,
        password,
        password_confirmation: confirm,
      });
      await refresh();
      router.push("/dashboard");
    } catch (e) {
      const apiErr = e as ApiError;
      if (apiErr.errors) setErrs(apiErr.errors);
      else setTopErr(apiErr.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div>
          <h1 className="font-display font-black text-4xl tracking-tight">
            join the <span className="text-sakura">gallery</span>
          </h1>
          <p className="text-text-secondary mt-2">
            For artists and the people who love them.{" "}
            <span className="text-text-muted">No AI slop.</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="username"
            value={username}
            onChange={setUsername}
            errs={errs?.username}
            placeholder="lowercase, numbers, underscores"
            autoComplete="username"
            autoFocus
          />
          <Field
            label="email"
            type="email"
            value={email}
            onChange={setEmail}
            errs={errs?.email}
            autoComplete="email"
          />
          <Field
            label="display name (optional)"
            value={displayName}
            onChange={setDisplayName}
            errs={errs?.display_name}
            placeholder="how you appear to others"
          />
          <Field
            label="password"
            type="password"
            value={password}
            onChange={setPassword}
            errs={errs?.password}
            autoComplete="new-password"
            hint="at least 8 characters"
          />
          <Field
            label="confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />

          {topErr && (
            <div className="text-sm text-sakura font-mono border border-sakura/40 bg-sakura/10 px-3 py-2">
              {topErr}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-brut disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {busy ? "creating…" : "create account →"}
          </button>
        </form>

        <div className="text-sm text-text-secondary border-t border-border-subtle pt-6">
          have an account?{" "}
          <Link href="/login" className="text-sakura hover:underline">
            log in
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, type = "text", autoComplete, autoFocus, errs, placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  errs?: string[];
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 px-3 bg-bg-surface border ${errs ? "border-sakura" : "border-border-subtle"} text-text-primary focus:border-sakura focus:outline-none transition-colors`}
      />
      {hint && !errs && (
        <span className="text-xs text-text-muted">{hint}</span>
      )}
      {errs?.map((e, i) => (
        <span key={i} className="text-xs text-sakura font-mono">{e}</span>
      ))}
    </label>
  );
}
