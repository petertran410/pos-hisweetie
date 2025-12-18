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

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranch: null,
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      clearSelectedBranch: () => set({ selectedBranch: null }),
    }),
    {
      name: "branch-storage",
    }
  )
);
