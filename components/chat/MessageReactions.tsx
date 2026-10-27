"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, X } from "lucide-react";
import type { ChatMessage } from "@/lib/types/smaxChat";
import { ZaloAvatar } from "./ZaloAvatar";

export type Reactions = NonNullable<ChatMessage["reactions"]>;
export type ReactionIcon = "LIKE" | "HEART" | "HAHA" | "WOW" | "CRY" | "ANGRY";

// Thứ tự như Zalo / app Smax
export const REACTION_ICONS: ReactionIcon[] = ["LIKE", "HEART", "HAHA", "WOW", "CRY", "ANGRY"];

export const REACTION_EMOJI: Record<string, string> = {
  LIKE: "👍",
  HEART: "❤️",
  HAHA: "😆",
  WOW: "😮",
  CRY: "😭",
  ANGRY: "😡",
};

const REACTION_LABEL: Record<ReactionIcon, string> = {
  LIKE: "Thích",
  HEART: "Yêu thích",
  HAHA: "Haha",
  WOW: "Ngạc nhiên",
  CRY: "Buồn",
  ANGRY: "Phẫn nộ",
};

/** Cảm xúc hiển thị ngay sau khi thả (trước khi Smax trả dữ liệu mới). */
export function applyReaction(list: Reactions | undefined, icon: ReactionIcon | "NONE"): Reactions {
  const out = (list ?? []).map((r) => ({ ...r, users: [...r.users] }));
  if (icon === "NONE") {
    return out
      .map((r) => (r.mine ? { ...r, mine: false, count: r.count - 1 } : r))
      .filter((r) => r.count > 0);
  }
  const hit = out.find((r) => r.icon === icon);
  if (hit) {
    hit.count += 1;
    hit.mine = true;
  } else out.push({ icon, count: 1, mine: true, users: [{ name: "Bạn", avatar: null }] });
  return out;
}

/**
 * Vị trí (px CSS) cho lớp nổi cạnh `anchor`: ưu tiên phía trên, thiếu chỗ thì lật xuống;
 * kẹp trong viewport. position:fixed bị nhân CSS zoom của <html> → quy đổi toạ độ.
 */
function placeNear(anchor: HTMLElement, el: HTMLElement) {
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
  const a = anchor.getBoundingClientRect();
  const w = el.offsetWidth * zoom;
  const h = el.offsetHeight * zoom;
  const gap = 6;
  let top = a.top - h - gap;
  if (top < 8) top = Math.min(a.bottom + gap, window.innerHeight - h - 8);
  const left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), window.innerWidth - w - 8);
  return { left: left / zoom, top: top / zoom };
}

/**
 * Cụm cảm xúc đã thả (tối đa 3 icon + tổng số). Rê chuột → danh sách người đã thả
 * (popover riêng: tooltip `title` gốc không hiện trong trình duyệt nhúng).
 */
function ReactionBadge({ reactions }: { reactions?: Reactions }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!reactions?.length) return null;
  const total = reactions.reduce((n, r) => n + r.count, 0);
  return (
    <span
      onMouseEnter={(e) => setAnchor(e.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
      className="inline-flex cursor-default items-center gap-0.5 rounded-full border bg-white px-1.5 py-px text-xs leading-4 text-gray-600 shadow-sm">
      {reactions.slice(0, 3).map((r) => (
        <span key={r.icon} className={r.mine ? "rounded-full ring-1 ring-brand" : ""}>
          {REACTION_EMOJI[r.icon] ?? "👍"}
        </span>
      ))}
      {total > 1 && <span className="ml-0.5">{total}</span>}
      {anchor && <ReactorsPopover anchor={anchor} reactions={reactions} />}
    </span>
  );
}

/** Ai đã thả cảm xúc gì — gộp theo người (1 người có thể thả nhiều icon). */
function ReactorsPopover({ anchor, reactions }: { anchor: HTMLElement; reactions: Reactions }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (ref.current) setPos(placeNear(anchor, ref.current));
  }, [anchor]);

  const people = new Map<string, { name: string; avatar: string | null; icons: string[] }>();
  for (const r of reactions) {
    for (const u of r.users) {
      const name = u.name ?? "Ai đó";
      const p = people.get(name) ?? { name, avatar: u.avatar, icons: [] };
      if (!p.icons.includes(r.icon)) p.icons.push(r.icon);
      people.set(name, p);
    }
  }

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={pos ?? { left: -9999, top: -9999 }}
      className="pointer-events-none fixed z-[1000] max-h-64 w-56 overflow-hidden rounded-lg border bg-white py-1 text-sm shadow-xl">
      {[...people.values()].map((p) => (
        <div key={p.name} className="flex items-center gap-2 px-2.5 py-1">
          {/* Ảnh Zalo lỗi / hết hạn → chữ viết tắt */}
          <ZaloAvatar avatar={p.avatar} isGroup={false} members={[{ name: p.name, avatar: null }]} size={24} />
          <span className="min-w-0 flex-1 truncate text-gray-800">{p.name}</span>
          <span className="shrink-0">{p.icons.map((i) => REACTION_EMOJI[i] ?? i).join("")}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

/**
 * Góc dưới bong bóng: cụm cảm xúc + nút thả nhanh (hiện khi rê chuột vào tin).
 * Rê / bấm nút → bảng chọn nổi (portal, không đẩy layout, không đổi vị trí cuộn).
 */
export function ReactionBar({
  reactions,
  onReact,
}: {
  reactions?: Reactions;
  // null = không thả được (thiếu quyền / chưa cấu hình / đang chọn nhiều)
  onReact: ((icon: ReactionIcon | "NONE") => void) | null;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  // Nút đang neo bảng chọn (null = đóng)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = !!anchor;
  const setOpen = (next: boolean) => setAnchor(next ? btnRef.current : null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = (next: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!reactions?.length && !onReact) return null;
  return (
    <span className="absolute -bottom-3 right-2 z-[1] flex items-center gap-1">
      <ReactionBadge reactions={reactions} />
      {onReact && (
        <button
          ref={btnRef}
          onMouseEnter={() => schedule(true, 200)}
          onMouseLeave={() => schedule(false, 250)}
          // Bấm = thả ❤️ nhanh (cảm xúc mặc định); rê chuột mới mở bảng chọn
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            setOpen(false);
            onReact("HEART");
          }}
          title="Bấm để thả ❤️ · rê chuột để chọn cảm xúc khác"
          aria-label="Thả cảm xúc"
          className={`flex h-6 w-6 items-center justify-center rounded-full border bg-white text-gray-500 shadow-sm hover:text-brand ${
            open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
          <Heart className="h-3.5 w-3.5" />
        </button>
      )}
      {anchor && onReact && (
        <ReactionPicker
          anchor={anchor}
          mine={(reactions ?? []).filter((r) => r.mine).map((r) => r.icon)}
          onEnter={() => schedule(true, 0)}
          onLeave={() => schedule(false, 250)}
          onClose={() => setOpen(false)}
          onPick={(icon) => {
            setOpen(false);
            onReact(icon);
          }}
        />
      )}
    </span>
  );
}

function ReactionPicker({
  anchor,
  mine,
  onEnter,
  onLeave,
  onClose,
  onPick,
}: {
  anchor: HTMLElement;
  mine: string[];
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
  onPick: (icon: ReactionIcon | "NONE") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Canh theo nút (xem placeNear)
  useLayoutEffect(() => {
    if (ref.current) setPos(placeNear(anchor, ref.current));
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Khung tin cuộn → nút đã dời chỗ, đóng bảng thay vì để lệch
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Chọn cảm xúc"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={pos ?? { left: -9999, top: -9999 }}
      className="fixed z-[1000] flex items-center gap-0.5 rounded-full border bg-white px-2 py-1 shadow-xl">
      {REACTION_ICONS.map((icon) => (
        <button
          key={icon}
          role="menuitem"
          onClick={() => onPick(icon)}
          title={REACTION_LABEL[icon]}
          aria-label={REACTION_LABEL[icon]}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none transition-transform hover:scale-125 ${
            mine.includes(icon) ? "bg-cyan-bg" : ""
          }`}>
          {REACTION_EMOJI[icon]}
        </button>
      ))}
      {mine.length > 0 && (
        <button
          role="menuitem"
          onClick={() => onPick("NONE")}
          title="Thu hồi cảm xúc"
          aria-label="Thu hồi cảm xúc"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>,
    document.body
  );
}
