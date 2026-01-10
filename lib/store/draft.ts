import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Tab } from "@/app/(dashboard)/ban-hang/page";

interface DraftState {
  drafts: Tab[];
  saveDrafts: (tabs: Tab[]) => void;
  clearDrafts: () => void;
  removeDraft: (tabId: string) => void;
  getDrafts: () => Tab[];
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      saveDrafts: (tabs) => {
        const validDrafts = tabs.filter(
          (tab) =>
            tab.cartItems.length > 0 ||
            tab.selectedCustomer ||
            tab.orderNote ||
            tab.discount > 0 ||
            tab.paymentAmount > 0
        );
        set({ drafts: validDrafts });
      },
      clearDrafts: () => set({ drafts: [] }),
      removeDraft: (tabId) => {
        const currentDrafts = get().drafts;
        set({ drafts: currentDrafts.filter((d) => d.id !== tabId) });
      },
      getDrafts: () => get().drafts,
    }),
    {
      name: "draft-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
