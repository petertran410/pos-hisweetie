"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, X } from "lucide-react";
import type { ChatMessage } from "@/lib/types/smaxChat";

export type ChatAttachment = ChatMessage["attachments"][number];

export const isImage = (a: ChatAttachment) => /photo|image/.test(a.type);
// Video POS gửi đi qua trường `file` → Zalo trả type "file", không thumbnail; nhận theo đuôi tên
export const isVideo = (a: ChatAttachment) =>
  a.type === "video" || (a.type === "file" && /\.(mp4|mov|m4v|webm)$/i.test(a.title));
const isPdf = (a: ChatAttachment) => /\.pdf($|\?)/i.test(a.url) || /\.pdf$/i.test(a.title);

/** Xem ảnh / video / tệp đính kèm Zalo ngay trên trang; album thì chuyển qua lại bằng ‹ › hoặc phím ←/→. */
export function AttachmentPreviewModal({
  items,
  index: startIndex,
  onClose,
}: {
  items: ChatAttachment[];
  index: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const a = items[index];
  const many = items.length > 1;
  const go = (step: number) => setIndex((i) => (i + step + items.length) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, items.length]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-black/80 p-4"
      onClick={onClose}>
      <div className="flex items-center justify-end gap-2 pb-3" onClick={(e) => e.stopPropagation()}>
        <span className="mr-auto truncate text-sm text-white/80">
          {many && `${index + 1}/${items.length} `}
          {a.title}
        </span>
        <a
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
          <ExternalLink className="h-4 w-4" /> Mở tab mới
        </a>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="rounded bg-white/10 p-1.5 text-white hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {many && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Ảnh trước"
              className="absolute left-0 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Ảnh sau"
              className="absolute right-0 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <div className="flex max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
          {isImage(a) ? (
            <img
              src={a.url}
              alt={a.title}
              className="max-h-[80vh] max-w-full rounded object-contain"
            />
          ) : isVideo(a) ? (
            a.type === "file" ? (
              <NoReferrerVideo
                key={a.url}
                url={a.url}
                player
                className="h-[80vh] w-[min(900px,90vw)] rounded"
              />
            ) : (
            <video
              key={a.url}
              src={a.url}
              poster={a.thumbnail ?? undefined}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded"
            />
            )
          ) : isPdf(a) ? (
            <iframe src={a.url} title={a.title} className="h-[80vh] w-[min(900px,90vw)] rounded bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 text-sm">
              <FileText className="h-10 w-10 text-brand" />
              <p className="max-w-xs break-all text-center font-medium">{a.title || "Tệp đính kèm"}</p>
              <p className="text-gray-500">Không xem trước được loại tệp này.</p>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                download
                className="rounded bg-brand px-3 py-1.5 text-white">
                Tải xuống
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const escapeAttr = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Video trên máy chủ tệp Zalo (dlfl.vn — video POS gửi đi, Zalo lưu dạng tệp):
 * máy chủ chặn hotlink, có Referer là 403. <video> không đặt được referrerPolicy
 * riêng → phát trong iframe srcdoc có meta no-referrer, không đổi chính sách cả trang.
 * `player`: có điều khiển + tự phát; không thì chỉ hiện khung hình đầu làm ảnh xem trước.
 */
export function NoReferrerVideo({
  url,
  player = false,
  className,
}: {
  url: string;
  player?: boolean;
  className?: string;
}) {
  const src = escapeAttr(player ? url : `${url}#t=0.1`);
  const doc = `<!doctype html><meta name="referrer" content="no-referrer"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:${
    player ? "contain" : "cover"
  }}</style><video src="${src}" ${player ? "controls autoplay" : 'preload="metadata" muted'} playsinline></video>`;
  return (
    <iframe
      srcDoc={doc}
      title="video"
      referrerPolicy="no-referrer"
      // không cần script: thanh điều khiển video là của trình duyệt
      sandbox=""
      allow="autoplay; fullscreen"
      className={`${className ?? ""} border-0 ${player ? "" : "pointer-events-none"}`}
    />
  );
}
