"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HttpAgent } from "@ag-ui/client";
import { Loader2, SendHorizontal, Square } from "lucide-react";
import { ChatMarkdown } from "./ChatMarkdown";
import {
  assistantAgent,
  newId,
  runFailureMessage,
  turnSubscriber,
  type AiForwardedProps,
  type AiTurn,
  type RunOutcome,
} from "@/lib/ai/ai-chat";

export type AiAssistantChatProps = {
  /** "panel": trong khung bên phải; "page": trang /tro-ly. */
  mode: "panel" | "page";
  conversationId: number | null;
  initialTurns: AiTurn[];
  /** Số câu còn được hỏi trong hôm nay; null khi không rõ / không giới hạn. */
  remaining: number | null;
  rateLimitPerDay: number | null;
  maxQuestionChars: number;
  /** Trang đang mở + khách đang chat: gửi kèm để "trang này", "khách này" có nghĩa. */
  context: AiForwardedProps;
  suggestions: string[];
  suggestionsTitle: string;
  onConversation?: (id: number) => void;
  onTurnDone?: () => void;
};

const STATUS_NOTE: Record<AiTurn["status"], string> = { running: "", done: "", stopped: "Đã dừng", error: "Không hoàn thành" };

function Suggestions({ items, onPick, disabled, compact }: { items: string[]; onPick: (question: string) => void; disabled: boolean; compact?: boolean }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${compact ? "max-h-28 overflow-y-auto" : ""}`}>
      {items.map((question) => (
        <li key={question}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(question)}
            className={`w-full rounded-[10px] border border-cyan-pale bg-white text-left leading-snug text-brand-deep hover:border-brand hover:bg-cyan-bg disabled:cursor-not-allowed disabled:opacity-55 ${
              compact ? "px-3 py-1.5 text-xs" : "min-h-[44px] px-3 py-2.5 text-sm"
            }`}
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TurnView({ turn }: { turn: AiTurn }) {
  const running = turn.status === "running";
  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[12px_12px_4px_12px] bg-brand-deep px-3 py-2.5 text-sm leading-snug text-white">
        {turn.question}
      </div>
      {/* Không aria-live ở đây: câu trả lời stream sẽ bị đọc lại từng mẩu. Vùng trạng thái bên dưới báo khi xong. */}
      <div
        className="flex flex-col gap-2 break-words rounded-xl border border-brand-border bg-white p-3 text-sm"
        aria-busy={running || undefined}
      >
        {turn.answer ? (
          <ChatMarkdown text={turn.answer} />
        ) : running ? null : (
          !turn.error && <p className="m-0 text-gray-500">(Không có câu trả lời)</p>
        )}
        {running && (
          <p className="m-0 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            {turn.statusText ?? "Đang trả lời…"}
          </p>
        )}
        {turn.error && (
          <p className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {turn.error}
          </p>
        )}
        {!running && (turn.tools.length > 0 || turn.status !== "done") && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {turn.tools.length > 0 && <span>Đã dùng: {turn.tools.join(", ")}</span>}
            {STATUS_NOTE[turn.status] && <span>{STATUS_NOTE[turn.status]}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hội thoại "Trợ lý AI": các lượt đã có, lượt đang stream từ AG-UI, gợi ý khi trống và ô hỏi.
 * Dùng chung cho panel bên phải và trang /tro-ly.
 */
export function AiAssistantChat(props: AiAssistantChatProps) {
  const [turns, setTurns] = useState<AiTurn[]>(props.initialTurns);
  const [live, setLive] = useState<AiTurn | null>(null);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const conversationRef = useRef(props.conversationId);
  const agentRef = useRef<HttpAgent | null>(null);
  const stoppingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const panel = props.mode === "panel";
  const pending = live !== null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [turns.length, live?.answer.length, live?.statusText]);

  const pick = (text: string) => {
    setQuestion(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const ask = async (text: string) => {
    setError(null);
    stoppingRef.current = false;
    let current: AiTurn = { id: newId(), question: text, answer: "", status: "running", statusText: "Đang gửi…", tools: [] };
    // Chữ trả lời về từng mẩu nhỏ: vẽ lại mỗi khung hình một lần, không phải mỗi mẩu
    let frame = 0;
    const update = (change: (turn: AiTurn) => AiTurn) => {
      current = change(current);
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; setLive(current); });
    };
    setLive(current);
    setQuestion("");
    const startedNew = conversationRef.current === null;
    const outcome: RunOutcome = { started: false, finished: false, rejected: null, code: null };
    try {
      // Hội thoại mới chạy trên thread id mới; server trả lại id hội thoại đã lưu (STATE_SNAPSHOT)
      const agent = await assistantAgent(conversationRef.current !== null ? String(conversationRef.current) : newId(), text);
      agentRef.current = agent;
      if (!stoppingRef.current) {
        await agent.runAgent(
          { forwardedProps: props.context },
          turnSubscriber(
            { update, onConversation: (id) => { conversationRef.current = id; }, stopping: () => stoppingRef.current },
            outcome,
          ),
        );
      }
    } catch (failure) {
      if (outcome.started && !outcome.rejected) {
        update((turn) => ({
          ...turn,
          status: stoppingRef.current ? "stopped" : "error",
          statusText: undefined,
          error: turn.error ?? (stoppingRef.current ? undefined : "Mất kết nối khi đang trả lời."),
        }));
      } else if (!stoppingRef.current && !outcome.rejected) {
        outcome.rejected = runFailureMessage(failure);
      }
    } finally {
      agentRef.current = null;
      if (frame) cancelAnimationFrame(frame);
    }

    // Hội thoại không còn (đã xoá ở nơi khác): câu tiếp theo mở hội thoại mới
    if (outcome.code === "conversation_not_found") conversationRef.current = null;

    if (!outcome.started || outcome.rejected) {
      // Server không nhận câu hỏi (từ chối, hoặc đã dừng trước): trả lại ô nhập, không thêm lượt
      setError(outcome.rejected);
      setQuestion(text);
      setLive(null);
      if (outcome.rejected) props.onTurnDone?.();
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (!outcome.finished) current = { ...current, status: stoppingRef.current ? "stopped" : "error", statusText: undefined };
    setTurns((items) => [...items, current]);
    setLive(null);
    setAnnounce(current.status === "done" ? "Đã trả lời xong" : current.status === "stopped" ? "Đã dừng" : "Trả lời không hoàn thành");
    if (startedNew && conversationRef.current !== null) props.onConversation?.(conversationRef.current);
    props.onTurnDone?.();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const remaining = props.remaining;
  const exhausted = remaining !== null && remaining <= 0;
  const submit = () => {
    const text = question.trim();
    if (!text || pending || exhausted) return;
    void ask(text);
  };
  const stop = () => {
    stoppingRef.current = true;
    agentRef.current?.abortRun();
  };
  const shown = live ? [...turns, live] : turns;
  const quota =
    remaining === null
      ? "Câu trả lời do AI tạo, hãy kiểm tra lại trên trang tương ứng"
      : `Còn ${Math.max(0, remaining)}${props.rateLimitPerDay ? `/${props.rateLimitPerDay}` : ""} câu hôm nay`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ai-surface">
      <div ref={scrollRef} className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto ${panel ? "p-4" : "px-4 py-5 sm:px-6"}`}>
        {shown.length === 0 && (
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="m-0 mb-1 text-base font-semibold text-brand-dark">{props.suggestionsTitle}</p>
              <p className="m-0 text-sm leading-normal text-gray-600">
                Trợ lý chỉ đọc dữ liệu POS trong phạm vi bạn được xem, không tạo, sửa hay xoá gì.
              </p>
            </div>
            {props.suggestions.length > 0 && <Suggestions items={props.suggestions} onPick={pick} disabled={pending || exhausted} />}
          </div>
        )}
        {shown.map((turn) => (
          <TurnView key={turn.id} turn={turn} />
        ))}
      </div>

      {/* Vùng trạng thái duy nhất: đổi theo từng bước và khi xong, không theo từng mẩu câu trả lời */}
      <p role="status" aria-live="polite" className="sr-only">
        {live ? (live.statusText ?? "Đang trả lời…") : announce}
      </p>

      <form
        className={`flex shrink-0 flex-col gap-2 border-t border-cyan-pale bg-ai-surface ${panel ? "px-4 pb-3.5 pt-3" : "px-4 pb-4 pt-3 sm:px-6"}`}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {error && (
          <p className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {panel && shown.length > 0 && props.suggestions.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500">Gợi ý cho trang này</summary>
            <div className="mt-2">
              <Suggestions items={props.suggestions} onPick={pick} disabled={pending || exhausted} compact />
            </div>
          </details>
        )}
        <label htmlFor={inputId} className="sr-only">
          Câu hỏi cho Trợ lý AI
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-brand-border-strong bg-white py-2 pl-3 pr-2 focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/10">
          <textarea
            ref={inputRef}
            id={inputId}
            rows={2}
            maxLength={props.maxQuestionChars}
            value={question}
            disabled={exhausted}
            readOnly={pending}
            placeholder={exhausted ? "Đã hết lượt hỏi hôm nay" : "Hỏi về đơn hàng, hoá đơn, công nợ, tồn kho… (Enter gửi, Shift+Enter xuống dòng)"}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              // Bộ gõ tiếng Việt xác nhận chữ bằng Enter: không gửi khi đang ghép chữ
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault();
                submit();
              }
            }}
            className="min-w-0 flex-1 resize-none border-0 bg-transparent text-sm text-brand-dark outline-none placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed"
          />
          {pending ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Dừng trả lời"
              title="Dừng"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-brand-border-strong bg-white px-3 text-sm font-medium text-brand-deep hover:bg-cyan-bg"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              Dừng
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Gửi câu hỏi"
              title="Gửi"
              disabled={exhausted || !question.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-deep text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-cyan-pale disabled:text-brand-deep"
            >
              <SendHorizontal className="h-[18px] w-[18px]" aria-hidden />
            </button>
          )}
        </div>
        <p className="m-0 text-xs text-gray-500">
          {quota} · Trợ lý chỉ đọc dữ liệu, không tạo hay sửa.
        </p>
      </form>
    </div>
  );
}
