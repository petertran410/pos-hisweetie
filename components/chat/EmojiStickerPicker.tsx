"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  EMOJI_GROUPS,
  STICKER_DEFAULT_START,
  STICKER_PAGE_SIZE,
  getRecentEmojis,
  getRecentStickers,
  stickerUrl,
} from "@/lib/chat/stickers";

interface Props {
  // Sticker khách đã gửi trong hội thoại đang mở
  threadStickerIds: string[];
  onEmoji: (emoji: string) => void;
  onSticker: (id: string) => void;
  onClose: () => void;
}

/** Bảng Sticker / Emoji kiểu Zalo, hiện phía trên ô soạn tin. */
export function EmojiStickerPicker({ threadStickerIds, onEmoji, onSticker, onClose }: Props) {
  const [tab, setTab] = useState<"sticker" | "emoji">("emoji");
  const [recentEmojis] = useState(getRecentEmojis);
  const [recentStickers] = useState(getRecentStickers);
  // Kho sticker: trang theo dải mã liền nhau
  const [start, setStart] = useState(() => {
    const seed = Number(threadStickerIds[0] ?? recentStickers[0]);
    return Number.isFinite(seed) && seed > 0
      ? Math.max(1, seed - (seed % STICKER_PAGE_SIZE))
      : STICKER_DEFAULT_START;
  });
  const ref = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const emojiGroups = recentEmojis.length
    ? [{ name: "Gần đây", emojis: recentEmojis }, ...EMOJI_GROUPS]
    : EMOJI_GROUPS;
  const stickerGroups = [
    { name: "Gần đây", ids: recentStickers },
    { name: "Trong hội thoại", ids: threadStickerIds },
  ].filter((g) => g.ids.length);
  const pageIds = Array.from({ length: STICKER_PAGE_SIZE }, (_, i) => String(start + i));

  return (
    <div
      ref={ref}
      // giữ focus ở ô soạn khi bấm emoji
      onMouseDown={(e) => e.preventDefault()}
      className="absolute bottom-full right-2 z-30 mb-1 flex h-80 w-[340px] max-w-[calc(100%-1rem)] flex-col rounded-lg border bg-white shadow-xl">
      <div className="flex border-b text-sm font-medium">
        {(["sticker", "emoji"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 uppercase ${
              tab === t ? "border-b-2 border-brand text-brand" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tab === "emoji" ? (
          emojiGroups.map((g) => (
            <section key={g.name} className="mb-2">
              <h4 className="px-1 pb-1 text-xs font-semibold text-gray-500">{g.name}</h4>
              <div className="grid grid-cols-8 gap-0.5">
                {g.emojis.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    onClick={() => onEmoji(e)}
                    className="flex h-9 items-center justify-center rounded text-2xl hover:bg-gray-100">
                    {e}
                  </button>
                ))}
              </div>
            </section>
          ))
        ) : (
          <>
            {stickerGroups.map((g) => (
              <section key={g.name} className="mb-2">
                <h4 className="px-1 pb-1 text-xs font-semibold text-gray-500">{g.name}</h4>
                <StickerGrid ids={g.ids} onPick={onSticker} />
              </section>
            ))}
            <section>
              <div className="flex items-center justify-between px-1 pb-1">
                <h4 className="text-xs font-semibold text-gray-500">
                  Kho sticker #{start}–{start + STICKER_PAGE_SIZE - 1}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => setStart((s) => Math.max(1, s - STICKER_PAGE_SIZE))}
                    aria-label="Trang trước"
                    className="rounded p-0.5 hover:bg-gray-100">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setStart((s) => s + STICKER_PAGE_SIZE)}
                    aria-label="Trang sau"
                    className="rounded p-0.5 hover:bg-gray-100">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <StickerGrid ids={pageIds} onPick={onSticker} />
            </section>
          </>
        )}
      </div>
      {tab === "sticker" && (
        <p className="border-t px-2 py-1 text-[11px] text-gray-400">Bấm sticker để gửi ngay.</p>
      )}
    </div>
  );
}

function StickerGrid({ ids, onPick }: { ids: string[]; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {ids.map((id) => (
        <StickerCell key={id} id={id} onPick={onPick} />
      ))}
    </div>
  );
}

function StickerCell({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  const [broken, setBroken] = useState(false);
  // Mã không có ảnh (ngoài dải hợp lệ) thì ẩn ô
  if (broken) return null;
  return (
    <button
      onClick={() => onPick(id)}
      title={`Sticker #${id}`}
      className="flex aspect-square items-center justify-center rounded hover:bg-gray-100">
      <img
        src={stickerUrl(id)}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-full w-full object-contain"
      />
    </button>
  );
}
