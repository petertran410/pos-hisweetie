import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LooseThread, ZaloContactKind } from "@/lib/types/smaxChat";

export interface ChatCustomerRef {
  id: number;
  code: string | null;
  name: string;
}

// Chiều cao tối thiểu ô soạn = 1 dòng (ô tự giãn theo nội dung tới COMPOSER_AUTO_MAX)
export const COMPOSER_DEFAULT_HEIGHT = 32;
// ~6 dòng chữ (line-height 20px + padding)
export const COMPOSER_AUTO_MAX = 132;

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
  // Tỷ lệ cột "Thông tin POS" / khung chat (kéo thanh chia giữa hai cột); null = 300px mặc định
  posRatio: number | null;
  // Chiều rộng thanh thu gọn (px) — kéo mép trái để hiện tên hội thoại; null = chỉ avatar
  railWidth: number | null;
  // "Đang chat gần đây": chỉ hiện hội thoại chưa đọc (nhớ cho lần sau)
  recentUnreadOnly: boolean;
  // Cột bên phải (khung rộng): Thông tin POS hay Thông tin hội thoại (ảnh, tệp, link)
  infoTab: "pos" | "chat";
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
  setPosRatio: (r: number | null) => void;
  setRailWidth: (w: number | null) => void;
  setRecentUnreadOnly: (v: boolean) => void;
  setInfoTab: (t: "pos" | "chat") => void;
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
      posRatio: null,
      railWidth: null,
      recentUnreadOnly: false,
      infoTab: "pos",
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
      setPosRatio: (posRatio) => set({ posRatio }),
      setRailWidth: (railWidth) => set({ railWidth }),
      setRecentUnreadOnly: (recentUnreadOnly) => set({ recentUnreadOnly }),
      setInfoTab: (infoTab) => set({ infoTab }),
    }),
    {
      name: "chat-sidebar",
      // v1: ô soạn tự giãn → chiều cao cũ (bố cục nút dọc) không còn đúng nghĩa, về mặc định
      version: 1,
      migrate: (persisted, version) => {
        const st = persisted as Partial<ChatSidebarState>;
        if (version < 1) st.composerHeight = COMPOSER_DEFAULT_HEIGHT;
        return st as ChatSidebarState;
      },
    }
  )
);
