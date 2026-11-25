import type { AgentSubscriber, HttpAgent } from "@ag-ui/client";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import { ensureAccessToken, refreshAccessToken } from "@/lib/auth/session";

export type AiChatConfig = {
  enabled: boolean;
  ready: boolean;
  remaining: number | null;
  rateLimitPerDay: number | null;
  maxQuestionChars: number;
  retentionDays: number | null;
};
export type AiConversationSummary = { id: number; title: string; createdAt: string; updatedAt: string };
export type AiStoredMessage = { id: number; role: "user" | "assistant"; content: string; toolNames: string[]; createdAt: string };
export type AiShareLink = { token: string; updatedAt: string };
export type AiConversationDetail = AiConversationSummary & { messages: AiStoredMessage[]; share: AiShareLink | null };
/** Hội thoại người khác chia sẻ (bản chụp tới lúc chia sẻ). */
export type AiSharedConversation = { title: string; ownerName: string; sharedAt: string; messages: AiStoredMessage[] };

/** Link xem hội thoại được chia sẻ (cần đăng nhập POS). */
export const aiShareUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/chia-se-tro-ly/${token}`;

/** `STATE_SNAPSHOT` của trợ lý: hội thoại đã lưu ứng với thread. */
export type AssistantState = { conversation?: { id: number; title: string } };

/** Ngữ cảnh gửi kèm mỗi câu hỏi (`forwardedProps`). */
export type AiForwardedProps = { page: { path: string; title: string }; chatCustomerId?: number };

/** Một câu hỏi và câu trả lời của nó, như khung chat hiển thị. */
export type AiTurn = {
  id: string;
  question: string;
  answer: string;
  status: "running" | "done" | "stopped" | "error";
  /** Trợ lý đang làm gì ("Đang tra cứu hoá đơn…"); chỉ khi đang chạy. */
  statusText?: string | undefined;
  /** Các lần tra cứu đã dùng, tên ngắn ("Tổng hợp hoá đơn"). */
  tools: string[];
  error?: string | undefined;
};

/** Tên ngắn của công cụ cho dòng "Đã dùng: …". */
export const TOOL_SHORT: Record<string, string> = {
  invoices_summary: "Tổng hợp hoá đơn",
  orders_summary: "Tổng hợp đặt hàng",
  customer_lookup: "Tra cứu khách hàng",
  customer_debts: "Công nợ khách",
  stock_levels: "Tồn kho",
  leads_summary: "Tổng hợp lead",
  quotes_summary: "Tổng hợp báo giá",
  revenue_summary: "Tổng hợp doanh thu",
  smax_chats: "Tin nhắn Smax",
};

const toolShort = (name: string) => TOOL_SHORT[name] ?? "Tra cứu dữ liệu";

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Tin đã lưu → các lượt: mỗi câu hỏi kèm câu trả lời ngay sau nó. */
export function turnsFromStored(messages: readonly AiStoredMessage[]): AiTurn[] {
  const turns: AiTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ id: String(message.id), question: message.content, answer: "", status: "error", tools: [], error: "Câu hỏi này chưa có câu trả lời." });
    } else {
      const turn = turns.at(-1);
      if (turn && !turn.answer) {
        Object.assign(turn, { answer: message.content, status: "done", error: undefined, tools: [...new Set(message.toolNames.map(toolShort))] });
      }
    }
  }
  return turns;
}

/**
 * Một câu hỏi = một lượt chạy AG-UI (`POST /ai/agent`; `@ag-ui/client` chỉ tải khi hỏi lần đầu).
 * Thread là hội thoại đã lưu (id dạng chuỗi), hoặc id mới cho hội thoại mới; server giữ lịch sử
 * nên chỉ gửi câu hỏi mới. Token chỉ ở bộ nhớ: gắn khi gọi, gặp 401 thì làm mới 1 lần rồi gọi lại.
 * Không dùng timeout 30s của apiClient vì câu trả lời stream lâu hơn.
 */
export async function assistantAgent(threadId: string, question: string): Promise<HttpAgent> {
  const { HttpAgent } = await import("@ag-ui/client");
  return new HttpAgent({
    url: `${API_URL}/ai/agent`,
    threadId,
    initialMessages: [{ id: newId(), role: "user", content: question }],
    fetch: async (url, init) => {
      await ensureAccessToken();
      const send = () => {
        const headers = new Headers(init.headers);
        for (const [key, value] of Object.entries(getAuthHeaders())) headers.set(key, value);
        return fetch(url, { ...init, headers });
      };
      let res = await send();
      if (res.status === 401 && (await refreshAccessToken())) res = await send();
      return res;
    },
  });
}

/** Lỗi khiến câu hỏi không được nhận: trả câu hỏi về ô nhập, không thêm lượt. */
const REJECTED_CODES = new Set(["rate_limited", "invalid_question", "conversation_not_found"]);

export type RunOutcome = { started: boolean; finished: boolean; rejected: string | null; code: string | null };

/**
 * Dựng lượt đang chạy từ các sự kiện AG-UI. Chữ trước một lần gọi công cụ là lời dẫn của model,
 * không phải câu trả lời: câu trả lời là tin nhắn cuối cùng không dẫn tới công cụ.
 */
export function turnSubscriber(
  handlers: { update: (change: (turn: AiTurn) => AiTurn) => void; onConversation: (id: number) => void; stopping: () => boolean },
  outcome: RunOutcome,
): AgentSubscriber {
  const text = new Map<string, string>();
  const preambles = new Set<string>();
  const answerOf = () => [...text.entries()].filter(([id]) => !preambles.has(id)).at(-1)?.[1] ?? "";
  return {
    onRunStartedEvent: () => {
      outcome.started = true;
      handlers.update((turn) => ({ ...turn, statusText: "Đang suy nghĩ…" }));
    },
    onStateSnapshotEvent: ({ event }) => {
      const conversation = (event.snapshot as AssistantState | undefined)?.conversation;
      if (conversation) handlers.onConversation(conversation.id);
    },
    onTextMessageContentEvent: ({ event }) => {
      text.set(event.messageId, (text.get(event.messageId) ?? "") + event.delta);
      handlers.update((turn) => ({ ...turn, answer: answerOf(), statusText: "Đang trả lời…" }));
    },
    onToolCallStartEvent: ({ event }) => {
      if (event.parentMessageId) preambles.add(event.parentMessageId);
      const label = typeof event.metadata?.label === "string" ? event.metadata.label.replace(/(…|\.\.\.)\s*$/, "") : null;
      const short = toolShort(event.toolCallName);
      handlers.update((turn) => ({
        ...turn,
        answer: answerOf(),
        statusText: `${label ?? "Đang tra cứu dữ liệu"}…`,
        tools: turn.tools.includes(short) ? turn.tools : [...turn.tools, short],
      }));
    },
    onToolCallResultEvent: () => {
      handlers.update((turn) => ({ ...turn, statusText: "Đang soạn câu trả lời…" }));
    },
    onRunFinishedEvent: () => {
      outcome.finished = true;
      handlers.update((turn) => ({ ...turn, answer: answerOf(), status: "done", statusText: undefined }));
    },
    onRunErrorEvent: ({ event }) => {
      outcome.finished = true;
      outcome.code = event.code ?? null;
      const stopped = handlers.stopping();
      const message = event.message || "Trợ lý gặp lỗi. Vui lòng thử lại.";
      if (!stopped && event.code && REJECTED_CODES.has(event.code) && !answerOf()) {
        outcome.rejected = message;
        return;
      }
      handlers.update((turn) => ({
        ...turn,
        status: stopped ? "stopped" : "error",
        statusText: undefined,
        error: stopped ? undefined : message,
      }));
    },
  };
}

/** Ý nghĩa của một yêu cầu bị từ chối trước khi có sự kiện AG-UI nào. */
export function runFailureMessage(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Tài khoản của bạn chưa được dùng Trợ lý AI.";
  if (status === 429) return "Bạn hỏi nhanh quá, vui lòng đợi một chút rồi hỏi lại.";
  if (status === 503) return "Trợ lý AI đang tắt hoặc chưa sẵn sàng.";
  if (error instanceof TypeError) return "Không kết nối được máy chủ, thử lại.";
  return "Không gửi được câu hỏi, thử lại.";
}
