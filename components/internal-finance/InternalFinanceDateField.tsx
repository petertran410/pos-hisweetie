"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { getFixedViewport, normalizeRectForFixed } from "@/lib/utils/zoom";

const formatDateLabel = (value: string, withTime: boolean) => {
  if (!value) return withTime ? "dd/mm/yyyy --:--" : "dd/mm/yyyy";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!withTime) return day;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
  return `${day} ${time}`;
};

export function InternalFinanceDateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  compact = false,
  variant = "form",
  withTime = false,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  minDate?: string;
  maxDate?: string;
  compact?: boolean;
  /** "filter": cùng kiểu với các ô chọn trong sidebar bộ lọc. */
  variant?: "form" | "filter";
  /** Chọn cả giờ: giá trị dạng "YYYY-MM-DDTHH:mm" (giờ máy). */
  withTime?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const openCalendar = () => {
    setAnchorRect(triggerRef.current?.getBoundingClientRect() || null);
    setOpen((current) => !current);
  };

  const popover =
    open && anchorRect && typeof document !== "undefined"
      ? (() => {
          const rect = normalizeRectForFixed(anchorRect);
          const width = 272;
          // Viewport phải cùng hệ toạ độ đã bù zoom với rect, nếu không lịch
          // của ô sát mép phải bị kéo lệch sang trái.
          const viewport = getFixedViewport(rect.zoom);
          // Không đủ chỗ bên phải thì canh mép phải của lịch theo mép phải ô.
          const preferred =
            rect.left + width > viewport.width - 8
              ? rect.right - width
              : rect.left;
          const left = Math.max(
            8,
            Math.min(preferred, viewport.width - width - 8),
          );
          const estimatedHeight = withTime ? 410 : 350;
          const top =
            rect.bottom + estimatedHeight > viewport.height
              ? Math.max(8, rect.top - estimatedHeight - 8)
              : rect.bottom + 8;

          return createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[100] w-[272px]"
              style={{ left, top }}>
              <MiniCalendar
                value={value}
                minDate={minDate}
                maxDate={maxDate}
                withTime={withTime}
                onChange={(nextValue) => {
                  onChange(nextValue || undefined);
                  // Có giờ thì để mở cho chỉnh giờ; bấm "Xong" mới đóng.
                  if (!withTime) setOpen(false);
                }}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          );
        })()
      : null;

  const filter = variant === "filter";

  return (
    <div
      className={`relative flex min-w-0 flex-col ${filter ? "gap-2" : "gap-1.5"}`}>
      <span
        className={
          filter
            ? "text-sm font-medium text-gray-700"
            : "text-xs font-medium text-gray-600"
        }>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        className={
          filter
            ? `flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-left text-sm transition-colors ${
                open
                  ? "border-brand ring-2 ring-brand-soft"
                  : "hover:border-gray-400"
              }`
            : `dt-input flex w-full items-center justify-between gap-2 text-left ${
                compact ? "dt-input-sm h-9 !py-1.5 !text-xs" : "min-h-10"
              } ${open ? "border-[var(--dt-primary)] ring-2 ring-[var(--dt-primary-ring)]" : ""}`
        }>
        <span
          className={
            filter
              ? value
                ? "text-gray-800"
                : "text-gray-400"
              : value
                ? "text-[var(--dt-text)]"
                : "text-[var(--dt-text-muted)]"
          }>
          {formatDateLabel(value, withTime)}
        </span>
        <CalendarDays
          className={`h-4 w-4 shrink-0 ${
            filter ? "text-gray-400" : "text-[var(--dt-text-muted)]"
          }`}
        />
      </button>
      {popover}
    </div>
  );
}
