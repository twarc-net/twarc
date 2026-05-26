"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { href: "/dashboard",         label: "Overview" },
  { href: "/dashboard/upload",  label: "Upload" },
  { href: "/dashboard/posts",   label: "My posts" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex-1 grid place-items-center text-text-muted font-mono text-sm">
        checking credentials…
      </main>
    );
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 flex flex-col md:flex-row gap-8">
      <aside className="md:w-56 shrink-0">
        <div className="border border-border-subtle bg-bg-surface p-4 mb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono">creator</div>
          <div className="font-display font-black text-lg mt-1">
            {user.display_name ?? user.username}
          </div>
          <div className="text-xs text-text-muted font-mono">@{user.username}</div>
        </div>

        <nav className="flex md:flex-col gap-1">
          {nav.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-2 text-sm border-l-2 transition-colors ${
                  active
                    ? "border-sakura text-text-primary bg-bg-surface"
                    : "border-transparent text-text-secondary hover:text-sakura hover:border-border-strong"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="flex-1 min-w-0">{children}</section>
    </main>
  );
}
