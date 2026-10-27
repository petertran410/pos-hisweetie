import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LooseThread, ZaloContactKind } from "@/lib/types/smaxChat";

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
  // Chiều rộng khung chat (px) — kéo mép trái để đổi; null = mặc định theo màn hình
  panelWidth: number | null;
  // Đang mở hội thoại chưa gắn khách POS (ưu tiên hơn `customer`)
  loose: LooseThread | null;
  openLoose: (thread: LooseThread, ownerId: number | null) => void;
  setOpen: (open: boolean) => void;
  selectCustomer: (customer: ChatCustomerRef | null, ownerId: number | null) => void;
  setKind: (kind: ZaloContactKind) => void;
  setGroupId: (groupId: number | null) => void;
  setPagePid: (pagePid: string | null) => void;
  setComposerHeight: (h: number) => void;
  setPanelWidth: (w: number | null) => void;
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
      panelWidth: null,
      loose: null,
      openLoose: (loose, ownerId) => set({ loose, ownerId, pagePid: loose.pagePid }),
      setOpen: (open) => set({ open }),
      selectCustomer: (customer, ownerId) =>
        set({ customer, ownerId, kind: "user", groupId: null, loose: null }),
      setKind: (kind) => set({ kind }),
      setGroupId: (groupId) => set({ groupId }),
      setPagePid: (pagePid) => set({ pagePid }),
      setComposerHeight: (composerHeight) => set({ composerHeight }),
      setPanelWidth: (panelWidth) => set({ panelWidth }),
    }),
    { name: "chat-sidebar" }
  )
);
