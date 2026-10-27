"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Copy, Download, Forward, Reply } from "lucide-react";

export type MessageMenuAction = "reply" | "forward" | "copy" | "download" | "select";

interface Props {
  x: number;
  y: number;
  canReply: boolean;
  hasText: boolean;
  hasMedia: boolean;
  onAction: (a: MessageMenuAction) => void;
  onClose: () => void;
}

/** Menu thao tác 1 tin (chuột phải hoặc nút ⋯), kiểu Zalo. */
export function MessageMenu({ x, y, canReply, hasText, hasMedia, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // position:fixed bị nhân CSS zoom của <html> → quy đổi toạ độ con trỏ
  const zoom = typeof window === "undefined" ? 1 : parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
  const W = 180;
  const H = 200;
  const left = Math.min(x, window.innerWidth - W * zoom - 8) / zoom;
  const top = Math.min(y, window.innerHeight - H * zoom - 8) / zoom;

  const items: { key: MessageMenuAction; label: string; icon: typeof Reply; show: boolean }[] = [
    { key: "reply", label: "Trả lời", icon: Reply, show: canReply },
    { key: "forward", label: "Chuyển tiếp", icon: Forward, show: true },
    { key: "copy", label: "Sao chép", icon: Copy, show: hasText },
    { key: "download", label: "Tải ảnh / tệp", icon: Download, show: hasMedia },
    { key: "select", label: "Chọn nhiều tin", icon: CheckSquare, show: true },
  ];

  return createPortal(
    <div
      ref={ref}
      style={{ left, top, width: W }}
      className="fixed z-[1000] rounded-lg border bg-white py-1 text-sm shadow-xl">
      {items
        .filter((i) => i.show)
        .map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              onAction(key);
              onClose();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50">
            <Icon className="h-4 w-4 text-gray-500" />
            {label}
          </button>
        ))}
    </div>,
    document.body
  );
}
