import { apiClient } from "@/lib/config/api";
import type { AiChatConfig, AiConversationDetail, AiConversationSummary, AiShareLink, AiSharedConversation } from "@/lib/ai/ai-chat";

/** Trợ lý AI (`/ai/*`, quyền `ai_assistant:use`). Hỏi đáp đi qua AG-UI, xem lib/ai/ai-chat.ts. */
export const aiAssistantApi = {
  config: (): Promise<AiChatConfig> => apiClient.get("/ai/config"),
  conversations: (search?: string): Promise<{ items: AiConversationSummary[] }> =>
    apiClient.get("/ai/conversations", search ? { search } : undefined),
  conversation: (id: number): Promise<AiConversationDetail> => apiClient.get(`/ai/conversations/${id}`),
  remove: (id: number): Promise<{ ok: true }> => apiClient.delete(`/ai/conversations/${id}`),
  /** Tạo link chia sẻ, hoặc dời bản chụp tới tin mới nhất (giữ nguyên link). */
  share: (id: number): Promise<AiShareLink> => apiClient.post(`/ai/conversations/${id}/share`),
  unshare: (id: number): Promise<{ ok: true }> => apiClient.delete(`/ai/conversations/${id}/share`),
  /** Xem hội thoại được chia sẻ: chỉ cần đăng nhập. */
  shared: (token: string): Promise<AiSharedConversation> => apiClient.get(`/ai/shared/${encodeURIComponent(token)}`),
};
