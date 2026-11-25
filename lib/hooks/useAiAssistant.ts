import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiAssistantApi } from "@/lib/api/aiAssistant";
import { useCan } from "@/lib/hooks/useCan";

/**
 * Cấu hình trợ lý cho người đang đăng nhập. Chỉ gọi khi có `ai_assistant:use` (thiếu quyền → 403).
 * `available` = có quyền và máy chủ đang bật trợ lý.
 */
export function useAiConfig() {
  const canUse = useCan("ai_assistant", "use");
  const query = useQuery({
    queryKey: ["aiConfig"],
    queryFn: aiAssistantApi.config,
    enabled: canUse,
    staleTime: 60_000,
    retry: false,
  });
  const config = canUse ? query.data : undefined;
  return { config, available: Boolean(config?.enabled), isLoading: canUse && query.isLoading };
}

/** Làm mới số câu còn lại sau mỗi lượt hỏi. */
export function useRefreshAiConfig() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: ["aiConfig"] }), [queryClient]);
}

/** 50 hội thoại gần nhất của chính mình (lọc theo tiêu đề). */
export function useAiConversations(search: string, enabled = true) {
  return useQuery({
    queryKey: ["aiConversations", search],
    queryFn: () => aiAssistantApi.conversations(search || undefined),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useAiConversation(id: number | null) {
  return useQuery({
    queryKey: ["aiConversation", id],
    queryFn: () => aiAssistantApi.conversation(id!),
    enabled: id !== null,
    retry: false,
    // Chỉ dùng để dựng khung chat lúc mở: không tải lại giữa chừng, đóng là bỏ cache
    // (mở lại thì tải mới, gồm cả các lượt vừa hỏi)
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => aiAssistantApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["aiConversations"] });
      queryClient.removeQueries({ queryKey: ["aiConversation", id] });
    },
    onError: (e: Error) => toast.error(e.message || "Không xoá được hội thoại"),
  });
}
