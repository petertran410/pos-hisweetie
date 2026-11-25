"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Maximize2, Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useAiAssistantStore } from "@/lib/store/aiAssistant";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";
import { useCan } from "@/lib/hooks/useCan";
import { useAiConfig, useAiConversation, useRefreshAiConfig } from "@/lib/hooks/useAiAssistant";
import { resolveTitle } from "@/components/layout/PageTitle";
import { turnsFromStored, type AiForwardedProps } from "@/lib/ai/ai-chat";
import { AiAssistantChat } from "./AiAssistantChat";
import { AiShareButton } from "./AiShareButton";
import { pageSuggestions, useHasPermission } from "./page-suggestions";

/** Tên trang cho "Đang xem: …" (cùng bảng tiêu đề tab trình duyệt). */
export function pageNameOf(path: string): string {
  const title = (resolveTitle(path) ?? "").replace(/\s*\|\s*Hisweetie$/, "");
  return !title || title === "Hisweetie" ? "Trang POS" : title;
}

/** `page.path` gửi server phải khớp `^/[\w\-/]*$`. */
const safePath = (path: string) => (/^\/[\w\-/]*$/.test(path) ? path : "/");

/** Khách POS đang mở trong khung chat Smax (khung đang mở, đúng tài khoản), nếu có. */
export function useActiveChatCustomer() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const canChat = useCan("smax_chat", "view");
  const chatOpen = useChatSidebarStore((s) => s.open);
  const ownerId = useChatSidebarStore((s) => s.ownerId);
  const customer = useChatSidebarStore((s) => s.customer);
  const loose = useChatSidebarStore((s) => s.loose);
  if (!canChat || !chatOpen || ownerId !== userId || loose) return null;
  return customer;
}

export type AiPanelLayout = "side" | "fill" | "sheet";

const LAYOUT_CLASS: Record<AiPanelLayout, string> = {
  // Cạnh màn POS / cạnh khung chat: rộng 400px, vạch trái màu brand
  side: "w-[400px] shrink-0 border-l-[3px] border-brand",
  // Trong khung có tab: chiếm hết bề rộng khung
  fill: "min-w-0 flex-1",
  // Điện thoại: toàn màn hình như sheet chat
  sheet: "fixed top-0 left-0",
};

/**
 * Panel "Trợ lý AI" ở vùng phải: gợi ý theo trang đang mở, mỗi câu hỏi gửi kèm trang + khách đang
 * chat. Hội thoại giữ qua các lần đổi trang và tải lại (id lưu trong store). "Mở rộng" sang /tro-ly.
 */
export function AiAssistantPanel({ layout, onClose, className = "" }: { layout: AiPanelLayout; onClose: () => void; className?: string }) {
  const pathname = usePathname();
  const { config } = useAiConfig();
  const refreshConfig = useRefreshAiConfig();
  const can = useHasPermission();
  const conversationId = useAiAssistantStore((s) => s.conversationId);
  const setConversationId = useAiAssistantStore((s) => s.setConversationId);
  const chatCustomer = useActiveChatCustomer();
  // Hội thoại mở lại lúc panel hiện ra; hội thoại do chính panel tạo sau đó không nạp lại
  const [restoreId] = useState(conversationId);
  const restore = useAiConversation(restoreId);
  const [fresh, setFresh] = useState<string | null>(null);
  const restoredTurns = useMemo(() => (restore.data ? turnsFromStored(restore.data.messages) : []), [restore.data]);

  // Hội thoại đã bị xoá / không còn là của mình: quên đi, bắt đầu hội thoại mới
  const restoreFailed = restore.isError;
  useEffect(() => {
    if (restoreFailed) setConversationId(null);
  }, [restoreFailed, setConversationId]);

  const pageName = pageNameOf(pathname);
  const context: AiForwardedProps = {
    page: { path: safePath(pathname), title: pageName },
    ...(chatCustomer ? { chatCustomerId: chatCustomer.id } : {}),
  };
  const suggestions = pageSuggestions(pathname, can, Boolean(chatCustomer));
  const subtitle = `Đang xem: ${pageName}${chatCustomer ? ` · chat với ${chatCustomer.code || chatCustomer.name}` : ""}`;

  const newConversation = () => {
    setConversationId(null);
    setFresh(`new-${Date.now()}`);
  };

  const restoring = fresh === null && restoreId !== null && restore.isLoading;
  const chat =
    fresh !== null || restoreId === null || restoreFailed
      ? { key: fresh ?? "new", id: null, turns: [] }
      : restore.data
        ? { key: `c${restoreId}`, id: restoreId, turns: restoredTurns }
        : null;

  return (
    <aside
      aria-label="Trợ lý AI"
      className={`chat-ui flex min-h-0 flex-col bg-ai-surface ${LAYOUT_CLASS[layout]} ${className}`}
      // html { zoom: 0.85 } → bù kích thước viewport (như sheet chat)
      style={layout === "sheet" ? { width: "calc(100vw / 0.85)", height: "calc(100dvh / 0.85)" } : undefined}
      onKeyDown={(event) => {
        // Esc đóng panel khi đang thao tác trong panel (không cướp Esc của màn POS)
        if (event.key === "Escape" && !event.defaultPrevented && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex shrink-0 items-center gap-2 bg-brand-dark py-3 pl-4 pr-3 text-white">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.12] text-[#7fdbe6]">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[15px] font-semibold leading-tight">Trợ lý AI</h2>
          <p className="m-0 truncate text-xs text-cyan-pale" title={subtitle}>
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={newConversation}
          title="Bắt đầu hội thoại mới"
          className="chat-tap h-8 shrink-0 rounded-lg border border-white/35 px-2.5 text-[13px] hover:bg-white/10"
        >
          Mới
        </button>
        <AiShareButton conversationId={conversationId} tone="dark" />
        <Link
          href={conversationId !== null ? `/tro-ly?c=${conversationId}` : "/tro-ly"}
          aria-label="Mở rộng ra trang Trợ lý AI"
          title="Mở rộng (lịch sử hội thoại)"
          className="chat-tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/35 hover:bg-white/10"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng Trợ lý AI"
          title="Đóng (Esc)"
          className="chat-tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/35 hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {config && !config.ready && (
        <p className="m-0 shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Trợ lý AI chưa sẵn sàng trên máy chủ, câu hỏi có thể chưa được trả lời.
        </p>
      )}

      {!config || restoring || !chat ? (
        <p className="m-0 flex items-center gap-2 p-4 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {restoring ? "Đang mở lại hội thoại…" : "Đang tải…"}
        </p>
      ) : (
        <AiAssistantChat
          key={chat.key}
          mode="panel"
          conversationId={chat.id}
          initialTurns={chat.turns}
          remaining={config.remaining}
          rateLimitPerHour={config.rateLimitPerHour}
          maxQuestionChars={config.maxQuestionChars}
          context={context}
          suggestions={suggestions}
          suggestionsTitle={`Gợi ý cho trang ${pageName}`}
          onConversation={setConversationId}
          onTurnDone={refreshConfig}
        />
      )}
    </aside>
  );
}
