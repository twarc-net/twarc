"use client";

import DOMPurify from "isomorphic-dompurify";

/**
 * Safe render of TipTap-generated HTML for the public blog detail page.
 *
 * - DOMPurify strips anything that's not a known-safe tag/attribute.
 * - We keep the schema that TipTap actually emits (h1-h3, p, strong, em,
 *   s, mark, ul/ol/li, blockquote, pre/code, a, img with rel attrs).
 * - Style is applied via the `.tt-prose` CSS class in globals.css so the
 *   editor view and the public view look identical.
 */
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "p", "br",
  "strong", "em", "s", "u", "mark", "code",
  "ul", "ol", "li",
  "blockquote", "pre",
  "a", "img",
  "hr",
];
const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title", "class"];

export function BlogContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  return (
    <div
      className="tt-prose"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
