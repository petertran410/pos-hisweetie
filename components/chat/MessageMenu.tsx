"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Copy, Download, Forward, Reply, Trash2, Undo2 } from "lucide-react";

export type MessageMenuAction = "reply" | "forward" | "copy" | "download" | "select" | "recall" | "delete";

interface Props {
  x: number;
  y: number;
  canReply: boolean;
  hasText: boolean;
  hasMedia: boolean;
  // Thu hồi: tin của kênh, trong 24 giờ; xoá: chỉ phía mình
  canRecall: boolean;
  canDelete: boolean;
  onAction: (a: MessageMenuAction) => void;
  onClose: () => void;
}

/** Menu thao tác 1 tin (chuột phải hoặc nút ⋯), kiểu Zalo. */
export function MessageMenu({ x, y, canReply, hasText, hasMedia, canRecall, canDelete, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mở bằng nhấn giữ (cảm ứng): trình duyệt có thể bắn mousedown khi nhấc tay → bỏ qua lúc đầu
    const openedAt = performance.now();
    const onDown = (e: MouseEvent) => {
      if (performance.now() - openedAt < 400) return;
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
  const H = 300;
  const left = Math.min(x, window.innerWidth - W * zoom - 8) / zoom;
  const top = Math.min(y, window.innerHeight - H * zoom - 8) / zoom;

  const items: { key: MessageMenuAction; label: string; icon: typeof Reply; show: boolean; danger?: boolean }[] = [
    { key: "reply", label: "Trả lời", icon: Reply, show: canReply },
    { key: "forward", label: "Chuyển tiếp", icon: Forward, show: true },
    { key: "copy", label: "Sao chép", icon: Copy, show: hasText },
    { key: "download", label: "Tải ảnh / tệp", icon: Download, show: hasMedia },
    { key: "select", label: "Chọn nhiều tin", icon: CheckSquare, show: true },
    { key: "recall", label: "Thu hồi", icon: Undo2, show: canRecall, danger: true },
    { key: "delete", label: "Xoá ở phía mình", icon: Trash2, show: canDelete, danger: true },
  ];

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Thao tác tin nhắn"
      style={{ left, top, width: W }}
      className="chat-ui fixed z-[1000] rounded-lg border bg-white py-1 text-sm shadow-xl">
      {items
        .filter((i) => i.show)
        .map(({ key, label, icon: Icon, danger }) => (
          <button
            key={key}
            role="menuitem"
            onClick={() => {
              onAction(key);
              onClose();
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 max-lg:py-2.5 ${
              danger ? "text-red-600" : ""
            } ${key === "recall" || (key === "delete" && !canRecall) ? "mt-1 border-t pt-2" : ""}`}>
            <Icon className={`h-4 w-4 ${danger ? "text-red-500" : "text-gray-500"}`} />
            {label}
          </button>
        ))}
    </div>,
    document.body
  );
}
