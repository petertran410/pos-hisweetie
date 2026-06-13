import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  branchId?: number;
  branchIds?: number[];
  supplierId?: number | null;
  roles: string[];
  permissions: string[];
  canViewOtherStaffData?: boolean;
  canViewOnlyOwnPackings?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  // Đánh dấu permissions/roles đã được đồng bộ với backend trong session hiện tại.
  // - Sau rehydrate từ localStorage: false (vì là snapshot cũ, có thể stale).
  // - Sau login hoặc refetch /auth/profile thành công: true.
  // PagePermissionGuard và RouteGuard dùng cờ này để tránh hiện "Không có quyền"
  // dựa trên cache cũ trước khi backend kịp xác nhận.
  isProfileSynced: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (patch: Partial<User>) => void;
  clearAuth: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setProfileSynced: (synced: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      isProfileSynced: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          // setAuth được gọi sau khi đã fetch profile từ backend (login,
          // refetch profile, đổi branch) → coi như đã sync.
          isProfileSynced: true,
        }),
      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },
      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isProfileSynced: false,
        }),
      setHasHydrated: (hasHydrated) =>
        set({
          _hasHydrated: hasHydrated,
        }),
      setProfileSynced: (synced) =>
        set({
          isProfileSynced: synced,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist user + token + isAuthenticated.
      // KHÔNG persist isProfileSynced/_hasHydrated — đây là state runtime,
      // mỗi lần load trang mới phải re-sync với backend trước khi tin cache.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sau khi rehydrate xong: đánh dấu hydrate hoàn tất nhưng
        // KHÔNG set isProfileSynced=true — buộc layer trên (RouteGuard)
        // phải gọi /auth/profile để xác nhận permissions còn đúng.
        state?.setHasHydrated(true);
      },
    }
  )
);
