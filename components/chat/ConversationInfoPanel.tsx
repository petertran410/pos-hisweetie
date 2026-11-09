"use client";

import { createContext, useMemo, useState } from "react";
import { ChevronDown, FileText, Link2, Loader2, Mic, MoreHorizontal, Play } from "lucide-react";
import type { ChatMessage } from "@/lib/types/smaxChat";
import { AttachmentPreviewModal, isAudio, isImage, isVideo, NoReferrerVideo } from "./AttachmentPreviewModal";

type Attachment = ChatMessage["attachments"][number];

/** Mục được bấm chuột phải / nút ⋯ trong "Thông tin hội thoại". */
export interface InfoTarget {
  kind: "media" | "file" | "link";
  message: ChatMessage;
  attachment?: Attachment;
  url: string;
}

/**
 * Chỗ đặt "Thông tin hội thoại" do khung cha cấp (cột bên phải khi khung chat rộng).
 * Không có → khung chat tự mở dạng lớp phủ bằng nút trên đầu hội thoại.
 */
export const ConversationInfoSlotContext = createContext<HTMLElement | null>(null);

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const MEDIA_PREVIEW = 8;
const LIST_PREVIEW = 3;

const dateLabel = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Gom ảnh/video, tệp, link từ các tin đã tải (mới nhất trước), bỏ tin đã thu hồi. */
function collect(messages: ChatMessage[]) {
  const media: InfoTarget[] = [];
  const files: InfoTarget[] = [];
  const links: InfoTarget[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type !== "message" || m.recalled) continue;
    for (const a of m.attachments) {
      if (!a.url) continue;
      if (a.type === "link") links.push({ kind: "link", message: m, url: a.url });
      else if (isImage(a) || isVideo(a)) media.push({ kind: "media", message: m, attachment: a, url: a.url });
      else files.push({ kind: "file", message: m, attachment: a, url: a.url });
    }
    const seen = new Set<string>();
    for (const raw of m.text.match(URL_RE) ?? []) {
      const url = raw.replace(/[).,;!?]+$/, "");
      if (seen.has(url)) continue;
      seen.add(url);
      links.push({ kind: "link", message: m, url });
    }
  }
  return { media, files, links };
}

interface Props {
  messages: ChatMessage[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onMenu: (x: number, y: number, target: InfoTarget) => void;
}

/** Ảnh/Video, File, Link của hội thoại (kiểu Zalo), tổng hợp từ tin đã tải; tải thêm tin cũ để xem xa hơn. */
export function ConversationInfoPanel({ messages, hasMore, loadingOlder, onLoadOlder, onMenu }: Props) {
  const { media, files, links } = useMemo(() => collect(messages), [messages]);
  const [preview, setPreview] = useState<{ items: Attachment[]; index: number } | null>(null);
  const oldest = messages[0];

  // Chuột phải → menu tại con trỏ; nút ⋯ (bàn phím / cảm ứng) → menu dưới nút
  const menuProps = (t: InfoTarget) => ({
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onMenu(e.clientX, e.clientY, t);
    },
  });
  const moreButton = (t: InfoTarget, className: string) => (
    <button
      type="button"
      aria-label={`Thao tác: ${t.kind === "link" ? "link" : t.kind === "file" ? "tệp" : "ảnh/video"}`}
      onClick={(e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        onMenu(r.left, r.bottom, t);
      }}
      className={`flex h-6 w-6 items-center justify-center rounded bg-white/90 text-gray-600 shadow-sm opacity-0 hover:bg-white group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 max-lg:opacity-100 ${className}`}>
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex flex-col gap-3 text-sm">
      <Section title="Ảnh/Video" count={media.length} limit={MEDIA_PREVIEW} empty="Chưa có ảnh/video trong các tin đã tải">
        {(all) => (
          <ul className="grid grid-cols-4 gap-1">
            {(all ? media : media.slice(0, MEDIA_PREVIEW)).map((t, i) => {
              const a = t.attachment!;
              return (
                <li key={`${t.message.id}-${i}`} className="group relative aspect-square" {...menuProps(t)}>
                  <button
                    type="button"
                    onClick={() => setPreview({ items: media.map((x) => x.attachment!), index: i })}
                    aria-label={`${isVideo(a) ? "Video" : "Ảnh"} ngày ${dateLabel(t.message.createdAt)}`}
                    className="h-full w-full cursor-zoom-in overflow-hidden rounded bg-gray-100">
                    {isVideo(a) && !a.thumbnail ? (
                      <NoReferrerVideo url={a.url} className="h-full w-full object-cover" />
                    ) : (
                      <img src={a.thumbnail || a.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                    {isVideo(a) && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-black/50 p-1 text-white">
                          <Play className="h-3 w-3 fill-current" />
                        </span>
                      </span>
                    )}
                  </button>
                  {moreButton(t, "absolute right-0.5 top-0.5")}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="File" count={files.length} limit={LIST_PREVIEW} empty="Chưa có tệp trong các tin đã tải">
        {(all) => (
          <ul className="flex flex-col gap-1">
            {(all ? files : files.slice(0, LIST_PREVIEW)).map((t, i) => {
              const a = t.attachment!;
              const voice = isAudio(a);
              return (
                <li key={`${t.message.id}-${i}`} className="group relative" {...menuProps(t)}>
                  <button
                    type="button"
                    onClick={() => setPreview({ items: [a], index: 0 })}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 pr-8 text-left hover:bg-gray-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-cyan-bg text-brand">
                      {voice ? <Mic className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.title || (voice ? "Tin nhắn thoại" : "Tệp đính kèm")}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {dateLabel(t.message.createdAt)}
                        {t.message.fromMe ? " · Kênh gửi" : t.message.senderName ? ` · ${t.message.senderName}` : ""}
                      </span>
                    </span>
                  </button>
                  {moreButton(t, "absolute right-1 top-1/2 -translate-y-1/2")}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Link" count={links.length} limit={LIST_PREVIEW} empty="Chưa có link trong các tin đã tải">
        {(all) => (
          <ul className="flex flex-col gap-1">
            {(all ? links : links.slice(0, LIST_PREVIEW)).map((t, i) => (
              <li key={`${t.message.id}-${i}`} className="group relative" {...menuProps(t)}>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded px-1 py-1 pr-8 hover:bg-gray-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-600">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{hostOf(t.url)}</span>
                    <span className="block truncate text-xs text-brand">{t.url}</span>
                  </span>
                </a>
                {moreButton(t, "absolute right-1 top-1/2 -translate-y-1/2")}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="border-t pt-2 text-xs text-gray-500">
        {oldest ? <p>Tổng hợp từ {messages.length} tin đã tải, từ ngày {dateLabel(oldest.createdAt)}.</p> : null}
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="mt-1 inline-flex items-center gap-1 font-medium text-brand hover:underline disabled:opacity-60">
            {loadingOlder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loadingOlder ? "Đang tải tin cũ…" : "Tải thêm tin cũ"}
          </button>
        ) : (
          oldest && <p className="mt-1">Đã tải hết lịch sử hội thoại.</p>
        )}
      </div>

      {preview && <AttachmentPreviewModal items={preview.items} index={preview.index} onClose={() => setPreview(null)} />}
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Mục thu gọn được (như Zalo): tiêu đề + số lượng, hiện vài mục đầu, "Xem tất cả". */
function Section({
  title,
  count,
  limit,
  empty,
  children,
}: {
  title: string;
  count: number;
  limit: number;
  empty: string;
  children: (all: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [all, setAll] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left font-semibold">
        <span>
          {title}
          {count > 0 && <span className="ml-1 font-normal text-gray-500">({count})</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open &&
        (count === 0 ? (
          <p className="py-2 text-center text-xs text-gray-500">{empty}</p>
        ) : (
          <div className="mt-1 flex flex-col gap-2">
            {children(all)}
            {count > limit && (
              <button
                type="button"
                onClick={() => setAll(!all)}
                className="rounded bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                {all ? "Thu gọn" : `Xem tất cả (${count})`}
              </button>
            )}
          </div>
        ))}
    </section>
  );
}
