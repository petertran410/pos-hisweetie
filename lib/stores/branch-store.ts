// lib/stores/branch-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Branch } from "@/lib/api/branches";

interface BranchState {
  currentBranch: Branch | null;
  branches: Branch[];
  setBranch: (branch: Branch) => void;
  setBranches: (branches: Branch[]) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      currentBranch: null,
      branches: [],
      setBranch: (branch) => set({ currentBranch: branch }),
      setBranches: (branches) => set({ branches }),
    }),
    { name: "branch-storage" }
  )
);
