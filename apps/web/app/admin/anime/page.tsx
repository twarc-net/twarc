"use client";

import { AdminTagManager } from "@/components/AdminTagManager";

export default function AdminAnimePage() {
  return (
    <AdminTagManager
      fixedCategory="copyright"
      display="cards"
      title="manage anime"
      accent="cyber"
      description="Anime series, games, manga. Add a cover and description to make each one feel like a real entry."
      publicPrefix="/anime"
    />
  );
}
