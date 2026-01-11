import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Tab } from "@/app/(dashboard)/ban-hang/page";

interface DraftState {
  drafts: Tab[];
  saveDrafts: (tabs: Tab[]) => void;
  updateDraft: (tab: Tab) => void;
  clearDrafts: () => void;
  removeDraft: (tabId: string) => void;
  getDrafts: () => Tab[];
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],

      saveDrafts: (tabs) => {
        const currentDrafts = get().drafts;
        const currentTabIds = tabs.map((t) => t.id);

        const oldDraftsNotInCurrentTabs = currentDrafts.filter(
          (draft) => !currentTabIds.includes(draft.id)
        );

        const validNewDrafts = tabs.filter(
          (tab) =>
            tab.cartItems.length > 0 ||
            tab.selectedCustomer ||
            tab.orderNote ||
            tab.discount > 0 ||
            tab.paymentAmount > 0
        );

        set({ drafts: [...oldDraftsNotInCurrentTabs, ...validNewDrafts] });
      },

      updateDraft: (tab) => {
        const isValidDraft =
          tab.cartItems.length > 0 ||
          tab.selectedCustomer ||
          tab.orderNote ||
          tab.discount > 0 ||
          tab.paymentAmount > 0;

        if (!isValidDraft) return;

        const currentDrafts = get().drafts;
        const existingIndex = currentDrafts.findIndex((d) => d.id === tab.id);

        if (existingIndex >= 0) {
          const updatedDrafts = [...currentDrafts];
          updatedDrafts[existingIndex] = tab;
          set({ drafts: updatedDrafts });
        } else {
          set({ drafts: [...currentDrafts, tab] });
        }
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
