"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calendar, Check, ChevronLeft } from "lucide-react";
import { MiniCalendar } from "@/components/shared/TimeRangeFilter";
import type { CustomDates } from "@/lib/api/dashboard";

export interface DashOption<K extends string> {
  key: K;
  label: string;
}

/** "YYYY-MM-DD" → "dd/MM/yyyy". */
export const fmtDay = (d: string) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

/** Nhãn cho khoảng ngày tùy chọn: 1 ngày → "dd/MM/yyyy", nhiều ngày → "dd/MM/yyyy – dd/MM/yyyy". */
export const customLabel = (c?: CustomDates) =>
  c?.from && c?.to
    ? c.from === c.to
      ? fmtDay(c.from)
      : `${fmtDay(c.from)} – ${fmtDay(c.to)}`
    : "Tùy chọn ngày";

/** Đóng popover khi click ra ngoài / bấm Esc. */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

/**
 * Chọn 1 ngày hoặc 1 khoảng ngày (Từ ngày / Đến ngày). Bỏ trống "Đến ngày"
 * = chỉ xem đúng ngày "Từ ngày". Dùng chung cho popover desktop và sheet mobile.
 */
export function CustomRangeBody({
  initial,
  onApply,
  onCancel,
}: {
  initial?: CustomDates;
  onApply: (c: CustomDates) => void;
  onCancel?: () => void;
}) {
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");

  return (
    <div className="w-full">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div
            className="text-xs mb-1"
            style={{ color: "var(--dt-text-muted)" }}>
            Từ ngày{from ? `: ${fmtDay(from)}` : ""}
          </div>
          <MiniCalendar
            value={from}
            onChange={(d) => {
              setFrom(d);
              if (d && to && to < d) setTo("");
            }}
            onClose={() => {}}
          />
        </div>
        <div>
          <div
            className="text-xs mb-1"
            style={{ color: "var(--dt-text-muted)" }}>
            Đến ngày
            {to ? `: ${fmtDay(to)}` : from ? " (bỏ trống = 1 ngày)" : ""}
          </div>
          <MiniCalendar
            value={to}
            onChange={setTo}
            onClose={() => {}}
            minDate={from || undefined}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] px-3 py-[7px] rounded-[4px] border-[1.5px] font-semibold"
            style={{
              borderColor: "var(--dt-border)",
              color: "var(--dt-text-secondary)",
            }}>
            Hủy
          </button>
        )}
        <button
          type="button"
          disabled={!from}
          onClick={() => onApply({ from, to: to || from })}
          className="text-[13px] px-4 py-[7px] rounded-[4px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--dt-primary)" }}>
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function CustomPanel({
  custom,
  onApply,
  onCancel,
  onBack,
}: {
  custom?: CustomDates;
  onApply: (c: CustomDates) => void;
  onCancel: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="p-3 w-[min(480px,calc(100vw-32px))]">
      <div className="flex items-center gap-1 mb-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ml-1 rounded hover:bg-gray-100"
            aria-label="Quay lại">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <span className="text-[13px] font-semibold">Chọn ngày cụ thể</span>
      </div>
      <CustomRangeBody initial={custom} onApply={onApply} onCancel={onCancel} />
    </div>
  );
}

const POPOVER =
  "absolute right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg";

/**
 * Dropdown kiểu dt-select (có dấu ✓ ở mục đang chọn). Bật `allowCustom` để có
 * thêm mục "Tùy chọn ngày" — mở lịch chọn 1 ngày / khoảng ngày; khi đó key
 * trả về là "custom" kèm khoảng ngày đã chọn.
 */
export function DashSelect<K extends string>({
  options,
  value,
  onChange,
  allowCustom = false,
  custom,
  size = "sm",
  className = "",
  ariaLabel,
}: {
  options: DashOption<K>[];
  value: K;
  onChange: (key: K, custom?: CustomDates) => void;
  allowCustom?: boolean;
  custom?: CustomDates;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "custom">("list");
  const ref = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setView("list");
  };
  useDismiss(ref, open, close);

  const isCustom = allowCustom && value === "custom";
  const label = isCustom
    ? customLabel(custom)
    : (options.find((o) => o.key === value)?.label ?? "");

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`dt-select ${size === "sm" ? "dt-select-sm" : ""} whitespace-nowrap text-left`}
        style={open ? { borderColor: "var(--dt-primary)" } : undefined}>
        {label}
      </button>
      {open && (
        <div className={POPOVER} style={{ borderColor: "var(--dt-border)" }}>
          {view === "list" ? (
            <div className="py-1 min-w-[190px]">
              {options.map((o) => {
                const on = o.key === value;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      onChange(o.key);
                      close();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-[9px] text-[13.5px] text-left hover:bg-[var(--dt-bg-soft)]"
                    style={
                      on ? { background: "var(--dt-cyan-bg)" } : undefined
                    }>
                    <span>{o.label}</span>
                    {on && (
                      <Check
                        className="w-4 h-4"
                        style={{ color: "var(--dt-primary)" }}
                      />
                    )}
                  </button>
                );
              })}
              {allowCustom && (
                <button
                  type="button"
                  onClick={() => setView("custom")}
                  className="w-full flex items-center justify-between gap-3 px-4 py-[9px] text-[13.5px] text-left border-t hover:bg-[var(--dt-bg-soft)]"
                  style={{
                    borderColor: "var(--dt-border)",
                    ...(isCustom ? { background: "var(--dt-cyan-bg)" } : {}),
                  }}>
                  <span className="flex items-center gap-2">
                    <Calendar
                      className="w-4 h-4"
                      style={{ color: "var(--dt-text-muted)" }}
                    />
                    {isCustom ? customLabel(custom) : "Tùy chọn ngày…"}
                  </span>
                  {isCustom && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: "var(--dt-primary)" }}
                    />
                  )}
                </button>
              )}
            </div>
          ) : (
            <CustomPanel
              custom={custom}
              onBack={() => setView("list")}
              onCancel={close}
              onApply={(c) => {
                onChange("custom" as K, c);
                close();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Nhóm nút (dt-seg) + nút cuối "Tùy chọn ngày" mở lịch. Popover đặt ngoài
 * .dt-seg vì .dt-seg có overflow:hidden.
 */
export function DashRangeSeg<K extends string>({
  options,
  value,
  onChange,
  custom,
  small = false,
}: {
  options: DashOption<K>[];
  value: K;
  onChange: (key: K, custom?: CustomDates) => void;
  custom?: CustomDates;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const isCustom = value === "custom";

  const customBtn: ReactNode = (
    <button
      type="button"
      data-on={isCustom}
      onClick={() => setOpen((v) => !v)}
      className="inline-flex items-center gap-[6px]">
      <Calendar className="w-[14px] h-[14px]" />
      {isCustom ? customLabel(custom) : "Tùy chọn"}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <div className={`dt-seg ${small ? "dt-seg-sm" : ""}`}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            data-on={value === o.key}
            onClick={() => {
              onChange(o.key);
              setOpen(false);
            }}>
            {o.label}
          </button>
        ))}
        {customBtn}
      </div>
      {open && (
        <div className={POPOVER} style={{ borderColor: "var(--dt-border)" }}>
          <CustomPanel
            custom={custom}
            onCancel={() => setOpen(false)}
            onApply={(c) => {
              onChange("custom" as K, c);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
