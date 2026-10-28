"use client";

import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Copy, Download, FileText, Forward, MoreHorizontal, Play, Quote, RotateCw } from "lucide-react";
import type { ThreadSource } from "@/lib/chat/threadSource";
import type {
  ChatContext,
  ChatDraft,
  ChatMessage,
  ChatMessagesPage,
  RecentChat,
} from "@/lib/types/smaxChat";
import { ChatComposer } from "./ChatComposer";
import { ChatThreadHeader } from "./ChatThreadHeader";
import { ZaloAvatar } from "./ZaloAvatar";
import { stickerUrl } from "@/lib/chat/stickers";
import { markSeen } from "@/lib/chat/seen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SendConfirmDialog } from "./SendConfirmDialog";
import { MessageMenu } from "./MessageMenu";
import { ForwardDialog } from "./ForwardDialog";
import { applyReaction, ReactionBar, type ReactionIcon, type Reactions } from "./MessageReactions";
import { confirmAction } from "@/lib/chat/confirm";
import { toast } from "sonner";
import { copyMessages, downloadMessagesMedia, messagePreview, messageThumb } from "@/lib/chat/messageActions";
import {
  AttachmentPreviewModal,
  NoReferrerVideo,
  isImage,
  isVideo,
} from "./AttachmentPreviewModal";

interface Props {
  // Chat theo khách POS hoặc hội thoại chưa gắn khách (lib/chat/threadSource)
  source: ThreadSource;
  channelName: string;
  recipientLabel: string;
  confirmBeforeSend: boolean;
  sendDisabledReason: string | null;
  // null: hội thoại chưa gắn khách → không có menu "/" / kéo thả thông tin POS
  ctx: ChatContext | null;
  // Nút Trực tiếp/Nhóm… đặt cùng hàng avatar + tên Zalo; chọn nhóm (nếu nhiều) ở dưới
  headerActions?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

interface Pending {
  key: string;
  draft: ChatDraft;
  sentAt: number;
  status: "sending" | "sent" | "error";
  error?: string;
}

const dayLabel = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const timeLabel = (d: string) =>
  new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

/** Khoảng cách (px CSS) từ mép trên khung cuộn tới tin; rect bị nhân CSS zoom của <html> → quy đổi. */
function rowOffset(el: HTMLElement, row: Element) {
  const z = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
  return (row.getBoundingClientRect().top - el.getBoundingClientRect().top) / z;
}

/** Lịch sử tin (cũ → mới) + gửi tin. Cha đặt `key` theo kênh/contact để reset. */
export function ChatThread({
  source,
  channelName,
  recipientLabel,
  confirmBeforeSend,
  sendDisabledReason,
  ctx,
  headerActions,
  headerExtra,
}: Props) {
  const queryClient = useQueryClient();
  const messagesKey = ["smaxThreadMessages", source.key];
  // Trang tin mới nhất, poll 5s khi mở và tab đang hiển thị
  const latest = useQuery({
    queryKey: messagesKey,
    queryFn: () => source.fetchPage(),
    // Dừng poll khi lỗi: v5 đưa query chưa có data về pending mỗi lần fetch →
    // kẹt skeleton + toast lỗi lặp lại. Người dùng bấm "Thử lại" để tải lại.
    refetchInterval: (query) => (query.state.status === "error" ? false : 5_000),
    refetchIntervalInBackground: false,
    retry: false,
  });
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirmDraft, setConfirmDraft] = useState<ChatDraft | null>(null);
  const [restore, setRestore] = useState<{ draft: ChatDraft; nonce: number } | null>(null);
  // Trả lời / chọn nhiều / menu thao tác / chuyển tiếp
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; messages: ChatMessage[] } | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Đang ở gần đáy → tin mới tự cuộn xuống; đang đọc tin cũ → giữ nguyên vị trí
  const stickBottom = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  // Tin cuối cùng người dùng đã thấy (khi còn ở đáy) → đếm "tin mới" khi đang cuộn lên
  const [seenUpTo, setSeenUpTo] = useState<string | null>(null);
  // Mốc cuộn trước khi chèn tin cũ lên đầu
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  // Tin đầu tiên đang thấy + khoảng cách tới mép trên khung (cập nhật khi cuộn)
  const readAnchor = useRef<{ id: string; offset: number } | null>(null);
  const olderBusy = useRef(false);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of [...older, ...(latest.data?.messages ?? [])]) byId.set(m.id, m);
    return [...byId.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [older, latest.data]);

  // Cảm xúc vừa thả: hiện ngay tới khi Smax trả dữ liệu khác (base = cảm xúc lúc thả) hoặc hết 30s
  const [reactOverrides, setReactOverrides] = useState<Record<string, { base: string; value: Reactions }>>({});
  const shownMessages = useMemo(
    () =>
      messages.map((m) => {
        const o = reactOverrides[m.id];
        return o && o.base === JSON.stringify(m.reactions ?? []) ? { ...m, reactions: o.value } : m;
      }),
    [messages, reactOverrides]
  );
  const items = useMemo(() => groupAlbums(shownMessages), [shownMessages]);

  // Đang mở hội thoại → coi như đã xem: cập nhật mốc "tin mới" theo số tin Smax đếm
  useEffect(() => {
    const tid = `zlw${source.zaloId}`;
    for (const [, d] of queryClient.getQueriesData<{ items: RecentChat[] }>({ queryKey: ["smaxRecentChats"] })) {
      const hit = d?.items.find((i) => i.tid === tid);
      if (hit) markSeen(tid, hit.messageCount);
    }
  }, [latest.data, source.zaloId, queryClient]);
  // Tên + avatar người gửi: gộp dần qua các lần poll (tin cũ tải thêm không kèm bảng này)
  const [senders, setSenders] = useState<NonNullable<ChatMessagesPage["senders"]>>({});
  const latestSenders = latest.data?.senders;
  useEffect(() => {
    if (latestSenders) setSenders((cur) => ({ ...cur, ...latestSenders }));
  }, [latestSenders]);
  const threadStickerIds = useMemo(
    () => [...new Set(messages.filter((m) => m.stickerId).map((m) => m.stickerId!).reverse())].slice(0, 24),
    [messages]
  );

  // Tin đã gửi (hoặc báo lỗi nhưng thực ra đã tới) được ẩn khi Smax trả về tin tương ứng (có tệp: tin có đính kèm của mình)
  const visiblePending = pending.filter(
    (p) =>
      p.status === "sending" ||
      !messages.some(
        (m) =>
          m.fromMe &&
          new Date(m.createdAt).getTime() >= p.sentAt - 60_000 &&
          (p.draft.stickerId
            ? m.stickerId === p.draft.stickerId
            : p.draft.attachments.length || p.draft.productImages?.length
              ? m.attachments.length > 0
              : m.text === p.draft.text)
      )
  );

  // Trước khi trình duyệt vẽ: chèn tin cũ → giữ nguyên tin đang đọc; tin mới → chỉ cuộn khi đang ở đáy
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const anchor = prependAnchor.current;
    if (anchor) {
      prependAnchor.current = null;
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
    } else if (stickBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, visiblePending.length]);

  // Ảnh/video tải xong làm cao thêm → vẫn bám đáy nếu đang ở đáy.
  // Khung tin thấp đi (ô soạn cao lên khi trả lời/đính kèm) → giữ nguyên tin ở mép dưới, không bị che.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    let prevHeight = el.clientHeight;
    let prevWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const delta = prevHeight - el.clientHeight;
      const widthChanged = el.clientWidth !== prevWidth;
      prevHeight = el.clientHeight;
      prevWidth = el.clientWidth;
      if (stickBottom.current) el.scrollTop = el.scrollHeight;
      else if (widthChanged && readAnchor.current) {
        // Kéo đổi độ rộng → tin dàn lại dòng: giữ tin đang đọc ở đúng chỗ cũ
        const { id, offset } = readAnchor.current;
        const row = el.querySelector(`[data-msg-id="${CSS.escape(id)}"]`);
        if (row) el.scrollTop += rowOffset(el, row) - offset;
      } else if (delta) el.scrollTop += delta;
    });
    ro.observe(content);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Chọn trả lời → cuộn để tin được trích dẫn hiện đủ (sau khi ô soạn đã cao lên)
  useEffect(() => {
    if (!replyTo) return;
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      const row = el?.querySelector(`[data-msg-ids~="${replyTo.id}"]`);
      if (!el || !row) return;
      const r = row.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      // Toạ độ rect bị nhân CSS zoom của <html>, scrollTop thì không
      const z = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
      // Cuộn tức thì (cuộn mượt bị chế độ bám đáy kéo ngược lại); bám đáy tự bật lại qua onScroll
      if (r.top < box.top) {
        stickBottom.current = false;
        el.scrollTop -= (box.top - r.top) / z + 8;
      } else if (r.bottom > box.bottom) {
        el.scrollTop += (r.bottom - box.bottom) / z + 8;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [replyTo]);

  const lastId = messages[messages.length - 1]?.id ?? null;
  useEffect(() => {
    if (atBottom) setSeenUpTo(lastId);
  }, [atBottom, lastId]);
  const unseenCount = useMemo(() => {
    if (atBottom || !seenUpTo) return 0;
    const i = messages.findIndex((m) => m.id === seenUpTo);
    return i < 0 ? 0 : messages.slice(i + 1).filter((m) => !m.fromMe).length;
  }, [atBottom, seenUpTo, messages]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickBottom.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const hasMore = olderHasMore ?? latest.data?.hasMore ?? false;

  const loadOlder = async () => {
    const oldest = messages[0];
    // onScroll bắn liên tục trước khi state loadingOlder kịp cập nhật
    if (!oldest || olderBusy.current) return;
    olderBusy.current = true;
    setLoadingOlder(true);
    try {
      const page = await source.fetchPage(oldest.createdAt);
      const el = scrollRef.current;
      // Đo ngay trước khi chèn (người dùng có thể đã cuộn trong lúc chờ tải)
      if (el && page.messages.length) {
        stickBottom.current = false;
        prependAnchor.current = { height: el.scrollHeight, top: el.scrollTop };
      }
      setOlder((o) => [...page.messages, ...o]);
      setOlderHasMore(page.hasMore);
    } finally {
      olderBusy.current = false;
      setLoadingOlder(false);
    }
  };

  const canReact = !!latest.data?.canReact && !sendDisabledReason;
  const react = async (m: ChatMessage, icon: ReactionIcon | "NONE") => {
    // Thu hồi không cần xác nhận; thả mới hỏi khi ở môi trường thử nghiệm
    if (
      confirmBeforeSend &&
      icon !== "NONE" &&
      !(await confirmAction("Môi trường thử nghiệm — cảm xúc sẽ hiện trên Zalo của khách thật.", {
        title: "Thả cảm xúc",
        confirmText: "Đồng ý",
      }))
    )
      return;
    const base = JSON.stringify(m.reactions ?? []);
    const current = reactOverrides[m.id]?.base === base ? reactOverrides[m.id].value : m.reactions;
    setReactOverrides((o) => ({ ...o, [m.id]: { base, value: applyReaction(current, icon) } }));
    const clear = () =>
      setReactOverrides((o) => {
        const next = { ...o };
        delete next[m.id];
        return next;
      });
    try {
      await source.react(m.id, icon, confirmBeforeSend || undefined);
      queryClient.invalidateQueries({ queryKey: messagesKey });
      setTimeout(clear, 30_000);
    } catch (e) {
      clear();
      toast.error((e as Error).message || "Không thả được cảm xúc");
    }
  };

  const doSend = async (draft: ChatDraft, key = `p${Date.now()}`) => {
    stickBottom.current = true;
    setPending((p) => [
      ...p.filter((x) => x.key !== key),
      { key, draft, sentAt: Date.now(), status: "sending" },
    ]);
    const productIds = (draft.productImages ?? []).filter((i) => !i.kind).map((i) => i.id);
    const slipIds = (draft.productImages ?? []).filter((i) => i.kind === "packingSlip").map((i) => i.id);
    try {
      await source.send({
        text: draft.text || undefined,
        attachments: draft.attachments.length
          ? draft.attachments.map(({ path, kind, name }) => ({ path, kind, name }))
          : undefined,
        qrImageUrl: draft.qrImageUrl,
        productImageIds: productIds.length ? productIds : undefined,
        packingSlipImageIds: slipIds.length ? slipIds : undefined,
        // Báo đơn 1 ảnh: ảnh trước, nội dung sau (như mẫu báo đơn)
        imagesFirst:
          slipIds.length === 1 && !productIds.length && !draft.attachments.length && !draft.qrImageUrl
            ? true
            : undefined,
        stickerId: draft.stickerId,
        replyToPid: draft.replyTo?.pid,
        confirmed: confirmBeforeSend || undefined,
      });
      queryClient.invalidateQueries({ queryKey: messagesKey });
      setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "sent" } : x)));
    } catch (e) {
      setPending((p) =>
        p.map((x) => (x.key === key ? { ...x, status: "error", error: (e as Error).message } : x))
      );
    }
  };

  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const selectedMessages = messages.filter((m) => selected.has(m.id));
  const toggleSelect = (list: ChatMessage[]) =>
    setSelected((cur) => {
      const next = new Set(cur);
      const on = list.every((m) => next.has(m.id));
      list.forEach((m) => (on ? next.delete(m.id) : next.add(m.id)));
      return next;
    });
  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const onSend = (input: ChatDraft) => {
    const draft = replyTo
      ? {
          ...input,
          replyTo: {
            pid: replyTo.id,
            preview: messagePreview(replyTo),
            senderName: replyTo.senderName,
            thumb: messageThumb(replyTo),
          },
        }
      : input;
    setReplyTo(null);
    if (confirmBeforeSend) setConfirmDraft(draft);
    else doSend(draft);
  };

  return (
    <MessagesByIdContext.Provider value={messagesById}>
    <div className="relative flex flex-1 min-h-0 flex-col">
      <ChatThreadHeader
        source={source}
        channelName={channelName}
        actions={headerActions}
        extra={headerExtra}
      />
      <div className="relative flex flex-1 min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          stickBottom.current = bottom;
          if (bottom !== atBottom) setAtBottom(bottom);
          if (!bottom) {
            const row = [...el.querySelectorAll<HTMLElement>("[data-msg-id]")].find(
              // Tin đầu tiên hiện từ mép trên (tin bị cắt dở cũng dàn lại dòng → lệch)
              (r) => rowOffset(el, r) >= 0
            );
            readAnchor.current = row ? { id: row.dataset.msgId!, offset: rowOffset(el, row) } : null;
          }
          // Cuộn gần đầu → tự tải tin cũ hơn
          if (el.scrollTop < 60 && hasMore && !loadingOlder && messages.length) loadOlder();
        }}
        className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-3 py-2">
        <div ref={contentRef}>
        {latest.isLoading ? (
          <div className="flex flex-col gap-3 py-2">
            {[60, 40, 70, 50].map((w, i) => (
              <div
                key={i}
                className={`h-9 rounded-2xl bg-gray-200 animate-pulse ${i % 2 ? "self-end" : ""}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : latest.isError ? (
          <div className="py-6 text-center text-sm">
            <p className="text-red-600 mb-2">
              {(latest.error as Error | null)?.message || "Không kết nối được Smax"}
            </p>
            <button
              onClick={() => latest.refetch()}
              className="inline-flex items-center gap-1 text-brand hover:underline">
              <RotateCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center py-1">
                <button
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="text-xs text-brand hover:underline disabled:opacity-50">
                  {loadingOlder ? "Đang tải…" : "Tải tin cũ hơn"}
                </button>
              </div>
            )}
            {messages.length === 0 && visiblePending.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                Chưa có tin nhắn với khách qua kênh này
              </p>
            )}
            {items.map((item, i) => {
              const first = item.messages[0];
              const newDay =
                i === 0 ||
                dayLabel(items[i - 1].messages[0].createdAt) !== dayLabel(first.createdAt);
              return (
                <Fragment key={first.id}>
                  {newDay && (
                    <div className="my-2 text-center text-xs text-gray-400">{dayLabel(first.createdAt)}</div>
                  )}
                  <MessageRow
                    messages={item.messages}
                    selecting={selecting}
                    selected={item.messages.every((m) => selected.has(m.id))}
                    onToggle={() => toggleSelect(item.messages)}
                    onMenu={(x, y) => setMenu({ x, y, messages: item.messages })}
                    onReply={() => setReplyTo(item.messages[item.messages.length - 1])}
                    onForward={() => setForwarding(item.messages)}
                    // Album: cảm xúc gắn vào ảnh cuối như Zalo
                    onReact={canReact ? (icon) => react(item.messages[item.messages.length - 1], icon) : null}>
                  <WithAvatar
                    message={first}
                    sender={first.senderPid ? senders[first.senderPid] : undefined}
                    // Như Zalo: avatar ở tin đầu của chuỗi tin liền nhau cùng người gửi
                    show={
                      newDay ||
                      i === 0 ||
                      items[i - 1].messages[0].fromMe ||
                      items[i - 1].messages[0].type === "system" ||
                      items[i - 1].messages[0].senderPid !== first.senderPid
                    }>
                    {item.messages.length > 1 ? (
                      <AlbumBubble messages={item.messages} showSender={source.kind === "group"} />
                    ) : (
                      <MessageBubble message={first} showSender={source.kind === "group"} />
                    )}
                  </WithAvatar>
                  </MessageRow>
                </Fragment>
              );
            })}
            {visiblePending.map((p) => (
              <div key={p.key} className="flex flex-col items-end my-1">
                {p.draft.stickerId ? (
                  <img src={stickerUrl(p.draft.stickerId)} alt="sticker" className="h-28 w-28 object-contain opacity-80" />
                ) : (
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand opacity-80 px-3 py-2 text-sm text-white whitespace-pre-wrap break-words">
                  {p.draft.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {p.draft.attachments.map((a) =>
                        a.kind === "image" ? (
                          <img key={a.path} src={a.url} alt={a.name} className="h-16 w-16 rounded object-cover" />
                        ) : (
                          <span key={a.path} className="flex items-center gap-1 rounded bg-white/20 px-2 py-1 text-xs">
                            {a.kind === "video" ? <Play className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {a.name}
                          </span>
                        )
                      )}
                    </div>
                  )}
                  {!!p.draft.productImages?.length && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {p.draft.productImages.map((img) => (
                        <img key={img.id} src={img.url} alt="" className="h-16 w-16 rounded object-cover" />
                      ))}
                    </div>
                  )}
                  {p.draft.replyTo && (
                    <span className="mb-1 flex items-center gap-1.5 border-l-2 border-white/60 pl-2 text-xs opacity-80">
                      {p.draft.replyTo.thumb && (
                        <img src={p.draft.replyTo.thumb} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                      )}
                      <span className="line-clamp-2">{p.draft.replyTo.preview}</span>
                    </span>
                  )}
                  {p.draft.text}
                </div>
                )}
                <span className="text-[11px] text-gray-500 mt-0.5">
                  {p.status === "sending" && "Đang gửi…"}
                  {p.status === "sent" && "Đã gửi"}
                  {p.status === "error" && (
                    <span className="text-red-600">
                      Lỗi: {p.error || "gửi thất bại"} ·{" "}
                      <button onClick={() => onSendRetry(p)} className="underline">
                        Thử lại
                      </button>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </>
        )}
        </div>
      </div>
      {!atBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Xuống tin mới nhất"
          className={`absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full shadow-md ring-1 ${
            unseenCount
              ? "bg-brand px-3 py-1.5 text-xs font-medium text-white ring-brand"
              : "h-8 w-8 justify-center bg-white text-gray-600 ring-gray-200 hover:text-brand"
          }`}>
          <ArrowDown className="h-4 w-4" />
          {unseenCount > 0 && `${unseenCount} tin mới`}
        </button>
      )}
      </div>

      {selecting ? (
        <div className="flex flex-wrap items-center gap-2 border-t bg-white px-3 py-2 text-sm">
          <span className="mr-auto text-gray-600">Đã chọn {selectedMessages.length} tin</span>
          <button
            onClick={() => copyMessages(selectedMessages)}
            disabled={!selectedMessages.length}
            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-40">
            <Copy className="h-3.5 w-3.5" /> Sao chép
          </button>
          <button
            onClick={() => setForwarding(selectedMessages)}
            disabled={!selectedMessages.length}
            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-40">
            <Forward className="h-3.5 w-3.5" /> Chuyển tiếp
          </button>
          <button
            onClick={() => downloadMessagesMedia(selectedMessages)}
            disabled={!selectedMessages.some((m) => m.attachments.length)}
            className="inline-flex items-center gap-1 rounded border px-2.5 py-1 hover:bg-gray-50 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Tải ảnh / tệp
          </button>
          <button onClick={exitSelect} className="rounded px-2.5 py-1 text-gray-600 hover:bg-gray-100">
            Hủy
          </button>
        </div>
      ) : (
        <ChatComposer
          disabledReason={sendDisabledReason}
          ctx={ctx}
          onSend={onSend}
          restore={restore}
          threadStickerIds={threadStickerIds}
          draftKey={source.key}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      )}

      {menu && (
        <MessageMenu
          x={menu.x}
          y={menu.y}
          canReply
          hasText={menu.messages.some((m) => m.text.trim())}
          hasMedia={menu.messages.some((m) => m.attachments.length)}
          onClose={() => setMenu(null)}
          onAction={(a) => {
            const list = menu.messages;
            if (a === "reply") setReplyTo(list[list.length - 1]);
            else if (a === "forward") setForwarding(list);
            else if (a === "copy") copyMessages(list);
            else if (a === "download") downloadMessagesMedia(list);
            else if (a === "select") {
              setSelecting(true);
              setSelected(new Set(list.map((m) => m.id)));
            }
          }}
        />
      )}
      {forwarding && (
        <ForwardDialog
          messages={forwarding}
          onClose={() => {
            setForwarding(null);
            exitSelect();
          }}
        />
      )}

      {confirmDraft !== null && (
        <SendConfirmDialog
          channelName={channelName}
          recipient={recipientLabel}
          draft={confirmDraft}
          onCancel={() => {
            // Hủy gửi → trả nội dung về ô soạn, không mất bản nháp (sticker không nằm trong ô soạn)
            if (!confirmDraft.stickerId) setRestore({ draft: confirmDraft, nonce: Date.now() });
            const rp = confirmDraft.replyTo?.pid;
            if (rp) setReplyTo(messages.find((m) => m.id === rp) ?? null);
            setConfirmDraft(null);
          }}
          onConfirm={() => {
            const d = confirmDraft;
            setConfirmDraft(null);
            doSend(d);
          }}
        />
      )}
    </div>
    </MessagesByIdContext.Provider>
  );

  function onSendRetry(p: Pending) {
    if (confirmBeforeSend) {
      setPending((list) => list.filter((x) => x.key !== p.key));
      setConfirmDraft(p.draft);
    } else {
      doSend(p.draft, p.key);
    }
  }
}

function MessageBubble({ message: m, showSender }: { message: ChatMessage; showSender: boolean }) {
  const [preview, setPreview] = useState<number | null>(null);
  if (m.type === "system") {
    return <div className="my-2 text-center text-xs italic text-gray-500">{m.text}</div>;
  }
  if (m.stickerId) {
    return (
      <div className={`flex flex-col my-1 ${m.fromMe ? "items-end" : "items-start"}`}>
        {showSender && !m.fromMe && m.senderName && (
          <span className="text-[11px] text-gray-500 ml-2">{m.senderName}</span>
        )}
        <span className={`relative ${m.reactions?.length ? "mb-2.5" : ""}`}>
          <img src={stickerUrl(m.stickerId)} alt="sticker" loading="lazy" className="h-28 w-28 object-contain" />
          <HoverActions fromMe={m.fromMe} />
          <ReactionSlot reactions={m.reactions} />
        </span>
        <span className="text-[11px] text-gray-400 mx-1">{timeLabel(m.createdAt)}</span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col my-1 ${m.fromMe ? "items-end" : "items-start"}`}>
      {showSender && !m.fromMe && m.senderName && (
        <span className="text-[11px] text-gray-500 ml-2">{m.senderName}</span>
      )}
      <div
        className={`relative max-w-[72%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          m.fromMe ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white border"
        } ${m.reactions?.length ? "mb-2.5 min-w-[4rem]" : ""}`}>
        <HoverActions fromMe={m.fromMe} />
        <ReactionSlot reactions={m.reactions} />
        {m.quote && <QuoteBlock quote={m.quote} fromMe={m.fromMe} />}
        {m.attachments.map((a, i) =>
          isVideo(a) && !a.thumbnail ? (
            <button
              key={i}
              onClick={() => setPreview(i)}
              className="relative block mb-1 cursor-zoom-in">
              <VideoFrame url={a.url} className="block h-40 w-56 rounded-lg" />
              <PlayBadge />
            </button>
          ) : a.thumbnail || isImage(a) ? (
            <button
              key={i}
              onClick={() => setPreview(i)}
              className="relative block mb-1 cursor-zoom-in">
              <img src={a.thumbnail || a.url} alt={a.title} className="max-h-48 rounded-lg" />
              {isVideo(a) && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/50 p-2 text-white">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </span>
              )}
            </button>
          ) : (
            <button
              key={i}
              onClick={() => setPreview(i)}
              className="flex items-center gap-1 underline mb-1 text-left">
              <FileText className="w-4 h-4 shrink-0" />
              {a.title || "Tệp đính kèm"}
            </button>
          )
        )}
        {m.text}
      </div>
      <span className="text-[11px] text-gray-400 mx-1">{timeLabel(m.createdAt)}</span>
      {preview !== null && (
        <AttachmentPreviewModal
          items={m.attachments}
          index={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

/** Cụm cảm xúc + nút thả nhanh ở góc bong bóng (hành động lấy từ hàng tin). */
function ReactionSlot({ reactions }: { reactions?: ChatMessage["reactions"] }) {
  const ctx = useContext(BubbleActionsContext);
  return <ReactionBar reactions={reactions} onReact={ctx?.onReact ?? null} />;
}

const MessagesByIdContext = createContext<Map<string, ChatMessage>>(new Map());

/** Trích tin gốc trong tin trả lời (kiểu Zalo); bấm để cuộn tới tin gốc nếu đã tải. */
function QuoteBlock({ quote, fromMe }: { quote: NonNullable<ChatMessage["quote"]>; fromMe: boolean }) {
  // Smax để trống nội dung trích khi tin gốc là ảnh/tệp → lấy từ tin gốc nếu đã tải
  const orig = useContext(MessagesByIdContext).get(quote.pid ?? "");
  const thumb = orig ? messageThumb(orig) : null;
  const text = orig ? messagePreview(orig) : quote.text.trim() || "[Tin nhắn]";
  return (
    <button
      onClick={() => {
        const el = quote.pid ? document.querySelector(`[data-msg-ids~="${quote.pid}"]`) : null;
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      }}
      className={`mb-1 block w-full rounded border-l-4 px-2 py-1 text-left text-xs ${
        fromMe ? "border-white/70 bg-white/15" : "border-brand bg-gray-50"
      }`}>
      <span className="flex items-center gap-2">
        {thumb && <img src={thumb} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />}
        <span className="min-w-0">
          {quote.senderName && <span className="block font-medium">{quote.senderName}</span>}
          <span className={`block line-clamp-2 ${fromMe ? "opacity-90" : "text-gray-600"}`}>{text}</span>
        </span>
      </span>
    </button>
  );
}

type ThreadItem = { messages: ChatMessage[] };

/** Gom các tin chỉ có ảnh/video liền nhau, cùng người gửi, cùng albumId thành 1 album. */
function groupAlbums(messages: ChatMessage[]): ThreadItem[] {
  const items: ThreadItem[] = [];
  for (const m of messages) {
    const prev = items[items.length - 1]?.messages[0];
    if (
      prev &&
      isMediaOnly(m) &&
      isMediaOnly(prev) &&
      m.albumId === prev.albumId &&
      m.fromMe === prev.fromMe &&
      m.senderName === prev.senderName
    ) {
      items[items.length - 1].messages.push(m);
    } else {
      items.push({ messages: [m] });
    }
  }
  return items;
}

const isMediaOnly = (m: ChatMessage) =>
  !!m.albumId &&
  m.type === "message" &&
  !m.text.trim() &&
  m.attachments.length > 0 &&
  m.attachments.every((a) => isImage(a) || isVideo(a));

/** Chia album thành các hàng 2–3 ô như Zalo, không để ô trống: 4 → 2+2, 5 → 2+3, 7 → 2+2+3. */
function albumRows(n: number): number[] {
  if (n <= 3) return [n];
  const rows = Array(Math.floor(n / 3)).fill(3);
  if (n % 3 === 1) rows.splice(0, 1, 2, 2);
  if (n % 3 === 2) rows.unshift(2);
  return rows;
}

/** Album kiểu Zalo: các hàng 2–3 ô vuông, hàng ít ảnh hơn hiển thị lớn hơn. */
function AlbumBubble({ messages, showSender }: { messages: ChatMessage[]; showSender: boolean }) {
  const [preview, setPreview] = useState<number | null>(null);
  const media = messages.flatMap((m) => m.attachments);
  const first = messages[0];
  const last = messages[messages.length - 1];
  // Mỗi ảnh trong album là 1 tin riêng → gộp cảm xúc của cả album
  const albumReactions = messages.flatMap((m) => m.reactions ?? []).reduce<NonNullable<ChatMessage["reactions"]>>(
    (out, r) => {
      const g = out.find((x) => x.icon === r.icon);
      if (g) {
        g.count += r.count;
        g.mine ||= r.mine;
        g.users.push(...r.users);
      } else out.push({ ...r, users: [...r.users] });
      return out;
    },
    []
  );
  const sizes = albumRows(media.length);
  const rows = sizes.map((size, r) => {
    const start = sizes.slice(0, r).reduce((sum, n) => sum + n, 0);
    return media.slice(start, start + size).map((a, j) => ({ a, i: start + j }));
  });

  return (
    <div className={`flex flex-col my-1 ${first.fromMe ? "items-end" : "items-start"}`}>
      {showSender && !first.fromMe && first.senderName && (
        <span className="text-[11px] text-gray-500 ml-2">{first.senderName}</span>
      )}
      <div className={`relative w-[260px] max-w-[72%] ${albumReactions.length ? "mb-2.5" : ""}`}>
      <HoverActions fromMe={first.fromMe} />
      <ReactionSlot reactions={albumReactions} />
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-2xl">
        {rows.map((row, r) => (
          <div key={r} className="flex gap-0.5">
            {row.map(({ a, i }) => (
              <button
                key={i}
                onClick={() => setPreview(i)}
                className="relative aspect-square flex-1 min-w-0 cursor-zoom-in bg-gray-200">
                {isVideo(a) && !a.thumbnail ? (
                  <VideoFrame url={a.url} className="h-full w-full object-cover" />
                ) : (
                  <img
                    src={a.thumbnail || a.url}
                    alt={a.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                {isVideo(a) && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-black/50 p-1.5 text-white">
                      <Play className="w-4 h-4 fill-current" />
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
      </div>
      <span className="text-[11px] text-gray-400 mx-1">
        {media.length} ảnh/video · {timeLabel(last.createdAt)}
      </span>
      {preview !== null && (
        <AttachmentPreviewModal items={media} index={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

/** Khung hình đầu của video làm ảnh xem trước (khi Zalo không trả thumbnail). */
function VideoFrame({ url, className }: { url: string; className: string }) {
  return <NoReferrerVideo url={url} className={className} />;
}

function PlayBadge() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="rounded-full bg-black/50 p-2 text-white">
        <Play className="w-5 h-5 fill-current" />
      </span>
    </span>
  );
}

/** Tin nhận được: avatar nhỏ của người gửi bên trái (chừa chỗ khi không hiện để thẳng hàng). */
function WithAvatar({
  message: m,
  sender,
  show,
  children,
}: {
  message: ChatMessage;
  sender?: { name: string | null; avatar: string | null };
  show: boolean;
  children: React.ReactNode;
}) {
  if (m.fromMe || m.type === "system") return <>{children}</>;
  return (
    <div className="flex items-start gap-1.5">
      <div className="mt-1 w-7 shrink-0" title={sender?.name ?? m.senderName ?? ""}>
        {show && (
          <ZaloAvatar
            avatar={sender?.avatar ?? null}
            isGroup={false}
            members={[{ name: sender?.name ?? m.senderName, avatar: null }]}
            size={28}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * 1 dòng tin (hoặc album): chuột phải / nút ⋯ mở menu thao tác; chế độ chọn nhiều
 * hiện ô tick và bấm vào tin để chọn.
 */
function MessageRow({
  messages,
  selecting,
  selected,
  onToggle,
  onMenu,
  onReply,
  onForward,
  onReact,
  children,
}: {
  messages: ChatMessage[];
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onMenu: (x: number, y: number) => void;
  onReply: () => void;
  onForward: () => void;
  onReact: ((icon: ReactionIcon | "NONE") => void) | null;
  children: React.ReactNode;
}) {
  if (messages[0].type === "system") return <>{children}</>;
  const fromMe = messages[0].fromMe;
  return (
    <div
      data-msg-id={messages[0].id}
      data-msg-ids={messages.map((m) => m.id).join(" ")}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      onClickCapture={(e) => {
        // Đang chọn nhiều: bấm vào tin để chọn (không mở xem ảnh)
        if (!selecting) return;
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`group relative flex items-center gap-1 rounded-lg ${selecting ? "cursor-pointer" : ""} ${
        selected ? "bg-cyan-bg" : ""
      }`}>
      {selecting && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            selected ? "border-brand bg-brand text-white" : "border-gray-300 bg-white"
          }`}>
          {selected && <span className="text-[10px] leading-none">✓</span>}
        </span>
      )}
      <div className={`min-w-0 flex-1 ${fromMe ? "order-1" : ""}`}>
        <BubbleActionsContext.Provider value={selecting ? null : { onReply, onForward, onMore: onMenu, onReact }}>
          {children}
        </BubbleActionsContext.Provider>
      </div>
    </div>
  );
}

const BubbleActionsContext = createContext<{
  onReply: () => void;
  onForward: () => void;
  onMore: (x: number, y: number) => void;
  // null = không thả cảm xúc được
  onReact: ((icon: ReactionIcon | "NONE") => void) | null;
} | null>(null);

/** 3 nút Trả lời / Chuyển tiếp / Thêm sát cạnh bong bóng khi rê chuột (kiểu Zalo). */
function HoverActions({ fromMe }: { fromMe: boolean }) {
  const ctx = useContext(BubbleActionsContext);
  if (!ctx) return null;
  const btn =
    "flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-brand";
  return (
    <div
      className={`pointer-events-none absolute bottom-0 flex gap-1 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 ${
        fromMe ? "right-full mr-1.5" : "left-full ml-1.5"
      }`}>
      <button onClick={ctx.onReply} title="Trả lời" aria-label="Trả lời" className={btn}>
        <Quote className="h-3 w-3 fill-current" />
      </button>
      <button onClick={ctx.onForward} title="Chuyển tiếp" aria-label="Chuyển tiếp" className={btn}>
        <Forward className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          ctx.onMore(r.left, r.bottom);
        }}
        title="Thêm"
        aria-label="Thêm thao tác"
        className={btn}>
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
