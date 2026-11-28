"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BotOff, Bot } from "lucide-react";
import { useEscapeClose } from "@/lib/hooks/useEscapeClose";

interface Props {
  x: number;
  y: number;
  /** Hội thoại đang bị loại trừ → mục "Gửi lại phân tích AI" */
  excluded: boolean;
  onPick: () => void;
  onClose: () => void;
}

/** Menu chuột phải của 1 hội thoại trong danh sách chat (quản trị): loại trừ / bỏ loại trừ phân tích AI. */
export function ThreadIntelMenu({ x, y, excluded, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(onClose);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // position:fixed bị nhân CSS zoom của <html> → quy đổi toạ độ con trỏ (như MessageMenu)
  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
  const W = 210;
  const left = Math.min(x, window.innerWidth - W * zoom - 8) / zoom;
  const top = Math.min(y, window.innerHeight - 48 * zoom - 8) / zoom;
  const Icon = excluded ? Bot : BotOff;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Thao tác hội thoại"
      style={{ left, top, width: W }}
      className="chat-ui fixed z-[1000] rounded-lg border bg-white py-1 text-sm shadow-xl">
      <button
        role="menuitem"
        autoFocus
        onClick={() => {
          onPick();
          onClose();
        }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none max-lg:py-2.5">
        <Icon className="h-4 w-4 text-gray-500" aria-hidden />
        {excluded ? "Gửi lại phân tích AI" : "Không gửi phân tích AI"}
      </button>
    </div>,
    document.body
  );
}
