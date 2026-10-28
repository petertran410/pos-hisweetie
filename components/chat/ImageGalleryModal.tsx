"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Xem ảnh lớn + dải ảnh nhỏ để chuyển qua lại (giống xem ảnh ở trang Báo đơn).
 * ←/→ hoặc phím mũi tên để chuyển, Esc / bấm nền để đóng.
 */
export function ImageGalleryModal({
  images,
  index: startIndex,
  onClose,
}: {
  images: { url: string; name?: string }[];
  index: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const n = images.length;
  const go = (step: number) => setIndex((i) => (i + step + n) % n);
  const current = images[Math.min(index, n - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + n) % n);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, n]);

  if (!current) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}>
      <div className="relative w-full max-w-6xl max-h-[90vh]">
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute -top-10 right-0 z-10 text-white hover:text-gray-300">
          <X className="h-8 w-8" />
        </button>
        <div className="flex flex-col items-center gap-4">
          <img
            src={current.url}
            alt={current.name ?? ""}
            className="max-h-[75vh] max-w-full rounded bg-white object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {n > 1 && (
            <div
              className="flex items-center gap-2 rounded-lg bg-white/90 p-3"
              onClick={(e) => e.stopPropagation()}>
              <button onClick={() => go(-1)} aria-label="Ảnh trước" className="rounded p-2 hover:bg-gray-100">
                ←
              </button>
              <div className="flex max-w-md gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={`${i}-${img.url}`}
                    onClick={() => setIndex(i)}
                    aria-label={img.name ?? `Ảnh ${i + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                      i === index ? "border-brand" : "border-gray-300"
                    }`}>
                    <img src={img.url} alt="" className="h-full w-full bg-white object-cover" />
                  </button>
                ))}
              </div>
              <button onClick={() => go(1)} aria-label="Ảnh sau" className="rounded p-2 hover:bg-gray-100">
                →
              </button>
              <span className="ml-2 text-sm text-gray-700">
                {index + 1} / {n}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
