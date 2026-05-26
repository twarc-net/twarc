"use client";

import { BlogContent } from "@/components/BlogContent";

/**
 * Legacy shim. New code should import BlogContent directly. Kept so any
 * references to MarkdownBody still render the new TipTap HTML safely.
 */
export function MarkdownBody({ source }: { source: string }) {
  return <BlogContent html={source} />;
}
