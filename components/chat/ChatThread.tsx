"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Play, RotateCw } from "lucide-react";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useChatMessages, useSendChatMessage } from "@/lib/hooks/useSmaxChat";
import type {
  ChatContext,
  ChatDraft,
  ChatMessage,
  ChatMessagesPage,
  ZaloContact,
} from "@/lib/types/smaxChat";
import { ChatComposer } from "./ChatComposer";
import { ChatThreadHeader } from "./ChatThreadHeader";
import { ZaloAvatar } from "./ZaloAvatar";
import { stickerUrl } from "@/lib/chat/stickers";
import { SendConfirmDialog } from "./SendConfirmDialog";
import {
  AttachmentPreviewModal,
  NoReferrerVideo,
  isImage,
  isVideo,
} from "./AttachmentPreviewModal";

interface Props {
  customerId: number;
  pagePid: string;
  channelName: string;
  contact: ZaloContact;
  recipientLabel: string;
  confirmBeforeSend: boolean;
  sendDisabledReason: string | null;
  ctx: ChatContext;
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

/** Lịch sử tin (cũ → mới) + gửi tin. Cha đặt `key` theo kênh/contact để reset. */
export function ChatThread({
  customerId,
  pagePid,
  channelName,
  contact,
  recipientLabel,
  confirmBeforeSend,
  sendDisabledReason,
  ctx,
}: Props) {
  const latest = useChatMessages(customerId, pagePid, contact.id, true);
  const send = useSendChatMessage(customerId);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirmDraft, setConfirmDraft] = useState<ChatDraft | null>(null);
  const [restore, setRestore] = useState<{ draft: ChatDraft; nonce: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of [...older, ...(latest.data?.messages ?? [])]) byId.set(m.id, m);
    return [...byId.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [older, latest.data]);

  const items = useMemo(() => groupAlbums(messages), [messages]);
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

  // Tin đã gửi xong được ẩn khi Smax trả về tin tương ứng (có tệp: tin có đính kèm của mình)
  const visiblePending = pending.filter(
    (p) =>
      p.status !== "sent" ||
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, visiblePending.length]);

  const hasMore = olderHasMore ?? latest.data?.hasMore ?? false;

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const page = await smaxChatApi.getMessages(customerId, {
        pagePid,
        contactId: contact.id,
        before: oldest.createdAt,
      });
      stickBottom.current = false;
      setOlder((o) => [...page.messages, ...o]);
      setOlderHasMore(page.hasMore);
      // Giữ nguyên vị trí đang đọc sau khi chèn tin cũ lên đầu
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  const doSend = async (draft: ChatDraft, key = `p${Date.now()}`) => {
    stickBottom.current = true;
    setPending((p) => [
      ...p.filter((x) => x.key !== key),
      { key, draft, sentAt: Date.now(), status: "sending" },
    ]);
    try {
      await send.mutateAsync({
        pagePid,
        contactId: contact.id,
        text: draft.text || undefined,
        attachments: draft.attachments.length
          ? draft.attachments.map(({ path, kind, name }) => ({ path, kind, name }))
          : undefined,
        qrImageUrl: draft.qrImageUrl,
        productImageIds: draft.productImages?.length ? draft.productImages.map((i) => i.id) : undefined,
        stickerId: draft.stickerId,
        confirmed: confirmBeforeSend || undefined,
      });
      setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "sent" } : x)));
    } catch (e) {
      setPending((p) =>
        p.map((x) => (x.key === key ? { ...x, status: "error", error: (e as Error).message } : x))
      );
    }
  };

  const onSend = (draft: ChatDraft) => {
    if (confirmBeforeSend) setConfirmDraft(draft);
    else doSend(draft);
  };

  return (
    <div className="relative flex flex-1 min-h-0 flex-col">
      <ChatThreadHeader customerId={customerId} pagePid={pagePid} contact={contact} channelName={channelName} />
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 min-h-0 overflow-y-auto bg-gray-50 px-3 py-2">
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
                      <AlbumBubble messages={item.messages} showSender={contact.kind === "group"} />
                    ) : (
                      <MessageBubble message={first} showSender={contact.kind === "group"} />
                    )}
                  </WithAvatar>
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

      <ChatComposer
        disabledReason={sendDisabledReason}
        ctx={ctx}
        onSend={onSend}
        restore={restore}
        threadStickerIds={threadStickerIds}
        draftKey={`${customerId}-${pagePid}-${contact.id}`}
      />

      {confirmDraft !== null && (
        <SendConfirmDialog
          channelName={channelName}
          recipient={recipientLabel}
          draft={confirmDraft}
          onCancel={() => {
            // Hủy gửi → trả nội dung về ô soạn, không mất bản nháp (sticker không nằm trong ô soạn)
            if (!confirmDraft.stickerId) setRestore({ draft: confirmDraft, nonce: Date.now() });
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
        <img src={stickerUrl(m.stickerId)} alt="sticker" loading="lazy" className="h-28 w-28 object-contain" />
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
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          m.fromMe ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white border"
        }`}>
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
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-2xl w-[260px] max-w-[80%]">
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
