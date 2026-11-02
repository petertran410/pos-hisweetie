"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart2, Table2 } from "lucide-react";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { SaleReportFilters, SaleViewType } from "@/lib/api/reports";
import {
  useReportAccess,
  REPORT_VIEWTYPE_PERMISSION,
} from "@/lib/permissions/reportPermissions";

export type SaleMode = "chart" | "data";

interface SaleReportSidebarProps {
  viewType: SaleViewType;
  onViewTypeChange: (v: SaleViewType) => void;
  mode: SaleMode;
  onModeChange: (m: SaleMode) => void;
  onFiltersChange: (filters: SaleReportFilters) => void;
  // Số chi nhánh đang hoạt động (để ẩn tab "Theo chi nhánh" khi ≤1)
  branchCount: number;
}

// ── ViewType tabs (theo KiotViet Sale group §6.1) ──
const VIEW_TYPES: { value: SaleViewType; label: string }[] = [
  { value: "PurchaseDate", label: "Theo thời gian" },
  { value: "Profit", label: "Lợi nhuận" },
  { value: "SoldBy", label: "Theo NV bán" },
  { value: "Branch", label: "Theo chi nhánh" },
  { value: "Refund", label: "Trả hàng" },
];

export function SaleReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
  branchCount,
}: SaleReportSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { data: priceBooksData } = usePriceBooks({ limit: 1000 });
  const { has } = useReportAccess();

  const [branchId, setBranchId] = useState("");
  const [soldById, setSoldById] = useState("");
  const [priceBookId, setPriceBookId] = useState("");

  // Bộ chọn thời gian dùng chung (giống trang Hóa đơn), mặc định "Tháng này".
  const [timeRange, setTimeRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "this_month",
    fromDate: "",
    toDate: "",
  });

  // Refund/Branch không lọc theo NV bán
  const showSoldBy = viewType !== "Refund" && viewType !== "Branch";
  const showPriceBook = viewType !== "Refund";

  const priceBooks = useMemo(
    () => priceBooksData?.data || [],
    [priceBooksData]
  );

  // Chỉ hiển thị chi nhánh đang hoạt động.
  const filteredBranches = useMemo(
    () => (branches || []).filter((b: { isActive: boolean }) => b.isActive),
    [branches]
  );

  const visibleViewTypes = useMemo(
    () =>
      VIEW_TYPES.filter(
        (v) =>
          (v.value !== "Branch" || branchCount > 1) &&
          has(REPORT_VIEWTYPE_PERMISSION["ban-hang"][v.value])
      ),
    [branchCount, has]
  );

  // Nếu viewType hiện tại không nằm trong danh sách được phép (vd default
  // bị ẩn do thiếu quyền) → chuyển sang tab hợp lệ đầu tiên.
  useEffect(() => {
    if (
      visibleViewTypes.length > 0 &&
      !visibleViewTypes.some((v) => v.value === viewType)
    ) {
      onViewTypeChange(visibleViewTypes[0].value);
    }
  }, [visibleViewTypes, viewType, onViewTypeChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: SaleReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (soldById && showSoldBy) f.soldById = parseInt(soldById);
      if (priceBookId && showPriceBook) f.priceBookId = parseInt(priceBookId);

      // "Toàn thời gian" → null → không lọc theo ngày.
      const range = rangeToIso(timeRange);
      if (range) {
        f.fromDate = range.from;
        f.toDate = range.to;
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewType,
    branchId,
    soldById,
    priceBookId,
    showSoldBy,
    showPriceBook,
    timeRange,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bán hàng</h2>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Loại báo cáo (ViewType) ── */}
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
        <TimeRangeFilter
          label="Thời gian"
          value={timeRange}
          onChange={setTimeRange}
        />

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
            {filteredBranches.map((b: { id: number; name: string }) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── NV bán hàng ── */}
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

        {/* ── Bảng giá ── */}
        {showPriceBook && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Bảng giá
            </label>
            <select
              value={priceBookId}
              onChange={(e) => setPriceBookId(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand focus:border-brand bg-white">
              <option value="">Tất cả</option>
              {priceBooks.map((p: { id: number; name: string }) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </aside>
  );
}
