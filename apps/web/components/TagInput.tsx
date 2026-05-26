"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tags as tagsApi, type TagCategory } from "@/lib/api";

type Suggestion = {
  id: number;
  name: string;
  category: string;
  post_count: number;
};

const CAT_CHIP_CAT: Record<string, string> = {
  copyright: "anime",
  character: "character",
  artist: "artist",
  meta: "meta",
  general: "tag",
};

/**
 * Tag picker with autocomplete + create-new.
 *
 * Props:
 *   - value:        canonical space-separated tag string
 *   - onChange:     callback when value changes
 *   - category:     filter autocomplete + assign category to new tags
 *   - singleSelect: only allow one tag (hides input once filled, × to clear)
 *   - exclude:      tag names to filter out of suggestions and reject on manual entry
 *                   (used so other-tags input can't re-add the anime/character already picked)
 */
export function TagInput({
  value,
  onChange,
  placeholder = "type to find or create… (e.g. hatsune_miku)",
  category,
  accent = "sakura",
  singleSelect = false,
  exclude = [],
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  category?: TagCategory;
  accent?: "sakura" | "cyber" | "peach";
  singleSelect?: boolean;
  exclude?: string[];
}) {
  const accentBorder = accent === "cyber" ? "border-cyber focus-within:border-cyber"
                     : accent === "peach" ? "border-peach focus-within:border-peach"
                     :                       "border-border-subtle focus-within:border-sakura";
  const chipBorder   = accent === "cyber" ? "border-cyber"
                     : accent === "peach" ? "border-peach"
                     :                       "border-border-strong";

  const selected = value.trim() ? value.trim().split(/\s+/) : [];
  const filled = singleSelect && selected.length >= 1;
  const excludeSet = new Set(exclude.map((s) => s.toLowerCase()));

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced autocomplete fetch — skipped when filled (singleSelect, value already set)
  useEffect(() => {
    if (filled) { setSuggestions([]); return; }
    const q = input.trim().toLowerCase();
    if (!q) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      tagsApi.autocomplete(q, category)
        .then((r) => {
          setSuggestions(
            r.data.filter((s) => !selected.includes(s.name) && !excludeSet.has(s.name))
          );
          setActiveIdx(0);
        })
        .finally(() => setLoading(false));
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, filled]);

  const addTag = useCallback((name: string) => {
    name = name.toLowerCase().replace(/[^a-z0-9_()\-]/g, "");
    if (!name) { setInput(""); return; }
    if (excludeSet.has(name)) {
      setRejection(`"${name}" is already picked in another field`);
      setInput("");
      setTimeout(() => setRejection(null), 2500);
      return;
    }
    if (selected.includes(name)) {
      setInput("");
      return;
    }
    if (singleSelect) {
      // Replace existing selection
      onChange(name);
    } else {
      onChange([...selected, name].join(" "));
    }
    setInput("");
    setSuggestions([]);
    setOpen(false);
  }, [selected, onChange, singleSelect, excludeSet]);

  const removeTag = (name: string) => {
    onChange(selected.filter((t) => t !== name).join(" "));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filled) return; // ignore keys when single-select is full
    if (e.key === "Enter" || e.key === "," || (e.key === " " && input.length > 0)) {
      e.preventDefault();
      if (suggestions.length > 0 && open) {
        addTag(suggestions[activeIdx].name);
      } else if (input.trim()) {
        addTag(input.trim());
      }
    } else if (e.key === "Backspace" && input === "" && selected.length > 0) {
      e.preventDefault();
      removeTag(selected[selected.length - 1]);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const exactMatch = suggestions.find((s) => s.name === input.trim().toLowerCase());
  const cleanedInput = input.trim().toLowerCase().replace(/[^a-z0-9_()\-]/g, "");
  const showCreateOption = !filled && input.trim().length > 0 && !exactMatch && !excludeSet.has(cleanedInput);

  return (
    <div className="relative">
      <div
        className={`min-h-[3rem] flex flex-wrap gap-1.5 px-2 py-2 bg-bg-surface border ${accentBorder} transition-colors ${filled ? "cursor-default" : "cursor-text"}`}
        onClick={() => !filled && inputRef.current?.focus()}
      >
        {selected.map((name) => (
          <span
            key={name}
            className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 bg-bg-elevated border ${chipBorder} text-sm text-text-primary font-mono`}
          >
            <span>{name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(name); }}
              className="size-4 grid place-items-center text-text-muted hover:text-sakura hover:bg-sakura/10 transition-colors"
              aria-label={`remove ${name}`}
              tabIndex={-1}
            >
              ×
            </button>
          </span>
        ))}
        {!filled && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); }}
            onKeyDown={onKey}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted font-mono"
          />
        )}
        {filled && (
          <span className="ml-auto text-xs text-text-muted font-mono self-center pr-1">
            click × to change
          </span>
        )}
      </div>

      {rejection && (
        <div className="absolute z-40 left-0 right-0 mt-1 px-3 py-2 bg-sakura/10 border border-sakura text-sakura text-xs font-mono fade-in">
          {rejection}
        </div>
      )}

      {/* Suggestion dropdown */}
      {!filled && open && (input.trim() || loading) && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-bg-elevated border border-border-strong shadow-[var(--shadow-brut-sm)]">
          {suggestions.length === 0 && !loading && !showCreateOption && (
            <div className="p-3 text-xs text-text-muted font-mono">
              no matches{excludeSet.has(cleanedInput) ? " — already picked elsewhere" : ""}
            </div>
          )}
          {loading && suggestions.length === 0 && (
            <div className="p-3 text-xs text-text-muted font-mono">searching…</div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s.name); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-mono transition-colors ${
                activeIdx === i ? "bg-sakura/10 border-l-2 border-sakura" : "hover:bg-bg-surface border-l-2 border-transparent"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-text-primary">{s.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-text-muted">
                  {CAT_CHIP_CAT[s.category] ?? s.category}
                </span>
              </span>
              <span className="text-xs text-text-muted">{s.post_count} posts</span>
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(input.trim()); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-mono border-t border-border-subtle transition-colors ${
                suggestions.length === 0 ? "bg-cyber/10 border-l-2 border-cyber" : "hover:bg-bg-surface"
              }`}
            >
              <span className="text-cyber">+</span>
              <span className="text-text-primary">create</span>
              <code className="text-cyber">{cleanedInput}</code>
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted mt-1.5 px-1">
        {singleSelect
          ? (filled ? "Pick another by removing the current one (×)." : "Pick existing or type to create a new one.")
          : "Enter or comma to add · Backspace to remove last · arrows to navigate"}
      </p>
    </div>
  );
}
