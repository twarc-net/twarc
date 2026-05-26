"use client";

import { useCallback, useEffect, useState } from "react";
import { admin, type AdminUserRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const ROLES: AdminUserRow["role"][] = ["member", "contributor", "moderator", "admin"];

export default function UsersAdminPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";

  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await admin.users({ q: q || undefined });
      setItems(r.data);
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const changeRole = async (u: AdminUserRow, role: AdminUserRow["role"]) => {
    if (u.role === role) return;
    if (!confirm(`Change @${u.username} role: ${u.role} → ${role}?`)) return;
    await admin.setRole(u.id, role);
    await load();
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    setBusy(true);
    try {
      await admin.banUser(banTarget.id, banReason || undefined);
      setBanTarget(null);
      setBanReason("");
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display font-black text-3xl tracking-tight">
          user <span className="text-cyber">manager</span>
        </h1>
        {!isAdmin && (
          <span className="text-xs text-peach font-mono">moderator: read-only</span>
        )}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="search by username, email, or display name…"
        className="h-10 px-3 bg-bg-surface border border-border-subtle text-sm text-text-primary focus:border-cyber focus:outline-none"
      />

      <div className="border border-border-subtle bg-bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-text-muted font-mono border-b border-border-subtle">
            <tr>
              <th className="text-left p-2.5">username</th>
              <th className="text-left p-2.5 hidden sm:table-cell">email</th>
              <th className="text-left p-2.5">role</th>
              <th className="text-right p-2.5">posts</th>
              <th className="text-right p-2.5 hidden md:table-cell">joined</th>
              <th className="text-center p-2.5">actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="p-2"><div className="skeleton h-7" /></td></tr>
              ))
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-text-muted">no users match</td></tr>
            ) : items.map((u) => (
              <tr key={u.id} className="border-b border-border-subtle/60 hover:bg-bg-elevated/50">
                <td className="p-2.5">
                  <div className="font-mono text-text-primary">{u.username}</div>
                  {u.display_name && (
                    <div className="text-xs text-text-muted">{u.display_name}</div>
                  )}
                </td>
                <td className="p-2.5 hidden sm:table-cell text-text-secondary text-xs font-mono">
                  {u.email} {u.email_verified ? <span className="text-matcha">✓</span> : <span className="text-peach">✗</span>}
                </td>
                <td className="p-2.5">
                  {isAdmin && u.id !== me?.id ? (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as AdminUserRow["role"])}
                      className="h-7 px-2 bg-bg-base border border-border-subtle text-xs focus:border-cyber focus:outline-none"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`font-mono text-xs ${u.role === "admin" ? "text-sakura" : u.role === "moderator" ? "text-cyber" : "text-text-muted"}`}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="p-2.5 text-right font-mono text-text-secondary">{u.post_count}</td>
                <td className="p-2.5 text-right hidden md:table-cell text-text-muted text-xs font-mono">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="p-2.5 text-center">
                  {isAdmin && u.id !== me?.id && u.role !== "admin" ? (
                    <button
                      onClick={() => setBanTarget(u)}
                      className="text-xs text-sakura hover:text-sakura-deep font-mono"
                    >
                      ban
                    </button>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={banTarget !== null}
        title={`Ban @${banTarget?.username}?`}
        message="This soft-deletes the user. Their posts stay visible (unless flagged). You can restore later via direct DB."
        confirmLabel="ban user"
        cancelLabel="cancel"
        danger
        busy={busy}
        onConfirm={confirmBan}
        onCancel={() => { setBanTarget(null); setBanReason(""); }}
      >
        <label className="flex flex-col gap-1 mt-2">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">reason (optional)</span>
          <input
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="h-9 px-3 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none"
            placeholder="ToS violation, spam, etc."
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
