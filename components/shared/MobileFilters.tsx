"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  ChevronDown,
  Search,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Bộ điều khiển filter mobile dùng chung cho Hóa đơn / Đơn hàng / Hóa đơn VAT.
// Mục tiêu: đầy đủ filter như desktop nhưng tối ưu cho màn hình nhỏ — bottom
// sheet, các nhóm filter dạng accordion, chip chọn nhanh, ô tìm kiếm inline.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChipOption {
  value: string;
  label: string;
  dot?: string; // class màu chấm trạng thái (optional)
}

// ─── Bottom sheet shell ───────────────────────────────────────────────────────
export function MobileFilterSheet({
  title = "Bộ lọc",
  activeCount = 0,
  onReset,
  onApply,
  onClose,
  children,
}: {
  title?: string;
  activeCount?: number;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Khóa scroll nền khi sheet mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-brand-soft text-brand rounded-full text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {children}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onApply}
            className="w-full py-3.5 bg-brand text-white rounded-2xl font-semibold text-sm hover:bg-brand-dark active:scale-[0.98] transition-all">
            Áp dụng{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────
export function FilterSection({
  label,
  summary,
  defaultOpen = false,
  children,
}: {
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-4">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between py-3.5 text-left">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <div className="flex items-center gap-2 min-w-0">
          {summary && (
            <span className="text-xs text-brand font-medium truncate max-w-[150px]">
              {summary}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ─── Chip group (single hoặc multi) ───────────────────────────────────────────
export function ChipGroup({
  options,
  values,
  multiple = true,
  onChange,
}: {
  options: ChipOption[];
  values: string[];
  multiple?: boolean;
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange(multiple ? [...values, val] : [val]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
              active
                ? "bg-brand text-white border-brand"
                : "bg-white text-gray-600 border-gray-200 hover:border-brand"
            }`}>
            {active ? (
              <Check className="w-3.5 h-3.5" />
            ) : opt.dot ? (
              <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Searchable multi-select inline (chi nhánh, người tạo, người bán...) ──────
export function SearchableChecklist({
  options,
  values,
  searchPlaceholder = "Tìm...",
  emptyText = "Không có dữ liệu",
  onChange,
}: {
  options: ChipOption[];
  values: string[];
  searchPlaceholder?: string;
  emptyText?: string;
  onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  const toggle = (val: string) =>
    onChange(
      values.includes(val)
        ? values.filter((v) => v !== val)
        : [...values, val]
    );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-2 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
          />
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-400 text-center">
            {emptyText}
          </div>
        ) : (
          filtered.map((opt, idx) => {
            const active = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    active
                      ? "bg-brand border-brand"
                      : "border-gray-300 bg-white"
                  }`}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate text-gray-700">{opt.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── MiniCalendar (inline, không dùng popup native) ──────────────────────────
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/** Hiển thị nhãn ngày kiểu dd/mm/yyyy từ chuỗi yyyy-mm-dd. */
function formatDateLabel(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function MiniCalendar({
  value,
  min,
  max,
  onSelect,
}: {
  value: string; // yyyy-mm-dd
  min?: string;
  max?: string;
  onSelect: (d: string) => void;
}) {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewY, setViewY] = useState(base.getFullYear());
  const [viewM, setViewM] = useState(base.getMonth()); // 0-11

  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  // Offset cột đầu: chuyển CN(0)..T7(6) → T2(0)..CN(6)
  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewM === 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else setViewM((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else setViewM((m) => m + 1);
  };

  const todayStr = (() => {
    const t = new Date();
    return fmt(t.getFullYear(), t.getMonth(), t.getDate());
  })();

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white">
      {/* Header tháng/năm */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTHS_VI[viewM]} {viewY}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Thứ */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[11px] font-medium text-gray-400 text-center py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Ngày */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={`e${i}`} />;
          const ds = fmt(viewY, viewM, d);
          const disabled = (min && ds < min) || (max && ds > max);
          const selected = ds === value;
          const isToday = ds === todayStr;
          return (
            <button
              key={ds}
              type="button"
              disabled={!!disabled}
              onClick={() => onSelect(ds)}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                selected
                  ? "bg-brand text-white"
                  : disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : isToday
                      ? "bg-brand-soft text-brand"
                      : "text-gray-700 hover:bg-gray-100"
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date range (preset chips + tùy chọn ngày cụ thể) ─────────────────────────
export interface DatePreset {
  value: string;
  label: string;
}

export function DateRangeFilter({
  presets,
  mode,
  preset,
  fromDate,
  toDate,
  onChange,
}: {
  presets: DatePreset[];
  mode: "preset" | "custom";
  preset: string;
  fromDate: string; // yyyy-mm-dd
  toDate: string; // yyyy-mm-dd
  onChange: (next: {
    mode: "preset" | "custom";
    preset: string;
    fromDate: string;
    toDate: string;
  }) => void;
}) {
  // Field nào đang mở lịch inline: "from" | "to" | null
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = mode === "preset" && preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setOpenCal(null);
                onChange({ mode: "preset", preset: p.value, fromDate, toDate });
              }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand"
              }`}>
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onChange({ mode: "custom", preset, fromDate, toDate })
          }
          className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
            mode === "custom"
              ? "bg-brand text-white border-brand"
              : "bg-white text-gray-600 border-gray-200 hover:border-brand"
          }`}>
          Tùy chọn ngày
        </button>
      </div>

      {mode === "custom" && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Từ ngày */}
            <button
              type="button"
              onClick={() => setOpenCal((c) => (c === "from" ? null : "from"))}
              className={`flex items-center justify-between gap-1 border rounded-xl px-3 py-2.5 text-sm transition-colors ${
                openCal === "from"
                  ? "border-brand ring-2 ring-brand-soft"
                  : "border-gray-200"
              }`}>
              <span className="flex flex-col items-start min-w-0">
                <span className="text-[11px] text-gray-400 leading-none mb-0.5">
                  Từ ngày
                </span>
                <span
                  className={`leading-none truncate ${
                    fromDate ? "text-gray-800 font-medium" : "text-gray-400"
                  }`}>
                  {fromDate ? formatDateLabel(fromDate) : "Chọn ngày"}
                </span>
              </span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {/* Đến ngày */}
            <button
              type="button"
              onClick={() => setOpenCal((c) => (c === "to" ? null : "to"))}
              className={`flex items-center justify-between gap-1 border rounded-xl px-3 py-2.5 text-sm transition-colors ${
                openCal === "to"
                  ? "border-brand ring-2 ring-brand-soft"
                  : "border-gray-200"
              }`}>
              <span className="flex flex-col items-start min-w-0">
                <span className="text-[11px] text-gray-400 leading-none mb-0.5">
                  Đến ngày
                </span>
                <span
                  className={`leading-none truncate ${
                    toDate ? "text-gray-800 font-medium" : "text-gray-400"
                  }`}>
                  {toDate ? formatDateLabel(toDate) : "Chọn ngày"}
                </span>
              </span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          </div>

          {/* Lịch inline — render ngay trong sheet, đóng bằng cách chọn ngày
              hoặc bấm lại nút field tương ứng. */}
          {openCal === "from" && (
            <MiniCalendar
              value={fromDate}
              max={toDate || undefined}
              onSelect={(d) => {
                onChange({ mode: "custom", preset, fromDate: d, toDate });
                setOpenCal(null);
              }}
            />
          )}
          {openCal === "to" && (
            <MiniCalendar
              value={toDate}
              min={fromDate || undefined}
              onSelect={(d) => {
                onChange({ mode: "custom", preset, fromDate, toDate: d });
                setOpenCal(null);
              }}
            />
          )}

          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                onChange({ mode: "custom", preset, fromDate: "", toDate: "" });
                setOpenCal(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1">
              Xóa ngày đã chọn
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers dùng chung cho chuyển đổi ngày ───────────────────────────────────

/** yyyy-mm-dd (local) → ISO đầu ngày. */
export function dateInputToIsoStart(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00`).toISOString();
}

/** yyyy-mm-dd (local) → ISO cuối ngày. */
export function dateInputToIsoEnd(d: string): string | undefined {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999`).toISOString();
}

/** ISO → yyyy-mm-dd (local) để đổ vào <input type="date">. */
export function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Lưu / khôi phục filter mobile qua localStorage ──────────────────────────
// Mỗi trang mobile (hóa đơn, đơn hàng, hóa đơn VAT) tự giữ filter của mình bằng
// một key riêng. Khác desktop (sidebar lưu từng field), ở đây ta lưu nguyên cục
// object filter đã build sẵn để gọi API — vừa đủ để khôi phục sau khi reload.
//
// Lưu ý: cả layout desktop (sidebar) lẫn mobile cùng mount (ẩn bằng CSS), nên
// KHÔNG dựa vào `filters` prop từ page (sidebar có thể ghi đè). Mobile dùng state
// đã khôi phục này làm nguồn sự thật cho query của riêng nó.

export function readMobileFilters(storageKey: string): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeMobileFilters(storageKey: string, filters: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(filters ?? {}));
  } catch {
    /* ignore quota / serialize errors */
  }
}

