"use client";

import dynamic from "next/dynamic";

// Lazy-load TipTap on the client. It carries a fair amount of code and is
// only needed on the author screens, not the public read pages.
const TipTapEditor = dynamic(
  () => import("@/components/TipTapEditor").then((m) => m.TipTapEditor),
  { ssr: false, loading: () => <div className="skeleton h-[520px] border-2 border-border-strong" /> },
);

export function BlogEditor({
  value, onChange, placeholder,
}: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  return <TipTapEditor value={value} onChange={onChange} placeholder={placeholder} />;
}
