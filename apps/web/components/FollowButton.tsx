"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { follow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function FollowButton({
  username,
  isFollowing,
  onChange,
  size = "md",
}: {
  username: string;
  isFollowing: boolean;
  onChange?: (next: { is_following: boolean; follower_count: number }) => void;
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState(isFollowing);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!user) { router.push("/login"); return; }
    setBusy(true);
    try {
      const r = following ? await follow.remove(username) : await follow.add(username);
      setFollowing(r.following);
      onChange?.({ is_following: r.following, follower_count: r.follower_count });
    } finally { setBusy(false); }
  };

  const sizing = size === "sm" ? "!py-1 !px-3 !text-xs" : "!py-1.5 !px-4 !text-sm";

  if (following) {
    return (
      <button
        onClick={onClick}
        disabled={busy}
        className={`btn-ghost ${sizing} disabled:opacity-50 group min-w-[7.5rem]`}
      >
        <span className="group-hover:hidden">✓ following</span>
        <span className="hidden group-hover:inline text-sakura">unfollow</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`btn-brut ${sizing} disabled:opacity-50 min-w-[7.5rem]`}
    >
      {busy ? "…" : "+ follow"}
    </button>
  );
}
