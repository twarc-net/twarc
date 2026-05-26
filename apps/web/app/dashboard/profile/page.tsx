"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { me, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/Avatar";
import { AvatarCropper } from "@/components/AvatarCropper";

export default function ProfileEditPage() {
  const { user, refresh } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [showQ, setShowQ] = useState(false);
  const [birthdate, setBirthdate] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null); // shown in cropper
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string[]> | null>(null);
  const [topErr, setTopErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
      setBio(user.bio ?? "");
      setShowQ(user.show_questionable);
      setBirthdate(user.birthdate ?? "");
    }
  }, [user]);

  // File picker fires this — instead of using the file directly, open the cropper.
  const onFilePicked = (f: File | null) => {
    if (!f) { setPendingFile(null); return; }
    setPendingFile(f);
    // Reset input so picking the same file again re-opens the cropper
    if (fileRef.current) fileRef.current.value = "";
  };

  // AvatarCropper calls this when the user accepts a crop.
  const onCropped = (blob: Blob, previewUrl: string) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: blob.type });
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    setPendingFile(null);
  };

  // Legacy fallback (unused but kept for backward compatibility with the form clear logic)
  const clearStagedAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
  };

  const removeAvatar = async () => {
    if (!confirm("Remove your avatar?")) return;
    setBusy(true);
    try {
      await me.removeAvatar();
      await refresh();
      clearStagedAvatar();
      setOk("avatar removed");
      setTimeout(() => setOk(null), 2000);
    } finally { setBusy(false); }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrs(null);
    setTopErr(null);
    setOk(null);

    try {
      // 1) Update text fields first
      const patch: Record<string, unknown> = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        show_questionable: showQ,
      };
      if (birthdate) patch.birthdate = birthdate;
      await me.update(patch);

      // 2) Upload avatar if new file selected
      if (avatarFile) {
        await me.uploadAvatar(avatarFile);
        clearStagedAvatar();
      }

      await refresh();
      setOk("saved");
      setTimeout(() => setOk(null), 2000);
    } catch (e) {
      const apiErr = e as ApiError;
      if (apiErr.errors) setErrs(apiErr.errors);
      else setTopErr(apiErr.message || "save failed");
    } finally { setBusy(false); }
  };

  if (!user) return null; // dashboard layout handles redirect

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="font-display font-black text-3xl tracking-tight">
          your <span className="text-sakura">profile</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          How others see you. Your avatar will appear on every post you make.
        </p>
      </div>

      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          onCropped={onCropped}
          onCancel={() => setPendingFile(null)}
        />
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* Avatar */}
        <div className="border border-border-subtle bg-bg-surface p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted font-mono mb-3">avatar</div>
          <div className="flex items-start gap-5">
            {/* Current or preview */}
            <div className="shrink-0">
              {avatarPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarPreview}
                  alt="preview"
                  className="size-24 rounded-full object-cover border-2 border-sakura"
                />
              ) : (
                <Avatar user={user} size="xl" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
                className="text-xs text-text-secondary file:border-0 file:bg-sakura file:text-bg-base file:font-mono file:font-bold file:px-3 file:py-1.5 file:mr-3 cursor-pointer"
              />
              <p className="text-xs text-text-muted">
                After picking a file, drag &amp; zoom to crop. Up to 5MB.
              </p>
              {avatarFile && (
                <button type="button" onClick={() => setPendingFile(avatarFile)} className="text-xs text-cyber hover:underline self-start mt-1">
                  re-crop staged image
                </button>
              )}
              {avatarFile && (
                <button type="button" onClick={clearStagedAvatar} className="text-xs text-text-muted hover:text-sakura self-start">
                  discard staged
                </button>
              )}
              {user.avatar_sha256 && !avatarFile && (
                <button type="button" onClick={removeAvatar} disabled={busy} className="text-xs text-sakura hover:text-sakura-deep self-start mt-1">
                  remove current avatar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Display name */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.username}
            className="h-10 px-3 bg-bg-surface border border-border-subtle text-text-primary focus:border-sakura focus:outline-none"
            maxLength={80}
          />
          <span className="text-xs text-text-muted">@{user.username} (username can't be changed)</span>
          {errs?.display_name?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
        </label>

        {/* Bio */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line or two about yourself…"
            rows={3}
            maxLength={500}
            className="px-3 py-2 bg-bg-surface border border-border-subtle text-sm text-text-primary focus:border-sakura focus:outline-none resize-y"
          />
          <span className="text-xs text-text-muted">{bio.length}/500</span>
          {errs?.bio?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
        </label>

        {/* 18+ toggle */}
        <div className="border border-border-subtle p-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showQ}
              onChange={(e) => setShowQ(e.target.checked)}
              className="size-4 mt-0.5 accent-peach"
            />
            <div>
              <div className="text-sm text-text-primary">Show questionable content</div>
              <div className="text-xs text-text-muted">Requires birthdate confirming 18+. Off by default.</div>
            </div>
          </label>
          {showQ && (
            <label className="flex flex-col gap-1.5 ml-7">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted">birthdate</span>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="h-10 px-3 bg-bg-surface border border-border-subtle text-text-primary focus:border-peach focus:outline-none self-start"
              />
              {errs?.birthdate?.map((e, i) => <span key={i} className="text-xs text-sakura font-mono">{e}</span>)}
            </label>
          )}
        </div>

        {topErr && (
          <div className="text-sm text-sakura font-mono border border-sakura/40 bg-sakura/10 px-3 py-2">
            {topErr}
          </div>
        )}
        {ok && (
          <div className="text-sm text-matcha font-mono border border-matcha/40 bg-matcha/10 px-3 py-2">
            ✓ {ok}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-brut self-start disabled:opacity-50">
          {busy ? "saving…" : "save changes →"}
        </button>
      </form>
    </div>
  );
}
