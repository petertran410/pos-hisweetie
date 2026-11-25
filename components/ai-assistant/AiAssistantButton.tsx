"use client";

import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useAiAssistantStore } from "@/lib/store/aiAssistant";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";
import { useCan } from "@/lib/hooks/useCan";
import { useAiConfig } from "@/lib/hooks/useAiAssistant";

/**
 * Nút "Trợ lý AI" trên header: bật / tắt panel trợ lý. Đang mở cùng chat mà chat ở trước
 * (tab Chat, hay sheet chat trên điện thoại) thì bấm để đưa trợ lý lên trước.
 * Ẩn khi thiếu quyền `ai_assistant:use` hoặc máy chủ đang tắt trợ lý.
 */
export function AiAssistantButton({ variant }: { variant: "desktop" | "mobile" }) {
  const { available } = useAiConfig();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const open = useAiAssistantStore((s) => s.open && s.ownerId === userId);
  const dockTab = useAiAssistantStore((s) => s.dockTab);
  const setOpen = useAiAssistantStore((s) => s.setOpen);
  const setDockTab = useAiAssistantStore((s) => s.setDockTab);
  const canChat = useCan("smax_chat", "view");
  const chatOpen = useChatSidebarStore((s) => s.open);
  if (!available) return null;

  const behindChat = open && canChat && chatOpen && dockTab !== "ai";
  const onClick = () => (behindChat ? setDockTab("ai") : setOpen(!open, userId));

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={open}
        aria-label={open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
        className={`p-2 rounded transition-colors ${open ? "bg-cyan-bg text-brand-deep" : "hover:bg-brand-header-hover"}`}
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      title={behindChat ? "Chuyển sang Trợ lý AI" : open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
      className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 font-semibold transition-colors ${
        open ? "border-brand bg-cyan-bg text-brand-deep" : "border-transparent hover:bg-brand-header-hover"
      }`}
    >
      <Sparkles className="w-4 h-4" aria-hidden />
      {/* Dưới xl chỉ còn biểu tượng (tên ở title) để header không tràn */}
      <span className="hidden xl:inline whitespace-nowrap">Trợ lý AI</span>
    </button>
  );
}
