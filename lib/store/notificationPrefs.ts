import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Tuỳ chọn thông báo (chuông) — lưu cục bộ theo trình duyệt.
 *
 * `mutedUntil`:
 *  - `null`              → KHÔNG mute.
 *  - `MUTE_FOREVER`      → mute cho tới khi người dùng bật lại.
 *  - epoch ms bất kỳ     → mute tới thời điểm đó, tự hết hạn.
 *
 * Lưu ý: không dùng `Infinity` làm sentinel vì `JSON.stringify(Infinity)`
 * trả về `null` → sẽ bị hiểu nhầm thành "không mute" sau khi rehydrate.
 */
export const MUTE_FOREVER = Number.MAX_SAFE_INTEGER;

export const NOTIFICATION_PREFS_STORAGE_KEY = "notification-prefs";

interface NotificationPrefsState {
  /** Mốc hết hạn mute (epoch ms) hoặc null nếu đang bật thông báo. */
  mutedUntil: number | null;
  /** Đã rehydrate xong từ localStorage chưa (tránh nháy trạng thái sai). */
  _hasHydrated: boolean;
  /** Mute trong `minutes` phút; truyền `null` để mute cho tới khi bật lại. */
  muteFor: (minutes: number | null) => void;
  /** Mute tới một mốc thời gian cụ thể (epoch ms). */
  muteUntil: (timestamp: number) => void;
  /** Bật lại thông báo. */
  unmute: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      mutedUntil: null,
      _hasHydrated: false,
      muteFor: (minutes) =>
        set({
          mutedUntil:
            minutes === null ? MUTE_FOREVER : Date.now() + minutes * 60_000,
        }),
      muteUntil: (timestamp) => set({ mutedUntil: timestamp }),
      unmute: () => set({ mutedUntil: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: NOTIFICATION_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ mutedUntil: state.mutedUntil }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Đang trong thời gian mute? (tự coi là hết hạn khi qua mốc) */
export function isMuted(mutedUntil: number | null): boolean {
  if (mutedUntil === null) return false;
  if (mutedUntil === MUTE_FOREVER) return true;
  return Date.now() < mutedUntil;
}

/** Đọc trạng thái mute ngoài React (dùng trong effect/poll). */
export function isNotificationMutedNow(): boolean {
  return isMuted(useNotificationPrefsStore.getState().mutedUntil);
}

/** Mô tả thời gian mute còn lại, ví dụ "còn 42 phút". */
export function describeMuteRemaining(mutedUntil: number | null): string {
  if (mutedUntil === null) return "";
  if (mutedUntil === MUTE_FOREVER) return "cho đến khi bật lại";
  const ms = mutedUntil - Date.now();
  if (ms <= 0) return "";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `còn ${hours} giờ ${rest} phút` : `còn ${hours} giờ`;
}

/**
 * Đồng bộ trạng thái mute giữa các tab.
 *
 * Giống `initBranchCrossTabSync`: zustand `persist` chỉ ghi localStorage chứ
 * không tự đẩy thay đổi sang tab khác; sự kiện `storage` chỉ bắn ở các tab
 * *khác* tab đang ghi nên ta lắng nghe để cập nhật store cục bộ từng tab.
 *
 * @returns Hàm cleanup gỡ listener.
 */
export function initNotificationPrefsCrossTabSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: StorageEvent) => {
    if (e.key !== NOTIFICATION_PREFS_STORAGE_KEY) return;

    // Bị clear ở tab khác → coi như bật lại thông báo.
    if (!e.newValue) {
      if (useNotificationPrefsStore.getState().mutedUntil !== null) {
        useNotificationPrefsStore.getState().unmute();
      }
      return;
    }

    let next: number | null = null;
    try {
      // zustand persist bọc dữ liệu trong { state, version }.
      const parsed = JSON.parse(e.newValue);
      const raw = parsed?.state?.mutedUntil;
      next = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    } catch {
      return;
    }

    if (useNotificationPrefsStore.getState().mutedUntil === next) return;

    if (next === null) {
      useNotificationPrefsStore.getState().unmute();
    } else {
      useNotificationPrefsStore.getState().muteUntil(next);
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
