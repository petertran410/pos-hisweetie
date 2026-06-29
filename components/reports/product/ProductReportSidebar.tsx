"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Calendar, BarChart2, Table2 } from "lucide-react";
import { MiniCalendar } from "@/components/shared/MiniCalendar";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { dashboardApi } from "@/lib/api/dashboard";
import {
  useReportAccess,
  REPORT_VIEWTYPE_PERMISSION,
} from "@/lib/permissions/reportPermissions";
import {
  ProductReportFilters,
  ProductViewType,
  CategoryLevel,
} from "@/lib/api/reports";

export type ProductMode = "chart" | "data";

interface Props {
  viewType: ProductViewType;
  onViewTypeChange: (v: ProductViewType) => void;
  mode: ProductMode;
  onModeChange: (m: ProductMode) => void;
  onFiltersChange: (filters: ProductReportFilters) => void;
}

const VIEW_TYPES: { value: ProductViewType; label: string }[] = [
  { value: "ProductBySale", label: "Bán theo sản phẩm" },
  { value: "ProductByProfit", label: "Lợi nhuận theo SP" },
  { value: "ProductByCategory", label: "Theo nhóm hàng" },
  { value: "InOutStock", label: "Nhập - Xuất - Tồn" },
  { value: "ProductByUser", label: "Theo nhân viên" },
  { value: "ProductByCustomer", label: "Theo khách hàng" },
  { value: "ProductBySupplier", label: "Theo nhà cung cấp" },
  { value: "DamageItem", label: "Hàng hỏng / hủy" },
];

const PRESET_GROUPS = [
  {
    label: "Nhanh",
    items: [
      { value: "today", label: "Hôm nay" },
      { value: "yesterday", label: "Hôm qua" },
      { value: "this_week", label: "Tuần này" },
      { value: "last_week", label: "Tuần trước" },
    ],
  },
  {
    label: "Tháng",
    items: [
      { value: "this_month", label: "Tháng này" },
      { value: "last_month", label: "Tháng trước" },
      { value: "last_30_days", label: "30 ngày" },
    ],
  },
  {
    label: "Quý / Năm",
    items: [
      { value: "this_quarter", label: "Quý này" },
      { value: "last_quarter", label: "Quý trước" },
      { value: "this_year", label: "Năm nay" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  last_30_days: "30 ngày",
  this_quarter: "Quý này",
  last_quarter: "Quý trước",
  this_year: "Năm nay",
};

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function getDateRangeFromPreset(preset: string) {
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
      s.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { from: s, to: endOfDay(e) };
    }
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
      const e =
        q === 0
          ? new Date(now.getFullYear() - 1, 11, 31)
          : new Date(now.getFullYear(), q * 3, 0);
      return { from: s, to: endOfDay(e) };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: today, to: now };
  }
}

function PresetPanel({
  selected,
  onSelect,
  onClose,
  anchorRect,
  triggerRef,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      )
        onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose, triggerRef]);

  if (!anchorRect) return null;
  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        width: anchorRect.width,
        zIndex: 50,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-2">
      {PRESET_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1">
            {g.items.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${selected === opt.value ? "bg-brand text-white border-brand font-medium shadow-sm" : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

export function ProductReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { has } = useReportAccess();

  const [branchId, setBranchId] = useState("");
  const [soldById, setSoldById] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [productKeywordDebounced, setProductKeywordDebounced] = useState("");
  const [categoryLevel, setCategoryLevel] = useState<CategoryLevel>("parent");
  const [categoryValue, setCategoryValue] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  // Số dòng hiển thị mỗi trang (chế độ Dữ liệu) — cố định 20 cho Biểu đồ.
  const [pageSize, setPageSize] = useState<number>(500);

  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);

  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const showSoldBy = viewType === "ProductByUser";

  const visibleViewTypes = useMemo(
    () =>
      VIEW_TYPES.filter((v) =>
        has(REPORT_VIEWTYPE_PERMISSION["hang-hoa"][v.value])
      ),
    [has]
  );

  useEffect(() => {
    if (
      visibleViewTypes.length > 0 &&
      !visibleViewTypes.some((v) => v.value === viewType)
    ) {
      onViewTypeChange(visibleViewTypes[0].value);
    }
  }, [visibleViewTypes, viewType, onViewTypeChange]);
  const showCategory = viewType === "ProductByCategory";

  // Nạp option nhóm hàng theo cấp
  useEffect(() => {
    if (!showCategory) return;
    let alive = true;
    dashboardApi
      .getCategoryOptions(categoryLevel)
      .then((opts) => {
        if (alive) setCategoryOptions(opts || []);
      })
      .catch(() => {
        if (alive) setCategoryOptions([]);
      });
    return () => {
      alive = false;
    };
  }, [showCategory, categoryLevel]);

  // Debounce từ khóa SP
  useEffect(() => {
    const t = setTimeout(
      () => setProductKeywordDebounced(productKeyword.trim()),
      300
    );
    return () => clearTimeout(t);
  }, [productKeyword]);

  const isFromMissing = dateMode === "custom" && !!toDate && !fromDate;

  useEffect(() => {
    if (isFromMissing) return;
    const timer = setTimeout(() => {
      const f: ProductReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (soldById && showSoldBy) f.soldById = parseInt(soldById);
      if (productKeywordDebounced) f.productKeyword = productKeywordDebounced;
      if (showCategory) {
        f.categoryLevel = categoryLevel;
        if (categoryValue) f.categoryValue = categoryValue;
      }

      const range =
        dateMode === "preset"
          ? getDateRangeFromPreset(selectedPreset)
          : fromDate && toDate
            ? {
                from: new Date(fromDate + "T00:00:00"),
                to: new Date(toDate + "T23:59:59.999"),
              }
            : getDateRangeFromPreset("this_month");

      f.fromDate = range.from.toISOString();
      f.toDate = range.to.toISOString();

      f.limit = pageSize;

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewType,
    branchId,
    soldById,
    showSoldBy,
    productKeywordDebounced,
    showCategory,
    categoryLevel,
    categoryValue,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    isFromMissing,
    pageSize,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Hàng hóa</h2>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Loại báo cáo ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Loại báo cáo
          </label>
          <div className="space-y-1">
            {visibleViewTypes.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => onViewTypeChange(v.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewType === v.value
                    ? "bg-brand text-white font-medium shadow-sm"
                    : "text-gray-700 hover:bg-brand-soft border border-gray-200"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chế độ hiển thị ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Hiển thị
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onModeChange("chart")}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm border transition-colors ${
                mode === "chart"
                  ? "border-brand bg-brand-soft text-brand-dark font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <BarChart2 className="w-4 h-4" /> Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => onModeChange("data")}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm border transition-colors ${
                mode === "data"
                  ? "border-brand bg-brand-soft text-brand-dark font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <Table2 className="w-4 h-4" /> Dữ liệu
            </button>
          </div>
        </div>

        {/* ── Thời gian ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Thời gian
          </label>
          <div className="space-y-1.5">
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
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
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
                className={`w-4 h-4 flex-shrink-0 ${showPresetPanel ? "text-brand" : "text-gray-400"}`}
              />
            </div>

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
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  dateMode === "custom" ? "border-brand" : "border-gray-300"
                }`}>
                {dateMode === "custom" && (
                  <div className="w-1 h-1 rounded-full bg-brand" />
                )}
              </div>
              <span className="text-sm text-gray-700 flex-1">Tùy chỉnh</span>
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>

            {dateMode === "custom" && (
              <div ref={customDateRef} className="space-y-2 pt-1">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const label = isFrom ? "Từ ngày" : "Đến ngày";
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;
                  const isInvalid = isFrom && isFromMissing;
                  return (
                    <div key={field}>
                      <span
                        className={`text-xs mb-1 block ${isInvalid ? "text-red-600 font-medium" : "text-gray-500"}`}>
                        {label}
                        {isInvalid && " *"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between px-2 py-1 border rounded-lg text-sm transition-all ${
                          val
                            ? "border-brand bg-brand-soft text-gray-800"
                            : "border-gray-200 text-gray-400"
                        }`}>
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
                        <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
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
                {isFromMissing && (
                  <p className="text-xs text-red-600 -mt-1">
                    Vui lòng chọn &quot;Từ ngày&quot;
                  </p>
                )}
              </div>
            )}

            {showPresetPanel && (
              <PresetPanel
                selected={selectedPreset}
                onSelect={setSelectedPreset}
                onClose={() => setShowPresetPanel(false)}
                anchorRect={panelAnchorRect}
                triggerRef={presetRowRef}
              />
            )}
          </div>
        </div>

        {/* ── Chi nhánh ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Chi nhánh
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
            <option value="">Tất cả</option>
            {(branches || [])
              .filter((b: { isActive: boolean }) => b.isActive)
              .map((b: { id: number; name: string }) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>

        {/* ── Số dòng hiển thị (chỉ tab Dữ liệu) ── */}
        {mode === "data" && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Dòng mỗi trang
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
            </select>
          </div>
        )}

        {/* ── Tìm sản phẩm ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Sản phẩm
          </label>
          <input
            type="text"
            placeholder="Tìm tên / mã SP..."
            value={productKeyword}
            onChange={(e) => setProductKeyword(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white"
          />
        </div>

        {/* ── Nhóm hàng (ProductByCategory) ── */}
        {showCategory && (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Cấp nhóm hàng
              </label>
              <select
                value={categoryLevel}
                onChange={(e) => {
                  setCategoryLevel(e.target.value as CategoryLevel);
                  setCategoryValue("");
                }}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
                <option value="parent">Nhóm cha</option>
                <option value="middle">Nhóm giữa</option>
                <option value="child">Nhóm con</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Nhóm hàng
              </label>
              <select
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
                <option value="">Tất cả</option>
                {categoryOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── NV bán hàng (ProductByUser) ── */}
        {showSoldBy && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              NV bán hàng
            </label>
            <select
              value={soldById}
              onChange={(e) => setSoldById(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
              <option value="">Tất cả</option>
              {(users || []).map((u: { id: number; name: string }) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </aside>
  );
}
