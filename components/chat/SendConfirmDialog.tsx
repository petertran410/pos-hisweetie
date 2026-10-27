"use client";

import { FileText, Play } from "lucide-react";
import type { ChatDraft } from "@/lib/types/smaxChat";
import { stickerUrl } from "@/lib/chat/stickers";

interface Props {
  channelName: string;
  recipient: string;
  draft: ChatDraft;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Môi trường thử nghiệm: xác nhận trước khi gửi tin tới khách thật. */
export function SendConfirmDialog({ channelName, recipient, draft, onConfirm, onCancel }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl text-sm">
        <h3 className="font-semibold text-base mb-1">Xác nhận gửi tin thật</h3>
        <p className="text-gray-500 mb-3">
          Đang ở môi trường thử nghiệm — tin sẽ được gửi tới khách thật qua Zalo.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mb-3">
          <dt className="text-gray-500">Kênh gửi</dt>
          <dd className="font-medium">{channelName}</dd>
          <dt className="text-gray-500">Người nhận</dt>
          <dd className="font-medium break-all">{recipient}</dd>
        </dl>
        <div className="rounded border bg-gray-50 p-2 mb-4 max-h-56 overflow-y-auto">
          {draft.replyTo && (
            <div className="mb-1.5 flex items-center gap-2 border-l-4 border-brand pl-2 text-xs text-gray-500">
              {draft.replyTo.thumb && (
                <img src={draft.replyTo.thumb} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
              )}
              <p className="line-clamp-2">
                Trả lời {draft.replyTo.senderName ?? ""}: {draft.replyTo.preview}
              </p>
            </div>
          )}
          {draft.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {draft.attachments.map((a) =>
                a.kind === "image" ? (
                  <img key={a.path} src={a.url} alt={a.name} className="h-14 w-14 rounded object-cover" />
                ) : (
                  <span key={a.path} className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs">
                    {a.kind === "video" ? <Play className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {a.name}
                  </span>
                )
              )}
            </div>
          )}
          {draft.text && <p className="whitespace-pre-wrap break-words">{draft.text}</p>}
          {draft.stickerId && (
            <img src={stickerUrl(draft.stickerId)} alt="sticker" className="h-24 w-24 object-contain" />
          )}
          {!!draft.productImages?.length && (
            <div className="mt-2 flex flex-wrap gap-1">
              {draft.productImages.map((img) => (
                <img key={img.id} src={img.url} alt="" className="h-14 w-14 rounded object-cover" />
              ))}
            </div>
          )}
          {draft.qrImageUrl && (
            <img src={draft.qrImageUrl} alt="QR chuyển khoản" className="mt-2 h-24 w-24 rounded bg-white object-contain" />
          )}
          <p className="mt-1 text-xs text-gray-500">
            {draft.attachments.length > 0 &&
              `${draft.attachments.length} tệp đính kèm — chữ gửi trước, ảnh gom thành 1 album, mỗi video/tệp gửi thành 1 tin riêng (video hiện dạng tệp tải về).`}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded bg-brand text-white">
            Gửi thật
          </button>
        </div>
      </div>
    </div>
  );
}
