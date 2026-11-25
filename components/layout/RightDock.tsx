"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useAiAssistantStore } from "@/lib/store/aiAssistant";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";
import { useCan } from "@/lib/hooks/useCan";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";
import { useAiConfig } from "@/lib/hooks/useAiAssistant";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import { useActiveChannel } from "@/lib/chat/channels";
import { newCount } from "@/lib/chat/seen";
import { getEffectiveZoom } from "@/lib/utils/zoom";
import { ZaloChatSidebar } from "@/components/chat/ZaloChatSidebar";
import { AiAssistantPanel } from "@/components/ai-assistant/AiAssistantPanel";

// Bề rộng (px CSS) dùng để chọn bố cục khi mở cả chat lẫn trợ lý
const CHAT_WIDTH = 420;
const AI_WIDTH = 400;
const RAIL_WIDTH = 48;
// Hai khung cạnh nhau chỉ khi màn POS còn ít nhất chừng này (không phải 480 để bảng không chật)
const POS_MIN_SIDE = 720;
// ZaloChatSidebar luôn chừa 480px cho màn POS; cạnh nhau thì chừa thêm trợ lý + phần nâng lên 720
const SIDE_RESERVE = AI_WIDTH + (POS_MIN_SIDE - 480);

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
/** Bề rộng cửa sổ theo px CSS: innerWidth là px màn hình, html có zoom 0.85 → chia zoom. */
const cssViewportWidth = () => Math.round(window.innerWidth / getEffectiveZoom());

/**
 * Vùng phải của dashboard: khung chat Smax (ZaloChatSidebar) và panel Trợ lý AI.
 * - Chỉ mở một: như cũ (trợ lý nằm cạnh thanh chat thu gọn).
 * - Mở cả hai, màn POS còn ≥ 720px sau khi trừ chat 420 + trợ lý 400 + thanh 48: cạnh nhau, trợ lý bên trái.
 * - Không đủ chỗ: một khung có tab "Chat · khách" / "Trợ lý AI"; khung mở sau được chọn trước.
 * - Điện thoại: cả hai là sheet toàn màn hình; mở cái này thì cái kia lui về sau.
 * Cây phần tử giữ nguyên giữa các bố cục để câu trả lời đang stream không bị ngắt.
 */
export function RightDock() {
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { available } = useAiConfig();
  const aiStoreOpen = useAiAssistantStore((s) => s.open);
  const ownerId = useAiAssistantStore((s) => s.ownerId);
  const dockTab = useAiAssistantStore((s) => s.dockTab);
  const setAiOpen = useAiAssistantStore((s) => s.setOpen);
  const setDockTab = useAiAssistantStore((s) => s.setDockTab);
  const resetAi = useAiAssistantStore((s) => s.reset);
  const canChat = useCan("smax_chat", "view");
  const chatOpen = useChatSidebarStore((s) => s.open) && canChat;
  const panelWidth = useChatSidebarStore((s) => s.panelWidth);
  const cssWidth = useSyncExternalStore(subscribeResize, cssViewportWidth, () => 0);

  // Đổi tài khoản trên cùng máy: bỏ panel + hội thoại của người trước
  useEffect(() => {
    if (userId !== null && ownerId !== null && ownerId !== userId) resetAi(userId);
  }, [userId, ownerId, resetAi]);

  // Khung chat vừa mở (từ bất cứ đâu) → lên trước
  const prevChatOpen = useRef(chatOpen);
  useEffect(() => {
    if (chatOpen && !prevChatOpen.current) setDockTab("chat");
    prevChatOpen.current = chatOpen;
  }, [chatOpen, setDockTab]);

  // Trang /tro-ly đã là trợ lý toàn trang: không hiện panel
  const aiOpen = available && aiStoreOpen && ownerId === userId && !pathname.startsWith("/tro-ly");
  const mode = !aiOpen
    ? "chat"
    : !chatOpen
      ? "ai"
      : cssWidth - CHAT_WIDTH - AI_WIDTH - RAIL_WIDTH >= POS_MIN_SIDE
        ? "side"
        : "tabs";

  // Bảng chi tiết (…DetailRow) chỉ đo lại độ rộng khi window resize → báo khi bố cục đổi
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [mode, isMobile]);

  const closeAi = () => setAiOpen(false, userId);

  if (!isClient) return null;

  if (isMobile) {
    return (
      <>
        <ZaloChatSidebar />
        {aiOpen && (
          <AiAssistantPanel
            layout="sheet"
            onClose={closeAi}
            // Sheet chat ở z-50: trợ lý lên trên khi mở sau, lui xuống dưới khi chat mở sau
            className={!chatOpen || dockTab === "ai" ? "z-[55]" : "z-[45]"}
          />
        )}
      </>
    );
  }

  const tabs = mode === "tabs";
  const showAi = !tabs || dockTab === "ai";
  return (
    <div
      className={`flex min-h-0 shrink-0 ${tabs ? `flex-col border-l bg-white ${panelWidth ? "" : "w-[420px]"}` : ""}`}
      // Khung có tab giữ bề rộng của khung chat (kéo mép trái khung chat vẫn đổi được)
      style={tabs ? { ...(panelWidth ? { width: panelWidth } : {}), maxWidth: "calc(100vw / 0.85 - 480px)" } : undefined}
    >
      {tabs && <DockTabs active={dockTab} onSelect={setDockTab} />}
      <div className="flex min-h-0 flex-1">
        {aiOpen && <AiAssistantPanel layout={tabs ? "fill" : "side"} onClose={closeAi} className={showAi ? "" : "hidden"} />}
        <div className={tabs && dockTab === "ai" ? "hidden" : "contents"}>
          <ZaloChatSidebar embedded={tabs} reserveWidth={mode === "side" ? SIDE_RESERVE : 0} />
        </div>
      </div>
    </div>
  );
}

/** Tab "Chat · tên khách" (kèm số hội thoại chưa đọc như thanh chat) và "Trợ lý AI". */
function DockTabs({ active, onSelect }: { active: "chat" | "ai"; onSelect: (tab: "chat" | "ai") => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ownerId = useChatSidebarStore((s) => s.ownerId);
  const customer = useChatSidebarStore((s) => s.customer);
  const loose = useChatSidebarStore((s) => s.loose);
  const mine = ownerId === userId;
  const name = mine ? (loose ? loose.name || loose.zaloId : customer?.name) : null;
  // Cùng truy vấn với thanh chat thu gọn (dùng chung cache)
  const { channel } = useActiveChannel();
  const { data } = useRecentChats(!!channel && !channel.missing, channel?.pagePid, 30);
  const unread = (data?.items ?? []).filter((c) => c.unread || newCount(c.tid, c.messageCount) > 0).length;

  const tabClass = (on: boolean) =>
    `flex h-10 min-w-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 text-sm ${
      on ? "border-brand bg-brand-dark font-semibold text-white" : "border-transparent font-medium text-gray-500 hover:text-brand-deep"
    }`;
  return (
    <div role="tablist" aria-label="Chọn khung" className="chat-ui flex shrink-0 items-end gap-1 border-b px-3 pt-2">
      <button type="button" role="tab" aria-selected={active === "chat"} onClick={() => onSelect("chat")} className={tabClass(active === "chat")}>
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Chat{name ? ` · ${name}` : ""}</span>
        {unread > 0 && (
          <span className="shrink-0 rounded-full bg-red-400 px-1.5 text-[11px] font-bold leading-[18px] text-white" aria-label={`${unread} hội thoại chưa đọc`}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <button type="button" role="tab" aria-selected={active === "ai"} onClick={() => onSelect("ai")} className={tabClass(active === "ai")}>
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">Trợ lý AI</span>
      </button>
    </div>
  );
}
