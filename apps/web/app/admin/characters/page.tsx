"use client";

import { AdminTagManager } from "@/components/AdminTagManager";

export default function AdminCharactersPage() {
  return (
    <AdminTagManager
      fixedCategory="character"
      display="cards"
      title="manage characters"
      accent="sakura"
      description="Characters — anime cast, video-game characters, OCs. Each one gets a portrait + bio."
      publicPrefix="/character"
    />
  );
}
