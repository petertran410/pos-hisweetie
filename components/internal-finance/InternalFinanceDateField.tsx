"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { normalizeRectForFixed } from "@/lib/utils/zoom";

const formatDateLabel = (value: string) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "dd/mm/yyyy";

export function InternalFinanceDateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  minDate?: string;
  maxDate?: string;
  compact?: boolean;
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
          const left = Math.max(
            8,
            Math.min(rect.left, window.innerWidth - width - 8),
          );
          const estimatedHeight = 350;
          const top =
            rect.bottom + estimatedHeight > window.innerHeight
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
                onChange={(nextValue) => {
                  onChange(nextValue || undefined);
                  setOpen(false);
                }}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          );
        })()
      : null;

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        className={`dt-input flex w-full items-center justify-between gap-2 text-left ${
          compact ? "dt-input-sm h-9 !py-1.5 !text-xs" : "min-h-10"
        } ${open ? "border-[var(--dt-primary)] ring-2 ring-[var(--dt-primary-ring)]" : ""}`}>
        <span className={value ? "text-[var(--dt-text)]" : "text-[var(--dt-text-muted)]"}>
          {formatDateLabel(value)}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--dt-text-muted)]" />
      </button>
      {popover}
    </div>
  );
}
