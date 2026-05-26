"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { follow, type PostCard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PostTile } from "@/components/PostTile";
import { PostGridSkeleton } from "@/components/Skeleton";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PostCard[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    follow.feed().then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [authLoading, user, router]);

  return (
    <main className="flex-1 mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-baseline gap-3 mb-6">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
          your <span className="text-sakura">feed</span>
        </h1>
        <p className="text-text-secondary text-sm">
          Latest from the artists you follow.
        </p>
      </div>

      {items === null ? (
        <PostGridSkeleton count={12} />
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">
          Your feed is empty. <Link href="/anime" className="text-sakura hover:underline">browse anime →</Link> and follow some artists to see their work here.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((p, i) => <PostTile key={p.id} post={p} idx={i} />)}
        </div>
      )}
    </main>
  );
}
