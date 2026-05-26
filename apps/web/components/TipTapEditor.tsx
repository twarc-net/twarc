"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useRef, useState } from "react";

/**
 * Long-form blog editor built on TipTap (ProseMirror under the hood — same
 * engine Notion / Linear / GitLab use). Pure open source, MIT.
 *
 * Supports:
 *   - Headings, bold/italic/strike, lists, blockquotes, code blocks
 *   - Image upload (drag-drop + file picker, POSTs to /api/blog/upload-image)
 *   - Links via prompt
 *   - Smart typography (auto-quotes, em-dashes)
 *   - Text align, highlight
 *   - Saves clean HTML to props.onChange
 *
 * Adjacent component `BlogContent` renders the saved HTML safely on read.
 */
type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function TipTapEditor({ value, onChange, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "tt-code-block" } },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "tt-image" } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank", class: "tt-link" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      Typography,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ HTMLAttributes: { class: "tt-highlight" } }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tt-prose focus:outline-none min-h-[480px] px-4 py-3",
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!moved && files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          for (const f of files) uploadAndInsert(f, view, pos?.pos);
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const img = items.find((i) => i.type.startsWith("image/"));
        if (img) {
          const f = img.getAsFile();
          if (f) { event.preventDefault(); uploadAndInsert(f, view); return true; }
        }
        return false;
      },
    },
  });

  // Upload a file to /api/blog/upload-image and insert it at the cursor or a given pos.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadAndInsert = useCallback(async (file: File, view?: any, atPos?: number) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      // Use the same fetch wrapper conventions: send credentials + CSRF.
      const csrfRes = await fetch("/sanctum/csrf-cookie", { credentials: "include" });
      void csrfRes;
      const xsrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
      const res = await fetch("/api/blog/upload-image", {
        method: "POST",
        credentials: "include",
        body: form,
        headers: {
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
        },
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      const { url } = await res.json();
      if (editor) {
        if (atPos != null && view) {
          view.dispatch(view.state.tr.insert(atPos, view.state.schema.nodes.image.create({ src: url })));
        } else {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    } catch (e) {
      alert("Image upload failed. Try a smaller file.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const pickImage = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndInsert(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const promptLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) return <div className="skeleton h-[520px] border-2 border-border-strong" />;

  return (
    <div className="border-2 border-text-primary bg-bg-surface">
      <Toolbar editor={editor} onLink={promptLink} onImage={pickImage} uploading={uploading} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor, onLink, onImage, uploading,
}: { editor: Editor; onLink: () => void; onImage: () => void; uploading: boolean }) {
  const can = editor.can();
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b-2 border-border-strong bg-bg-elevated">
      <Btn active={editor.isActive("heading", { level: 1 })}
           disabled={!can.chain().toggleHeading({ level: 1 }).run()}
           onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
           label="H1" title="Heading 1" />
      <Btn active={editor.isActive("heading", { level: 2 })}
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
           label="H2" title="Heading 2" />
      <Btn active={editor.isActive("heading", { level: 3 })}
           onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
           label="H3" title="Heading 3" />
      <Sep />
      <Btn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}      label="B" title="Bold" bold />
      <Btn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}    label="I" title="Italic" italic />
      <Btn active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}    label="S" title="Strikethrough" strike />
      <Btn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} label="●" title="Highlight" />
      <Sep />
      <Btn active={editor.isActive("bulletList")}    onClick={() => editor.chain().focus().toggleBulletList().run()}    label="•" title="Bullet list" />
      <Btn active={editor.isActive("orderedList")}   onClick={() => editor.chain().focus().toggleOrderedList().run()}   label="1." title="Numbered list" />
      <Btn active={editor.isActive("blockquote")}    onClick={() => editor.chain().focus().toggleBlockquote().run()}    label="❝" title="Quote" />
      <Btn active={editor.isActive("codeBlock")}     onClick={() => editor.chain().focus().toggleCodeBlock().run()}     label="</>" title="Code block" />
      <Sep />
      <Btn onClick={onLink}  active={editor.isActive("link")}  label="🔗" title="Insert / edit link" />
      <Btn onClick={onImage} label={uploading ? "…" : "🖼"} title="Upload image" />
      <Sep />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!can.chain().undo().run()}  label="↶" title="Undo" />
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!can.chain().redo().run()} label="↷" title="Redo" />
    </div>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-border-strong mx-0.5" aria-hidden />;
}

function Btn({
  onClick, label, title, active, disabled, bold, italic, strike,
}: {
  onClick: () => void; label: string; title: string;
  active?: boolean; disabled?: boolean;
  bold?: boolean; italic?: boolean; strike?: boolean;
}) {
  const fontCls =
    bold ? "font-display font-black"
    : italic ? "italic font-serif"
    : strike ? "line-through"
    : "font-mono";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`min-w-9 h-9 px-2 text-sm ${fontCls} border-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "border-sakura text-sakura bg-sakura/10"
          : "border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary active:border-sakura"
      }`}
    >
      {label}
    </button>
  );
}
