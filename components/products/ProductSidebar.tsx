"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useCategories } from "@/lib/hooks/useCategories";
import { Category } from "@/lib/api/categories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { TradeMark } from "@/lib/api/trademarks";
import { Check, ChevronRight, Calendar } from "lucide-react";
import { MultiSelectDropdown } from "@/components/shared/MultiSelectDropdown";
import { SimpleDropdown } from "@/components/shared/SimpleDropdown";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

interface ProductsSidebarProps {
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
}

const PRESET_GROUPS = [
  {
    label: "Tất cả",
    options: [{ label: "Toàn thời gian", value: "all_time" }],
  },
  {
    label: "Theo ngày",
    options: [
      { label: "Hôm nay", value: "today" },
      { label: "Hôm qua", value: "yesterday" },
    ],
  },
  {
    label: "Theo tuần",
    options: [
      { label: "Tuần này", value: "this_week" },
      { label: "Tuần trước", value: "last_week" },
      { label: "7 ngày qua", value: "last_7_days" },
    ],
  },
  {
    label: "Theo tháng",
    options: [
      { label: "Tháng này", value: "this_month" },
      { label: "Tháng trước", value: "last_month" },
      { label: "30 ngày qua", value: "last_30_days" },
    ],
  },
  {
    label: "Theo quý",
    options: [
      { label: "Quý này", value: "this_quarter" },
      { label: "Quý trước", value: "last_quarter" },
    ],
  },
  {
    label: "Theo năm",
    options: [
      { label: "Năm nay", value: "this_year" },
      { label: "Năm trước", value: "last_year" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);

// Mốc 23:59:59.999 (local) của ngày `d` — cho preset kết thúc trong quá khứ.
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today.getTime() - 86400000);
      return { from: y, to: new Date(y.getTime() + 86400000 - 1) };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay());
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { from: s, to: endOfDay(e) };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
    }
    case "last_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const s =
        q === 0
          ? new Date(now.getFullYear() - 1, 9, 1)
          : new Date(now.getFullYear(), (q - 1) * 3, 1);
      const e = new Date(now.getFullYear(), q * 3, 0);
      return { from: s, to: endOfDay(e) };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    default:
      return { from: today, to: now };
  }
};

// ── PresetPanel (portal) — bám cạnh phải sidebar, giống OrdersSidebar ──
function PresetPanel({
  groups,
  selected,
  onSelect,
  onClose,
  anchorRect,
  triggerRef,
}: {
  groups: typeof PRESET_GROUPS;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const insidePanel = ref.current?.contains(e.target as Node);
      const insideTrigger = triggerRef.current?.contains(e.target as Node);
      if (!insidePanel && !insideTrigger) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof window === "undefined") return null;

  const left = anchorRect.right + 8;
  const top = anchorRect.top;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 flex gap-5 animate-in fade-in zoom-in-95 duration-150">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 min-w-[88px]">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {group.label}
          </span>
          {group.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                onClose();
              }}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all whitespace-nowrap text-left ${
                selected === opt.value
                  ? "bg-brand text-white border-brand font-medium shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Hoạt động",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "inactive",
    label: "Ngừng hoạt động",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const STOCK_OPTIONS = [
  { value: "instock", label: "Còn hàng" },
  { value: "outstock", label: "Hết hàng" },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: 2, label: "Hàng hóa" },
  { value: 3, label: "Dịch vụ" },
  { value: 1, label: "Combo - đóng gói" },
  { value: 4, label: "Hàng sản xuất" },
];

const DIRECT_SALE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
];

export function ProductsSidebar({ onFiltersChange }: ProductsSidebarProps) {
  const { data: parentCategories } = useCategories("parent", {
    silentForbidden: true,
  });
  const { data: middleCategories } = useCategories("middle", {
    silentForbidden: true,
  });
  const { data: childCategories } = useCategories("child", {
    silentForbidden: true,
  });
  const { data: trademarks } = useTrademarks({ silentForbidden: true });

  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);
  const [middleNames, setMiddleNames] = useState<string[]>([]);
  const [childNames, setChildNames] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState("");
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);
  const [directSale, setDirectSale] = useState("");

  // ── Thời gian tạo ──
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const parentOptions = useMemo(
    () =>
      (parentCategories || [])
        .filter((c: Category) => c.type === "parent")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [parentCategories]
  );

  const middleOptions = useMemo(
    () =>
      (middleCategories || [])
        .filter((c: Category) => c.type === "middle")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [middleCategories]
  );

  const childOptions = useMemo(
    () =>
      (childCategories || [])
        .filter((c: Category) => c.type === "child")
        .map((c: Category) => ({ value: c.name, label: c.name })),
    [childCategories]
  );

  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: TradeMark) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  const isDateFilterActive =
    (dateMode === "preset" && selectedPreset !== "all_time") ||
    (dateMode === "custom" && !!(fromDate && toDate));

  const activeFilterCount =
    [selectedStatus, stockStatus, directSale].filter(Boolean).length +
    (selectedTypes.length > 0 ? 1 : 0) +
    (parentNames.length > 0 ? 1 : 0) +
    (middleNames.length > 0 ? 1 : 0) +
    (childNames.length > 0 ? 1 : 0) +
    (tradeMarkIds.length > 0 ? 1 : 0) +
    (isDateFilterActive ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: Record<string, unknown> = {};
      if (selectedStatus === "active") f.isActive = true;
      if (selectedStatus === "inactive") f.isActive = false;
      if (selectedTypes.length > 0) f.types = selectedTypes;
      if (parentNames.length > 0) f.parentNames = parentNames;
      if (middleNames.length > 0) f.middleNames = middleNames;
      if (childNames.length > 0) f.childNames = childNames;
      if (stockStatus) f.stockStatus = stockStatus;
      if (tradeMarkIds.length > 0) f.tradeMarkIds = tradeMarkIds.map(Number);
      if (directSale === "yes") f.isDirectSale = true;
      if (directSale === "no") f.isDirectSale = false;

      if (selectedPreset !== "all_time" || dateMode === "custom") {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? {
                  from: new Date(fromDate + "T00:00:00"),
                  to: new Date(toDate + "T23:59:59.999"),
                }
              : null;
        if (range) {
          f.fromCreatedDate = range.from.toISOString();
          f.toCreatedDate = range.to.toISOString();
        }
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedStatus,
    selectedTypes,
    parentNames,
    middleNames,
    childNames,
    stockStatus,
    tradeMarkIds,
    directSale,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    onFiltersChange,
  ]);

  useEffect(() => {
    if (!openCal) return;
    const h = (e: MouseEvent) => {
      if (
        customDateRef.current &&
        !customDateRef.current.contains(e.target as Node)
      )
        setOpenCal(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openCal]);

  const clearAll = () => {
    setSelectedStatus("");
    setSelectedTypes([]);
    setParentNames([]);
    setMiddleNames([]);
    setChildNames([]);
    setStockStatus("");
    setTradeMarkIds([]);
    setDirectSale("");
    setDateMode("preset");
    setSelectedPreset("all_time");
    setFromDate("");
    setToDate("");
    setShowPresetPanel(false);
    setOpenCal(null);
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
        {/* ── Thời gian tạo ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Thời gian tạo
            </label>
          </div>

          <div className="space-y-1.5">
            {/* Row: Preset (radio) */}
            <div
              ref={presetRowRef}
              onClick={() => {
                setDateMode("preset");
                setOpenCal(null);
                if (showPresetPanel) {
                  setShowPresetPanel(false);
                } else {
                  setPanelAnchorRect(
                    presetRowRef.current?.getBoundingClientRect() ?? null
                  );
                  setShowPresetPanel(true);
                }
              }}
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all select-none ${
                dateMode === "preset"
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  dateMode === "preset" ? "border-brand" : "border-gray-300"
                }`}>
                {dateMode === "preset" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1 font-medium">
                {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
              </span>
              <ChevronRight
                className={`w-4 h-4 transition-colors flex-shrink-0 ${
                  showPresetPanel ? "text-brand" : "text-gray-400"
                }`}
              />
            </div>

            {/* Row: Tùy chỉnh (radio) */}
            <div
              onClick={() => {
                setDateMode("custom");
                setShowPresetPanel(false);
              }}
              className={`flex items-center gap-2.5 px-2 py-1 rounded-lg border cursor-pointer transition-all ${
                dateMode === "custom"
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <div
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  dateMode === "custom" ? "border-brand" : "border-gray-300"
                }`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">Tùy chỉnh</span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>

            {/* Custom date fields + MiniCalendar */}
            {dateMode === "custom" && (
              <div ref={customDateRef} className="space-y-2 pt-1">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const label = isFrom ? "Từ ngày" : "Đến ngày";
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;

                  return (
                    <div key={field}>
                      <span className="text-xs text-gray-500 mb-1 block">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${
                          val
                            ? "border-brand bg-brand-soft text-gray-800"
                            : "border-gray-200 text-gray-400"
                        } ${isOpen ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-300"}`}>
                        <span>
                          {val
                            ? new Date(val + "T00:00:00").toLocaleDateString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }
                              )
                            : "Chọn ngày"}
                        </span>
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                      {isOpen && (
                        <MiniCalendar
                          value={val}
                          onChange={setVal}
                          onClose={() => setOpenCal(null)}
                          minDate={
                            field === "to" ? fromDate || undefined : undefined
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PresetPanel portal */}
            {showPresetPanel && (
              <PresetPanel
                groups={PRESET_GROUPS}
                selected={selectedPreset}
                onSelect={setSelectedPreset}
                onClose={() => setShowPresetPanel(false)}
                anchorRect={panelAnchorRect}
                triggerRef={presetRowRef}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    selectedStatus === opt.value ? "" : opt.value
                  )
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedStatus === opt.value
                    ? opt.color + " border-current"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedStatus === opt.value ? opt.dot : "bg-gray-300"
                  }`}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại sản phẩm
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TYPE_OPTIONS.map((opt) => {
              const isActive = selectedTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSelectedTypes((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((t) => t !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "bg-brand-soft text-brand-dark border-brand"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại Hàng
          </label>
          <MultiSelectDropdown
            options={parentOptions}
            values={parentNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm loại hàng..."
            onChange={setParentNames}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nguồn Gốc
          </label>
          <MultiSelectDropdown
            options={middleOptions}
            values={middleNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm nguồn gốc..."
            onChange={setMiddleNames}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Danh Mục
          </label>
          <MultiSelectDropdown
            options={childOptions}
            values={childNames}
            placeholder="Tất cả"
            searchPlaceholder="Tìm danh mục..."
            onChange={setChildNames}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tồn kho
          </label>
          <SimpleDropdown
            options={STOCK_OPTIONS}
            value={stockStatus}
            placeholder="Tất cả"
            onChange={setStockStatus}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thương hiệu
          </label>
          <MultiSelectDropdown
            options={trademarkOptions}
            values={tradeMarkIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm thương hiệu..."
            onChange={setTradeMarkIds}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bán trực tiếp
          </label>
          <SimpleDropdown
            options={DIRECT_SALE_OPTIONS}
            value={directSale}
            placeholder="Tất cả"
            onChange={setDirectSale}
          />
        </div>
      </div>
    </aside>
  );
}
