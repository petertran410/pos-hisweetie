import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ZaloContactKind } from "@/lib/types/smaxChat";

export interface ChatCustomerRef {
  id: number;
  code: string | null;
  name: string;
}

export const COMPOSER_DEFAULT_HEIGHT = 58;

interface ChatSidebarState {
  open: boolean;
  // Người dùng sở hữu trạng thái (đổi tài khoản trên cùng máy → bỏ khách cũ)
  ownerId: number | null;
  customer: ChatCustomerRef | null;
  kind: ZaloContactKind;
  groupId: number | null;
  pagePid: string | null;
  // Chiều cao ô soạn tin (px) — kéo thanh phân cách để đổi
  composerHeight: number;
  setOpen: (open: boolean) => void;
  selectCustomer: (customer: ChatCustomerRef | null, ownerId: number | null) => void;
  setKind: (kind: ZaloContactKind) => void;
  setGroupId: (groupId: number | null) => void;
  setPagePid: (pagePid: string | null) => void;
  setComposerHeight: (h: number) => void;
}

export const useChatSidebarStore = create<ChatSidebarState>()(
  persist(
    (set) => ({
      open: false,
      ownerId: null,
      customer: null,
      kind: "user",
      groupId: null,
      pagePid: null,
      composerHeight: COMPOSER_DEFAULT_HEIGHT,
      setOpen: (open) => set({ open }),
      selectCustomer: (customer, ownerId) =>
        set({ customer, ownerId, kind: "user", groupId: null }),
      setKind: (kind) => set({ kind }),
      setGroupId: (groupId) => set({ groupId }),
      setPagePid: (pagePid) => set({ pagePid }),
      setComposerHeight: (composerHeight) => set({ composerHeight }),
    }),
    { name: "chat-sidebar" }
  )
);
