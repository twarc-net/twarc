"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { href: "/admin",            label: "Overview",   icon: "◆" },
  { href: "/admin/moderate",   label: "Mod queue",  icon: "▲" },
  { href: "/admin/blog",       label: "Blog queue", icon: "✎" },
  { href: "/admin/anime",      label: "Anime",      icon: "⊛" },
  { href: "/admin/characters", label: "Characters", icon: "✿" },
  { href: "/admin/tags",       label: "Other tags", icon: "#" },
  { href: "/admin/users",      label: "Users",      icon: "@" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isStaff) router.replace("/dashboard");
  }, [loading, user, isStaff, router]);

  if (loading || !user || !isStaff) {
    return (
      <main className="flex-1 grid place-items-center text-text-muted font-mono text-sm">
        verifying admin access…
      </main>
    );
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
      <aside className="md:w-56 shrink-0">
        <div className="border border-cyber/40 bg-bg-surface p-4 mb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-cyber font-mono">
            {user.role}
          </div>
          <div className="font-display font-black text-lg mt-1">{user.display_name ?? user.username}</div>
          <div className="text-xs text-text-muted font-mono">staff panel</div>
        </div>

        {/* Horizontal tabs on mobile, vertical on desktop */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {nav.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-2 text-sm border-l-2 md:border-l-2 border-b-2 md:border-b-0 shrink-0 transition-colors flex items-center gap-2 ${
                  active
                    ? "border-cyber text-text-primary bg-bg-surface"
                    : "border-transparent text-text-secondary hover:text-cyber hover:border-border-strong"
                }`}
              >
                <span className="font-mono text-cyber">{it.icon}</span>
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
