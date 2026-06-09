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
    if (e.key !== BRANCH_STORAGE_KEY) return;

    // Bị clear (logout ở tab khác) → xóa branch cục bộ.
    if (!e.newValue) {
      if (useBranchStore.getState().selectedBranch !== null) {
        useBranchStore.getState().clearSelectedBranch();
        onChange?.(null);
      }
      return;
    }

    let nextBranch: Branch | null = null;
    try {
      // zustand persist bọc dữ liệu trong { state, version }.
      const parsed = JSON.parse(e.newValue);
      nextBranch = parsed?.state?.selectedBranch ?? null;
    } catch {
      return;
    }

    const current = useBranchStore.getState().selectedBranch;
    // Chỉ cập nhật khi thật sự khác để tránh re-render thừa.
    if (current?.id === nextBranch?.id) return;

    if (nextBranch) {
      useBranchStore.getState().setSelectedBranch(nextBranch);
    } else {
      useBranchStore.getState().clearSelectedBranch();
    }
    onChange?.(nextBranch);
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
