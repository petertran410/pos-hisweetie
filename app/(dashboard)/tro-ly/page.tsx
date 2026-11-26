"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { AiAssistantChat } from "@/components/ai-assistant/AiAssistantChat";
import { AiShareButton } from "@/components/ai-assistant/AiShareButton";
import { useActiveChatCustomer } from "@/components/ai-assistant/AiAssistantPanel";
import { pageSuggestions, useHasPermission } from "@/components/ai-assistant/page-suggestions";
import {
  useAiConfig,
  useAiConversation,
  useAiConversations,
  useDeleteAiConversation,
  useRefreshAiConfig,
} from "@/lib/hooks/useAiAssistant";
import { useAiAssistantStore } from "@/lib/store/aiAssistant";
import { confirmAction } from "@/lib/chat/confirm";
import { turnsFromStored } from "@/lib/ai/ai-chat";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * "Trợ lý AI" (/tro-ly): bên trái hội thoại của chính mình (tìm, xoá), bên phải hội thoại đang mở.
 * `?c=<id>` là hội thoại; hội thoại mới có id trên URL sau câu trả lời đầu tiên.
 */
export default function AssistantPage() {
  return (
    <PagePermissionGuard resource="ai_assistant" action="use">
      <AssistantWorkspace />
    </PagePermissionGuard>
  );
}

function AssistantWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const current = Number(searchParams.get("c")) || null;
  const { config, isLoading: configLoading } = useAiConfig();
  const refreshConfig = useRefreshAiConfig();
  const can = useHasPermission();
  const chatCustomer = useActiveChatCustomer();
  const panelConversationId = useAiAssistantStore((s) => s.conversationId);
  const setPanelConversationId = useAiAssistantStore((s) => s.setConversationId);
  const enabled = Boolean(config?.enabled);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useAiConversations(query, enabled);
  const remove = useDeleteAiConversation();

  // Hội thoại trang này vừa tạo: đã có trên màn hình, không nạp lại khi id lên URL
  const [ownNew, setOwnNew] = useState<number | null>(null);
  const [newKey, setNewKey] = useState(0);
  const loadId = enabled && current !== null && current !== ownNew ? current : null;
  const opened = useAiConversation(loadId);
  const openedTurns = useMemo(() => (opened.data ? turnsFromStored(opened.data.messages) : []), [opened.data]);

  const startNew = () => {
    setOwnNew(null);
    setNewKey((k) => k + 1);
    router.replace("/tro-ly");
  };
  const openConversation = (id: number) => {
    setOwnNew(null);
    router.push(`/tro-ly?c=${id}`);
  };
  const deleteConversation = async (id: number, title: string) => {
    const ok = await confirmAction(`Xoá hội thoại "${title}"? Không khôi phục được.`, { title: "Xoá hội thoại", confirmText: "Xoá", danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
    } catch {
      return; // đã báo lỗi bằng toast
    }
    if (panelConversationId === id) setPanelConversationId(null);
    if (id === current) startNew();
  };

  if (configLoading) {
    return (
      <p className="m-0 flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang tải…
      </p>
    );
  }
  if (!config || !config.enabled) {
    return (
      <div className="p-6">
        <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {config ? "Trợ lý AI đang tắt trên máy chủ." : "Không tải được cấu hình Trợ lý AI."}
        </p>
      </div>
    );
  }

  const items = list.data?.items ?? [];
  const chatKey = current === null || current === ownNew ? `new-${newKey}` : `c${current}`;
  const chatReady = current === null || current === ownNew || opened.data;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <nav aria-label="Hội thoại của bạn" className="flex max-h-[38%] shrink-0 flex-col gap-2 border-b bg-white p-3 lg:max-h-none lg:w-[300px] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-dark text-[#7fdbe6]">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <h1 className="m-0 flex-1 text-base font-semibold text-brand-dark">Trợ lý AI</h1>
          <button
            type="button"
            onClick={startNew}
            className="flex h-8 items-center gap-1 rounded-lg border border-brand-border px-2.5 text-sm font-medium text-brand-deep hover:bg-cyan-bg"
          >
            <Plus className="h-4 w-4" aria-hidden /> Mới
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-brand-border px-2.5 focus-within:border-brand">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="sr-only">Tìm hội thoại</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm hội thoại"
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isLoading ? (
            <p className="m-0 p-2 text-sm text-gray-500">Đang tải…</p>
          ) : list.isError ? (
            <p className="m-0 p-2 text-sm text-red-600">Không tải được danh sách hội thoại.</p>
          ) : items.length === 0 ? (
            <p className="m-0 p-2 text-sm text-gray-500">{query ? "Không có hội thoại khớp." : "Chưa có hội thoại nào."}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {items.map((item) => {
                const active = item.id === current;
                return (
                  <li key={item.id} className={`group flex items-center gap-1 rounded-lg ${active ? "bg-cyan-bg" : "hover:bg-gray-50"}`}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => openConversation(item.id)}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left"
                    >
                      <span className={`line-clamp-2 text-sm ${active ? "font-semibold text-brand-dark" : "text-gray-800"}`}>{item.title}</span>
                      <small className="text-xs text-gray-500">{formatDateTime(item.updatedAt)}</small>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(item.id, item.title)}
                      disabled={remove.isPending}
                      aria-label={`Xoá hội thoại "${item.title}"`}
                      title="Xoá"
                      className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="m-0 text-xs text-gray-500">
          {config.retentionDays ? `Hội thoại tự xoá sau ${config.retentionDays} ngày. ` : ""}Chỉ bạn xem được.
        </p>
      </nav>

      <section aria-label="Hội thoại" className="flex min-h-0 min-w-0 flex-1 flex-col">
        {current !== null && !opened.isError && (
          <div className="flex shrink-0 items-center gap-2 border-b bg-white px-4 py-2 sm:px-6">
            <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium text-brand-dark">
              {opened.data?.title ?? items.find((item) => item.id === current)?.title ?? "Hội thoại"}
            </p>
            <AiShareButton conversationId={current} tone="light" />
          </div>
        )}
        {opened.isError ? (
          <div className="p-6">
            <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Không mở được hội thoại này (đã xoá hoặc không phải của bạn). Chọn hội thoại khác hoặc bắt đầu hội thoại mới.
            </p>
          </div>
        ) : !chatReady ? (
          <p className="m-0 flex items-center gap-2 p-6 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang mở hội thoại…
          </p>
        ) : (
          <AiAssistantChat
            key={chatKey}
            mode="page"
            conversationId={current}
            initialTurns={current === null || current === ownNew ? [] : openedTurns}
            remaining={config.remaining}
            rateLimitPerHour={config.rateLimitPerHour}
            maxQuestionChars={config.maxQuestionChars}
            context={{ page: { path: "/tro-ly", title: "Trợ lý AI" }, ...(chatCustomer ? { chatCustomerId: chatCustomer.id } : {}) }}
            suggestions={pageSuggestions("/", can, Boolean(chatCustomer))}
            suggestionsTitle="Hỏi về dữ liệu bán hàng của công ty"
            onConversation={(id) => {
              setOwnNew(id);
              router.replace(`/tro-ly?c=${id}`);
            }}
            onTurnDone={() => {
              refreshConfig();
              queryClient.invalidateQueries({ queryKey: ["aiConversations"] });
            }}
          />
        )}
      </section>
    </div>
  );
}
