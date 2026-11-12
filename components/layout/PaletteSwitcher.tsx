"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { PALETTES } from "@/lib/constants/palette";
import { usePaletteStore } from "@/lib/store/palette";

/** Nút chọn bảng màu giao diện (A / B / C / Gốc) trên header — lưu theo trình duyệt. */
export function PaletteSwitcher() {
  const palette = usePaletteStore((s) => s.palette);
  const setPalette = usePaletteStore((s) => s.setPalette);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 hover:bg-brand-header-hover rounded transition-colors"
        aria-label="Bảng màu giao diện"
        title="Bảng màu giao diện"
        aria-haspopup="menu"
        aria-expanded={open}>
        <Palette className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Bảng màu giao diện"
          className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1rem)] bg-white text-gray-800 rounded-lg shadow-2xl border py-1 z-50">
          <p className="px-3 py-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Bảng màu giao diện
          </p>
          {PALETTES.map((opt) => {
            const active = opt.value === palette;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setPalette(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  active ? "bg-brand-soft" : "hover:bg-gray-50"
                }`}>
                {/* Chấm mẫu: nửa trên = dải menu, nửa dưới = nền trang */}
                <span
                  aria-hidden
                  className="w-7 h-7 flex-shrink-0 rounded-full border border-gray-300 overflow-hidden flex flex-col">
                  <span
                    className="flex-1"
                    style={{ background: opt.swatch[0] }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: opt.swatch[1] }}
                  />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-gray-500">
                    {opt.hint}
                  </span>
                </span>
                {active && (
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
