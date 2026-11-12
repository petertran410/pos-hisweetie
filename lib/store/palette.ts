import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  DEFAULT_PALETTE,
  FORCED_ORIG_PATH_PREFIXES,
  PALETTE_STORAGE_KEY,
  isPalette,
  type Palette,
} from "@/lib/constants/palette";

/**
 * Bảng màu giao diện người dùng chọn — lưu cục bộ theo trình duyệt.
 * Hằng số + script chống nháy ở `lib/constants/palette.ts`.
 */
export function applyPalette(palette: Palette) {
  if (typeof document === "undefined") return;
  const forcedOrig = FORCED_ORIG_PATH_PREFIXES.some((p) =>
    window.location.pathname.startsWith(p)
  );
  const effective = forcedOrig ? "orig" : palette;
  const root = document.documentElement;
  if (effective === DEFAULT_PALETTE) delete root.dataset.palette;
  else root.dataset.palette = effective;
}

interface PaletteState {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      palette: DEFAULT_PALETTE,
      setPalette: (palette) => {
        applyPalette(palette);
        set({ palette });
      },
    }),
    {
      name: PALETTE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ palette: state.palette }),
      merge: (persisted, current) => {
        const palette = (persisted as { palette?: unknown } | undefined)
          ?.palette;
        return isPalette(palette) ? { ...current, palette } : current;
      },
    }
  )
);

/**
 * Đồng bộ bảng màu giữa các tab (giống `initNotificationPrefsCrossTabSync`):
 * sự kiện `storage` chỉ bắn ở tab *khác* tab đang ghi.
 *
 * @returns Hàm cleanup gỡ listener.
 */
export function initPaletteCrossTabSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: StorageEvent) => {
    // key === null: tab khác gọi localStorage.clear().
    if (e.key !== null && e.key !== PALETTE_STORAGE_KEY) return;

    if (localStorage.getItem(PALETTE_STORAGE_KEY) === null) {
      usePaletteStore.setState({ palette: DEFAULT_PALETTE });
      applyPalette(DEFAULT_PALETTE);
      return;
    }

    // Đọc giá trị mới nhất, không ghi ngược storage (tránh các tab dội event).
    void Promise.resolve(usePaletteStore.persist.rehydrate()).then(() =>
      applyPalette(usePaletteStore.getState().palette)
    );
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
