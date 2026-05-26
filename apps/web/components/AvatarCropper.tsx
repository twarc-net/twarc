"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

/**
 * Modal cropper for avatars. Shows a circular preview matching how the avatar
 * actually renders. User pans (drag) + zooms (wheel / pinch / slider) to
 * position. On "apply", produces a cropped JPEG Blob client-side via canvas.
 */
export function AvatarCropper({
  file,
  onCropped,
  onCancel,
}: {
  file: File;
  onCropped: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Load file into a data URL for the cropper
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // ESC to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onCancel]);

  const apply = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await renderCroppedImage(imageSrc, croppedAreaPixels, rotation);
      const previewUrl = URL.createObjectURL(blob);
      onCropped(blob, previewUrl);
    } catch (e) {
      console.error("crop failed", e);
    } finally { setBusy(false); }
  }, [imageSrc, croppedAreaPixels, rotation, onCropped]);

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog-panel !max-w-2xl w-full !p-0 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh" }}
      >
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-display font-black text-xl tracking-tight">
            crop your <span className="text-sakura">avatar</span>
          </h2>
          <span className="text-xs font-mono text-text-muted">drag to pan · wheel to zoom</span>
        </div>

        {/* Cropper canvas */}
        <div className="relative bg-bg-base" style={{ height: 420 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              style={{
                containerStyle: { background: "var(--color-bg-base)" },
                cropAreaStyle: { border: "2px solid var(--color-sakura)" },
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 flex flex-col gap-4 border-t border-border-subtle">
          <SliderRow label="zoom" min={1} max={4} step={0.01} value={zoom} setValue={setZoom} />
          <SliderRow label="rotate" min={-180} max={180} step={1} value={rotation} setValue={setRotation} unit="°" />
        </div>

        <div className="px-5 py-4 border-t border-border-subtle flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); }}
            className="text-xs font-mono text-text-muted hover:text-sakura transition-colors"
          >
            reset
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost !py-2 !px-4 !text-sm">cancel</button>
            <button type="button" onClick={apply} disabled={busy || !croppedAreaPixels} className="btn-brut !py-2 !px-4 !text-sm disabled:opacity-50">
              {busy ? "…" : "use this →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label, min, max, step, value, setValue, unit = "",
}: {
  label: string; min: number; max: number; step: number; value: number;
  setValue: (n: number) => void; unit?: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-xs font-mono uppercase tracking-[0.18em] text-text-muted w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="flex-1 accent-sakura"
      />
      <span className="text-xs font-mono text-text-secondary w-16 text-right">
        {value.toFixed(label === "zoom" ? 2 : 0)}{unit}
      </span>
    </label>
  );
}

// ----- canvas crop helper -----

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function renderCroppedImage(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await loadImage(imageSrc);
  // Outer canvas big enough to hold the rotated source
  const safe = Math.max(image.width, image.height) * 2;
  const outer = document.createElement("canvas");
  outer.width = safe;
  outer.height = safe;
  const octx = outer.getContext("2d");
  if (!octx) throw new Error("no 2d context");

  octx.translate(safe / 2, safe / 2);
  octx.rotate((rotation * Math.PI) / 180);
  octx.translate(-image.width / 2, -image.height / 2);
  octx.drawImage(image, 0, 0);

  const data = octx.getImageData(0, 0, safe, safe);

  // Final crop canvas — size set by react-easy-crop's pixel coords
  const out = document.createElement("canvas");
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const offsetX = safe / 2 - image.width / 2;
  const offsetY = safe / 2 - image.height / 2;
  ctx.putImageData(data, -(offsetX + pixelCrop.x), -(offsetY + pixelCrop.y));

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
}
