"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useCategories } from "@/lib/hooks/useCategories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { ChevronDown, Check, Search, X } from "lucide-react";

interface ProductsSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

// ─── useDropdownPosition ──────────────────────────────────────────────────────
// Tính toạ độ panel (position: fixed) từ nút trigger, tự lật lên/xuống theo
// khoảng trống viewport. Render qua portal nên không bị container overflow cắt
// và hoạt động chính xác ở mọi mức zoom.
function useDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  panelMaxH: number
) {
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    dropUp: boolean;
  } | null>(null);

  const compute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const GAP = 4;
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const dropUp = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      panelMaxH,
      Math.max(140, dropUp ? spaceAbove : spaceBelow)
    );
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight,
      dropUp,
      top: dropUp ? rect.top - GAP : rect.bottom + GAP,
    });
  }, [triggerRef, panelMaxH]);

  useLayoutEffect(() => {
    if (!open) return;
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, compute]);

  return pos;
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

// Loại sản phẩm — khớp map ở ProductTable.getProductTypeLabel & backend.
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

// ─── MultiSelectDropdown ──────────────────────────────────────────────────────
// Dropdown có ô tìm kiếm, chọn nhiều giá trị, và tự lật hướng mở (lên/xuống)
// theo khoảng trống còn lại của viewport — giống cách KiotViet xử lý.
function MultiSelectDropdown({
  options,
  values,
  placeholder,
  searchPlaceholder = "Tìm kiếm...",
  onChange,
}: {
  options: { value: string; label: string }[];
  values: string[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Chiều cao tối đa của panel (px) — dùng để tính hướng mở.
  const PANEL_MAX_H = 280;
  const pos = useDropdownPosition(open, triggerRef, PANEL_MAX_H);

  // Đóng khi click ra ngoài (cả trigger lẫn panel render qua portal).
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        panelRef.current &&
        !panelRef.current.contains(t)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Focus ô tìm kiếm khi mở.
  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(
    () => options.filter((o) => values.includes(o.value)).map((o) => o.label),
    [options, values]
  );

  const toggle = (v: string) => {
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v]
    );
  };

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `Đã chọn ${selectedLabels.length}`;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
        <span
          className={`truncate ${
            selectedLabels.length ? "text-gray-900" : "text-gray-400"
          }`}>
          {summary}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {values.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed bg-white border rounded-lg shadow-lg z-[1000] flex flex-col"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}>
            {/* Ô tìm kiếm */}
            <div className="p-2 border-b bg-white rounded-t-lg">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Danh sách lựa chọn */}
            <div className="overflow-y-auto z-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  Không tìm thấy
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const checked = values.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggle(opt.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        checked
                          ? "bg-brand-soft text-brand-dark font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked
                            ? "bg-brand border-brand"
                            : "border-gray-300 bg-white"
                        }`}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── SimpleDropdown (single-select, dùng cho Tồn kho / Bán trực tiếp) ──────────
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const PANEL_MAX_H = 264;
  const pos = useDropdownPosition(open, triggerRef, PANEL_MAX_H);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        panelRef.current &&
        !panelRef.current.contains(t)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed bg-white border rounded-lg shadow-lg z-[1000] overflow-y-auto"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}>
            {value && (
              <button
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-sm text-left text-gray-400 hover:bg-gray-50 border-b border-gray-50">
                {placeholder}
              </button>
            )}
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value === value ? "" : opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                  opt.value === value
                    ? "bg-brand-soft text-brand-dark font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span className="truncate">{opt.label}</span>
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
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

  // Mặc định lọc "Hoạt động".
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);
  const [middleNames, setMiddleNames] = useState<string[]>([]);
  const [childNames, setChildNames] = useState<string[]>([]);
  const [stockStatus, setStockStatus] = useState("");
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);
  const [directSale, setDirectSale] = useState("");

  const parentOptions = useMemo(
    () =>
      (parentCategories || [])
        .filter((c: any) => c.type === "parent")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [parentCategories]
  );

  const middleOptions = useMemo(
    () =>
      (middleCategories || [])
        .filter((c: any) => c.type === "middle")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [middleCategories]
  );

  const childOptions = useMemo(
    () =>
      (childCategories || [])
        .filter((c: any) => c.type === "child")
        .map((c: any) => ({ value: c.name, label: c.name })),
    [childCategories]
  );

  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: any) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  const activeFilterCount =
    [selectedStatus, stockStatus, directSale].filter(Boolean).length +
    (selectedTypes.length > 0 ? 1 : 0) +
    (parentNames.length > 0 ? 1 : 0) +
    (middleNames.length > 0 ? 1 : 0) +
    (childNames.length > 0 ? 1 : 0) +
    (tradeMarkIds.length > 0 ? 1 : 0);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
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
  ]);

  const clearAll = () => {
    setSelectedStatus("");
    setSelectedTypes([]);
    setParentNames([]);
    setMiddleNames([]);
    setChildNames([]);
    setStockStatus("");
    setTradeMarkIds([]);
    setDirectSale("");
    onFiltersChange({});
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 overflow-y-auto">
        {/* ── Trạng thái ── */}
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
                }`}>
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

        {/* ── Loại sản phẩm ── */}
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
                  }`}>
                  {isActive && <Check className="w-3 h-3" />}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Loại Hàng ── */}
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

        {/* ── Nguồn Gốc ── */}
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

        {/* ── Danh Mục ── */}
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

        {/* ── Tồn kho ── */}
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

        {/* ── Thương hiệu ── */}
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

        {/* ── Bán trực tiếp ── */}
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
