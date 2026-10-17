import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Branch {
  id: number;
  name: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
}

interface BranchState {
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch) => void;
  clearSelectedBranch: () => void;
}

const BRANCH_STORAGE_KEY = "branch-storage";

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      clearSelectedBranch: () => set({ selectedBranch: null }),
    }),
    {
      name: BRANCH_STORAGE_KEY,
    }
  )
);

/**
 * Đồng bộ chi nhánh đã chọn giữa các tab.
 *
 * Zustand `persist` chỉ ghi localStorage chứ KHÔNG tự đẩy thay đổi sang
 * các tab khác. Sự kiện `storage` của trình duyệt chỉ bắn ở các tab *khác*
 * tab đang ghi → ta lắng nghe nó để cập nhật store cục bộ của từng tab.
 *
 * @param onChange Gọi sau khi branch ở tab này được cập nhật do tab khác đổi
 *                 (dùng để invalidate cache TanStack Query, refetch dữ liệu).
 * @returns Hàm cleanup gỡ listener.
 */
export function initBranchCrossTabSync(
  onChange?: (branch: Branch | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (e: StorageEvent) => {
    // key === null: tab khác gọi localStorage.clear().
    if (e.key !== null && e.key !== BRANCH_STORAGE_KEY) return;

    const prevId = useBranchStore.getState().selectedBranch?.id ?? null;

    // Bị clear (logout ở tab khác) → rehydrate không reset state nên tự xóa.
    if (localStorage.getItem(BRANCH_STORAGE_KEY) === null) {
      if (prevId !== null) {
        useBranchStore.getState().clearSelectedBranch();
        onChange?.(null);
      }
      return;
    }

    // Đọc lại giá trị MỚI NHẤT trong storage (không dùng e.newValue — event
    // có thể đến trễ, đã cũ) và KHÔNG ghi ngược: rehydrate dùng `set` gốc,
    // không qua persist.setItem. Nếu ghi ngược (như setSelectedBranch), giá
    // trị cũ bị đưa lại vào storage → các tab dội event cho nhau vô hạn
    // (chi nhánh lật 1↔6 liên tục, mỗi lần lật refetch toàn bộ query).
    // localStorage đồng bộ nên rehydrate xong ngay trong lời gọi này.
    void useBranchStore.persist.rehydrate();

    const next = useBranchStore.getState().selectedBranch;
    if ((next?.id ?? null) === prevId) return;
    onChange?.(next);
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
