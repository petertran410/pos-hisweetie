import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SandboxState {
  isSandbox: boolean;
  _hasHydrated: boolean;
  toggleSandbox: () => void;
  setSandbox: (value: boolean) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set, get) => ({
      isSandbox: false,
      _hasHydrated: false,

      toggleSandbox: () => set({ isSandbox: !get().isSandbox }),
      setSandbox: (value) => set({ isSandbox: value }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "sandbox-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
