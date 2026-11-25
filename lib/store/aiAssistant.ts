import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiDockTab = "chat" | "ai";

interface AiAssistantState {
  open: boolean;
  // Người dùng sở hữu trạng thái (đổi tài khoản trên cùng máy → không thấy hội thoại của người trước)
  ownerId: number | null;
  // Hội thoại đang mở trong panel (mở lại sau khi tải lại trang)
  conversationId: number | null;
  // Khung mở sau cùng ở vùng phải: chọn tab này khi không đủ chỗ cho cả chat lẫn trợ lý
  dockTab: AiDockTab;
  setOpen: (open: boolean, ownerId: number | null) => void;
  setConversationId: (conversationId: number | null) => void;
  setDockTab: (dockTab: AiDockTab) => void;
  /** Về trạng thái trống cho tài khoản `ownerId`. */
  reset: (ownerId: number | null) => void;
}

export const useAiAssistantStore = create<AiAssistantState>()(
  persist(
    (set) => ({
      open: false,
      ownerId: null,
      conversationId: null,
      dockTab: "ai",
      setOpen: (open, ownerId) => set(open ? { open, ownerId, dockTab: "ai" } : { open }),
      setConversationId: (conversationId) => set({ conversationId }),
      setDockTab: (dockTab) => set({ dockTab }),
      reset: (ownerId) => set({ open: false, ownerId, conversationId: null, dockTab: "ai" }),
    }),
    { name: "ai-assistant" }
  )
);
