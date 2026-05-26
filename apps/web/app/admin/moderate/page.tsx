"use client";

import { useCallback, useEffect, useState } from "react";
import { admin, type AdminPost } from "@/lib/api";

export default function ModeratePage() {
  const [items, setItems] = useState<AdminPost[] | null>(null);
  const [active, setActive] = useState<AdminPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    const r = await admin.pending();
    setItems(r.data);
    setActive((cur) => cur && r.data.find((p) => p.id === cur.id) ? cur : (r.data[0] ?? null));
  }, []);

  useEffect(() => { load().catch(() => setItems([])); }, [load]);

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await admin.approve(active.id);
      await load();
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!active || rejectReason.trim().length < 3) return;
    setBusy(true);
    try {
      await admin.reject(active.id, rejectReason.trim());
      setRejectReason("");
      await load();
    } finally { setBusy(false); }
  };

  if (items === null) {
    return <div className="text-text-muted font-mono text-sm">loading queue…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="border border-border-subtle bg-bg-surface p-10 text-center">
        <div className="font-display font-black text-2xl mb-2">
          queue is <span className="text-matcha">empty</span>
        </div>
        <p className="text-text-secondary text-sm">No pending posts. Nice.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display font-black text-3xl tracking-tight">
          mod <span className="text-cyber">queue</span>
        </h1>
        <span className="text-text-muted font-mono text-sm">{items.length} pending</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Queue list */}
        <div className="border border-border-subtle bg-bg-surface max-h-[80vh] overflow-y-auto">
          {items.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => { setActive(p); setRejectReason(""); }}
              className={`w-full flex items-center gap-3 p-2 border-b border-border-subtle text-left transition-colors fade-in ${
                active?.id === p.id ? "bg-bg-elevated border-l-2 border-l-cyber" : "hover:bg-bg-elevated"
              }`}
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb_url} alt="" className="size-14 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-text-muted truncate">
                  @{p.uploader?.username ?? "?"}
                </div>
                <div className="text-xs text-text-secondary truncate">
                  {p.tag_string.split(" ").slice(0, 5).join(" ")}
                </div>
                <div className="text-[10px] font-mono mt-1 flex gap-2">
                  <span className={p.rating === "safe" ? "text-matcha" : "text-peach"}>{p.rating}</span>
                  <span className="text-text-muted">{p.width}×{p.height}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Active review pane */}
        {active && (
          <div className="border border-border-subtle bg-bg-surface p-4 flex flex-col gap-4 fade-in" key={active.id}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:max-w-md flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.preview_url}
                  alt=""
                  className="w-full max-h-[60vh] object-contain img-fade"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">uploader</div>
                  <div className="text-text-primary">{active.uploader?.display_name ?? active.uploader?.username}</div>
                  <div className="text-xs text-text-muted font-mono">@{active.uploader?.username}</div>
                </div>

                {active.title && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">title</div>
                    <div className="text-text-primary">{active.title}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">tags · {active.tag_count}</div>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                    {active.tag_string.split(/\s+/).filter(Boolean).map((t) => (
                      <span key={t} className="tag-chip">{t}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">rating</div>
                  <div className={`font-mono ${active.rating === "safe" ? "text-matcha" : "text-peach"}`}>
                    {active.rating}
                  </div>
                </div>

                {active.source_url && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">source</div>
                    <a href={active.source_url} target="_blank" rel="noopener noreferrer" className="text-cyber hover:underline break-all text-xs">
                      {active.source_url}
                    </a>
                  </div>
                )}

                {active.description && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-text-muted font-mono">description</div>
                    <div className="text-text-secondary text-xs whitespace-pre-wrap">{active.description}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action row */}
            <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={approve}
                  disabled={busy}
                  className="btn-brut !bg-matcha !shadow-[5px_5px_0_0_var(--color-text-primary)] !py-2 !px-4 !text-sm disabled:opacity-50"
                >
                  ✓ approve
                </button>
                <button
                  onClick={reject}
                  disabled={busy || rejectReason.trim().length < 3}
                  className="btn-brut !bg-sakura-deep !py-2 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✗ reject
                </button>
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="reason (required to reject)"
                  className="flex-1 min-w-[200px] h-9 px-3 bg-bg-base border border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
