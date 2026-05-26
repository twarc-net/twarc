"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * GIF picker. Tries server-side search via /api/gifs/* first (Klipy/Giphy when
 * configured). If no provider is configured, falls back to "paste any GIF URL"
 * mode — works with any GIF on the internet, no API key needed.
 *
 * To enable search mode:
 *   - Klipy: sign up at https://partner.klipy.com → set KLIPY_API_KEY in apps/api/.env
 *   - Giphy: sign up at https://developers.giphy.com → set GIPHY_API_KEY in apps/api/.env
 */
export function TenorGifPicker({
  onPick, onClose,
}: {
  onPick: (gifUrl: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"search" | "paste">("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GifHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const fetchTimer = useRef<number | null>(null);

  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const fetchGifs = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const path = query.trim() ? `search?q=${encodeURIComponent(query)}` : "trending";
      const r = await fetch(`/api/gifs/${path}&limit=24`.replace("&limit=24", (path.includes("?") ? "&" : "?") + "limit=24"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = await r.json();
      setProvider(j.provider ?? null);
      setConfigured(j.configured !== false && (j.provider !== null || (j.results?.length ?? 0) > 0));
      setResults((j.results ?? []) as GifHit[]);
      // If unconfigured / no results from search, drop user into paste mode
      if (j.configured === false || j.provider === null) {
        setMode("paste");
      }
    } catch {
      setResults([]);
      setConfigured(false);
      setMode("paste");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (mode !== "search") return;
    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(() => fetchGifs(q), 220);
    return () => { if (fetchTimer.current) window.clearTimeout(fetchTimer.current); };
  }, [q, mode, fetchGifs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const tryPasteUrl = () => {
    setPasteError(null);
    const url = pasteUrl.trim();
    if (!url) return;
    let u: URL;
    try { u = new URL(url); } catch { setPasteError("not a valid URL"); return; }
    const lower = u.pathname.toLowerCase() + u.search.toLowerCase();
    const looksLikeGif =
      lower.includes(".gif") ||
      u.hostname.includes("tenor.com") ||
      u.hostname.includes("media.giphy.com") ||
      u.hostname.includes("media.tenor.com") ||
      lower.includes(".webp") ||
      lower.includes(".webm");
    if (!looksLikeGif) {
      setPasteError("doesn't look like a GIF / animated image URL — paste a direct image URL ending in .gif");
      return;
    }
    onPick(url);
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog-panel !max-w-2xl w-full !p-0 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "80vh" }}
      >
        <div className="px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-lg tracking-tight">
              {mode === "search" ? <>add a <span className="text-cyber">GIF</span></> : <>paste GIF <span className="text-cyber">URL</span></>}
            </h2>
            <div className="flex gap-1 text-xs font-mono">
              <button
                onClick={() => setMode("search")}
                className={`px-2 py-1 ${mode === "search" ? "text-cyber border-b border-cyber" : "text-text-muted hover:text-text-secondary"}`}
              >search</button>
              <button
                onClick={() => setMode("paste")}
                className={`px-2 py-1 ${mode === "paste" ? "text-cyber border-b border-cyber" : "text-text-muted hover:text-text-secondary"}`}
              >paste URL</button>
            </div>
          </div>

          {mode === "search" ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search GIFs… (miku, hug, blush, fight)"
              autoFocus
              className="w-full h-10 px-3 bg-bg-base border border-border-subtle font-mono text-sm text-text-primary focus:border-cyber focus:outline-none"
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tryPasteUrl()}
                  placeholder="https://media.giphy.com/.../something.gif"
                  autoFocus
                  className="flex-1 h-10 px-3 bg-bg-base border border-border-subtle font-mono text-sm text-text-primary focus:border-cyber focus:outline-none"
                />
                <button onClick={tryPasteUrl} className="btn-brut !bg-cyber !shadow-[var(--shadow-brut-cyber)] !py-2 !px-4 !text-sm">
                  insert
                </button>
              </div>
              {pasteError && <p className="text-xs text-sakura font-mono">{pasteError}</p>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {mode === "paste" ? (
            <div className="p-4 text-sm text-text-secondary space-y-3">
              <p>Paste a GIF URL from anywhere:</p>
              <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
                <li>Go to <a className="text-cyber underline" href="https://giphy.com" target="_blank" rel="noopener noreferrer">giphy.com</a> or <a className="text-cyber underline" href="https://tenor.com" target="_blank" rel="noopener noreferrer">tenor.com</a></li>
                <li>Right-click the GIF you want → <em>Copy image address</em></li>
                <li>Paste it in the box above and hit insert</li>
              </ol>
              {pasteUrl.trim() && pasteUrl.match(/\.(gif|webp)\b|tenor\.com|giphy\.com/i) && (
                <div>
                  <p className="text-xs text-text-muted mb-2">preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pasteUrl} alt="preview" className="max-h-48 border border-border-subtle" onError={() => setPasteError("URL doesn't load")} />
                </div>
              )}
              {configured === false && (
                <p className="text-xs text-text-muted border-t border-border-subtle pt-3 mt-3">
                  Want a built-in search instead? An admin can wire up Klipy or Giphy by setting{" "}
                  <code className="text-cyber">KLIPY_API_KEY</code> or <code className="text-cyber">GIPHY_API_KEY</code> in <code>apps/api/.env</code>.
                </p>
              )}
            </div>
          ) : loading && results.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton aspect-square border border-border-subtle" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">
              {configured === false
                ? "GIF search needs a provider key. Switch to the paste-URL tab above — it works without one."
                : q ? `no GIFs for "${q}"` : "no results"}
            </div>
          ) : (
            <>
              {provider && <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">via {provider}</div>}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onMouseDown={(e) => { e.preventDefault(); onPick(r.full_url); }}
                    className="block aspect-square overflow-hidden border border-border-subtle hover:border-cyber transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.preview_url || r.full_url} alt={r.alt ?? "GIF"} loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type GifHit = { id: string; preview_url: string; full_url: string; width: number; height: number; alt: string };
