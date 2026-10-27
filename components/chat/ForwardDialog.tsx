"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import { useActiveChannel } from "@/lib/chat/channels";
import { forwardContent, messagePreview } from "@/lib/chat/messageActions";
import type { ChatMessage, RecentChat } from "@/lib/types/smaxChat";
import { ZaloAvatar } from "./ZaloAvatar";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/**
 * Chuyển tiếp tin đã chọn tới 1 hoặc nhiều hội thoại gần đây của kênh đang chọn.
 * Gửi lại nội dung (chữ gộp, ảnh/tệp theo link Zalo, sticker) — Zalo hiện như tin mới.
 */
export function ForwardDialog({ messages, onClose }: { messages: ChatMessage[]; onClose: () => void }) {
  const { channel } = useActiveChannel();
  const { data, isLoading } = useRecentChats(!!channel, channel?.pagePid);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<RecentChat[]>([]);
  const [sending, setSending] = useState(false);
  const content = useMemo(() => forwardContent(messages), [messages]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return (data?.items ?? []).filter((c) => {
      if (!nq) return true;
      const label = `${c.name} ${c.match?.customer.code ?? ""} ${c.match?.customer.name ?? ""}`;
      return norm(label).includes(nq);
    });
  }, [data, q]);

  const toggle = (c: RecentChat) =>
    setPicked((cur) => (cur.some((x) => x.tid === c.tid) ? cur.filter((x) => x.tid !== c.tid) : [...cur, c]));

  const send = async () => {
    setSending(true);
    let ok = 0;
    for (const c of picked) {
      try {
        // Bấm "Chuyển tiếp" sau khi xem nội dung + nơi nhận = đã xác nhận
        await smaxChatApi.sendToThread({ pagePid: c.pagePid, tid: c.tid, isGroup: c.isGroup, ...content, confirmed: true });
        ok++;
      } catch (e) {
        toast.error(`Không chuyển tiếp được tới "${c.name}": ${(e as Error).message}`);
      }
    }
    setSending(false);
    if (ok) {
      toast.success(`Đã chuyển tiếp tới ${ok} hội thoại`);
      onClose();
    }
  };

  const skipped = messages.filter((m) => m.stickerId).length > 0 && !content.stickerId;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-full w-full max-w-sm flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="font-semibold">Chuyển tiếp {messages.length > 1 ? `${messages.length} tin` : "tin nhắn"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <p className="line-clamp-3 whitespace-pre-wrap">
            {messages.length === 1 ? messagePreview(messages[0]) : content.text || "[Ảnh / tệp]"}
          </p>
          {!!content.forwardMedia?.length && <p className="mt-1">{content.forwardMedia.length} ảnh/tệp</p>}
          {skipped && <p className="mt-1 text-amber-700">Sticker chỉ chuyển tiếp được khi chọn riêng 1 sticker.</p>}
        </div>

        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm hội thoại gần đây"
              className="w-full rounded-md border py-1.5 pl-7 pr-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <p className="py-1 text-[11px] text-gray-400">Hội thoại gần đây trên kênh {channel?.name}</p>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
          {isLoading && <li className="px-2 py-2 text-sm text-gray-500">Đang tải…</li>}
          {list.map((c) => {
            const on = picked.some((x) => x.tid === c.tid);
            return (
              <li key={c.tid}>
                <button
                  onClick={() => toggle(c)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50 ${on ? "bg-cyan-bg" : ""}`}>
                  <ZaloAvatar
                    avatar={c.avatar}
                    isGroup={c.isGroup}
                    members={c.isGroup ? c.memberPreview : [{ name: c.name, avatar: null }]}
                    size={28}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {c.match?.type === "linked" ? `${c.match.customer.code ?? ""} ${c.match.customer.name}` : c.name}
                    </span>
                    {c.isGroup && <span className="block truncate text-[11px] text-gray-500">{c.name}</span>}
                  </span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-brand bg-brand text-white" : "border-gray-300"}`}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
          <span className="mr-auto text-xs text-gray-500">Đã chọn {picked.length}</span>
          <button onClick={onClose} className="rounded px-3 py-1.5 text-sm hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={send}
            disabled={!picked.length || sending}
            className="inline-flex items-center gap-1 rounded bg-brand px-3 py-1.5 text-sm text-white disabled:opacity-50">
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Chuyển tiếp
          </button>
        </div>
      </div>
    </div>
  );
}
