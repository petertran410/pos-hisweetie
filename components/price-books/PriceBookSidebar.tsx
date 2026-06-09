"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useCategories } from "@/lib/hooks/useCategories";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Pencil,
  X,
  Search,
} from "lucide-react";
import type { PriceBook } from "@/lib/api/price-books";

interface PriceBookSidebarProps {
  priceBooks?: PriceBook[];
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onCreateNew: () => void;
  onEditPriceBook?: (priceBook: PriceBook) => void;
  onFiltersChange: (filters: any) => void;
  initialFilters?: {
    parentName?: string;
    middleName?: string;
    childName?: string;
    stockStatus?: string;
  };
}

interface StockOption {
  value: string;
  label: string;
  color: string;
  dot: string;
}

const STOCK_OPTIONS: StockOption[] = [
  {
    value: "instock",
    label: "Còn hàng",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "outstock",
    label: "Hết hàng",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

// ─── SimpleDropdown (style OrdersSidebar) ──────────────────────────────────
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && options.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
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
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StockDropdown (status style với dot màu) ──────────────────────────────
function StockDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = STOCK_OPTIONS.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`}
              />
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${selected.color}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-sm">Tất cả</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {STOCK_OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                value === opt.value ? "bg-brand-soft" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
              />
              <span
                className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PriceBookPanel (portal, mở về bên phải, giống PresetPanel) ────────────
function PriceBookPanel({
  priceBooks,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onCreateNew,
  onEditPriceBook,
  onClose,
  anchorRect,
  triggerRef,
}: {
  priceBooks?: PriceBook[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateNew: () => void;
  onEditPriceBook?: (pb: PriceBook) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const insidePanel = ref.current?.contains(e.target as Node);
      const insideTrigger = triggerRef.current?.contains(e.target as Node);
      if (!insidePanel && !insideTrigger) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  const allIds = useMemo(
    () => [0, ...(priceBooks?.map((pb) => pb.id) || [])],
    [priceBooks]
  );
  const isAllSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const q = searchQuery.toLowerCase();
  const filtered = priceBooks?.filter((pb) =>
    pb.name.toLowerCase().includes(q)
  );
  const matchDefault =
    !searchQuery ||
    "bảng giá chung".includes(q) ||
    "bang gia chung".includes(q);

  if (!anchorRect || typeof window === "undefined") return null;

  // Đặt panel sát mép phải sidebar + 8px gap, top căn theo trigger
  const PANEL_WIDTH = 320;
  const GAP = 8;
  const left = anchorRect.right + GAP;
  // Nếu tràn màn hình thì flip về bên trái sidebar
  const flipLeft = left + PANEL_WIDTH > window.innerWidth - 8;
  const finalLeft = flipLeft
    ? Math.max(8, anchorRect.left - PANEL_WIDTH - GAP)
    : left;
  const top = Math.min(
    anchorRect.top,
    window.innerHeight - 480 // chừa chỗ cho panel cao tối đa
  );

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        top,
        left: finalLeft,
        width: PANEL_WIDTH,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Chọn bảng giá</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Đã chọn{" "}
            <span className="font-semibold text-brand">
              {selectedIds.length}
            </span>{" "}
            / {allIds.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search + Tạo mới */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm bảng giá..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand transition-all"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) =>
                e.target.checked ? onSelectAll() : onDeselectAll()
              }
              className="w-4 h-4 rounded accent-brand cursor-pointer flex-shrink-0"
            />
            <span className="text-xs font-medium text-gray-600">
              Chọn tất cả
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              onCreateNew();
              onClose();
            }}
            className="text-xs font-medium text-brand hover:text-brand-dark px-2 py-1 rounded hover:bg-brand-soft transition-colors flex-shrink-0">
            + Tạo mới
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {matchDefault && (
          <label
            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-brand-soft transition-colors select-none ${
              selectedIds.includes(0) ? "bg-brand-soft" : ""
            }`}>
            <input
              type="checkbox"
              checked={selectedIds.includes(0)}
              onChange={() => onToggle(0)}
              className="w-4 h-4 rounded accent-brand cursor-pointer flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gray-800 flex-1">
              Bảng giá chung
            </span>
            {selectedIds.includes(0) && (
              <Check className="w-4 h-4 text-brand flex-shrink-0" />
            )}
          </label>
        )}

        {(!filtered || filtered.length === 0) && !matchDefault ? (
          <div className="px-4 py-8 text-sm text-gray-400 text-center">
            Không tìm thấy bảng giá
          </div>
        ) : (
          filtered?.map((pb) => (
            <label
              key={pb.id}
              className={`group flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 cursor-pointer hover:bg-brand-soft transition-colors select-none ${
                selectedIds.includes(pb.id) ? "bg-brand-soft" : ""
              }`}>
              <input
                type="checkbox"
                checked={selectedIds.includes(pb.id)}
                onChange={() => onToggle(pb.id)}
                className="w-4 h-4 rounded accent-brand cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-gray-700 flex-1 break-words">
                {pb.name}
              </span>
              {selectedIds.includes(pb.id) && (
                <Check className="w-4 h-4 text-brand flex-shrink-0" />
              )}
              {onEditPriceBook && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditPriceBook(pb);
                    onClose();
                  }}
                  className="p-1 rounded hover:bg-brand-soft text-gray-400 hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Sửa bảng giá">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function PriceBookSidebar({
  priceBooks,
  selectedIds,
  onSelectedIdsChange,
  onCreateNew,
  onEditPriceBook,
  onFiltersChange,
  initialFilters,
}: PriceBookSidebarProps) {
  // Filter states — seed từ URL qua initialFilters
  const [parentName, setParentName] = useState(
    initialFilters?.parentName ?? ""
  );
  const [middleName, setMiddleName] = useState(
    initialFilters?.middleName ?? ""
  );
  const [childName, setChildName] = useState(initialFilters?.childName ?? "");
  const [stockStatus, setStockStatus] = useState(
    initialFilters?.stockStatus ?? ""
  );

  // Price book panel
  const [showPanel, setShowPanel] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Update anchorRect khi resize/scroll để panel theo đúng vị trí
  useEffect(() => {
    if (!showPanel) return;
    const update = () =>
      setAnchorRect(triggerRef.current?.getBoundingClientRect() ?? null);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showPanel]);

  const { data: parentCategories } = useCategories("parent");
  const { data: middleCategories } = useCategories("middle");
  const { data: childCategories } = useCategories("child");

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

  const allIds = useMemo(
    () => [0, ...(priceBooks?.map((pb) => pb.id) || [])],
    [priceBooks]
  );

  const selectAll = () => onSelectedIdsChange(allIds);
  const deselectAll = () => onSelectedIdsChange([]);

  const togglePriceBook = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedIdsChange([...selectedIds, id]);
    }
  };

  const activeFilterCount = [
    parentName,
    middleName,
    childName,
    stockStatus,
  ].filter(Boolean).length;

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (parentName) f.parentName = parentName;
      if (middleName) f.middleName = middleName;
      if (childName) f.childName = childName;
      if (stockStatus) f.stockStatus = stockStatus;
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [parentName, middleName, childName, stockStatus]);

  const clearAll = () => {
    setParentName("");
    setMiddleName("");
    setChildName("");
    setStockStatus("");
    onFiltersChange({});
  };

  // Display text trên trigger button
  const getDisplayText = () => {
    if (selectedIds.length === 0) return "Chưa chọn bảng giá";
    if (selectedIds.length === allIds.length && allIds.length > 1)
      return "Tất cả bảng giá";

    const hasDefault = selectedIds.includes(0);
    const realIds = selectedIds.filter((id) => id !== 0);

    if (hasDefault && realIds.length === 0) return "Bảng giá chung";
    if (!hasDefault && realIds.length === 1) {
      const pb = priceBooks?.find((p) => p.id === realIds[0]);
      return pb?.name || "Đã chọn 1 bảng giá";
    }
    return `Đã chọn ${selectedIds.length} bảng giá`;
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* ── Header ── */}
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

      <div className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
        {/* ── Bảng giá (trigger row, mở panel bên phải) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bảng giá
          </label>
          <div
            ref={triggerRef}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (showPanel) {
                setShowPanel(false);
              } else {
                setAnchorRect(
                  triggerRef.current?.getBoundingClientRect() ?? null
                );
                setShowPanel(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAnchorRect(
                  triggerRef.current?.getBoundingClientRect() ?? null
                );
                setShowPanel((p) => !p);
              }
            }}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-all select-none ${
              showPanel
                ? "border-brand bg-brand-soft ring-2 ring-brand-soft"
                : selectedIds.length > 0
                  ? "border-brand-border bg-brand-soft hover:border-brand"
                  : "border-gray-200 hover:border-gray-300"
            }`}>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate">
                {getDisplayText()}
              </span>
              {selectedIds.length > 0 && (
                <span className="text-[10px] text-gray-500">
                  {selectedIds.length} đang chọn
                </span>
              )}
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-colors flex-shrink-0 ${
                showPanel ? "text-brand" : "text-gray-400"
              }`}
            />
          </div>

          {showPanel && (
            <PriceBookPanel
              priceBooks={priceBooks}
              selectedIds={selectedIds}
              onToggle={togglePriceBook}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onCreateNew={onCreateNew}
              onEditPriceBook={onEditPriceBook}
              onClose={() => setShowPanel(false)}
              anchorRect={anchorRect}
              triggerRef={triggerRef}
            />
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Loại Hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại Hàng
          </label>
          <SimpleDropdown
            options={parentOptions}
            value={parentName}
            placeholder="Tất cả"
            onChange={setParentName}
          />
        </div>

        {/* ── Nguồn Gốc ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nguồn Gốc
          </label>
          <SimpleDropdown
            options={middleOptions}
            value={middleName}
            placeholder="Tất cả"
            onChange={setMiddleName}
          />
        </div>

        {/* ── Danh Mục ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Danh Mục
          </label>
          <SimpleDropdown
            options={childOptions}
            value={childName}
            placeholder="Tất cả"
            onChange={setChildName}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Tồn kho ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tồn kho
          </label>
          <StockDropdown value={stockStatus} onChange={setStockStatus} />
        </div>
      </div>
    </aside>
  );
}
