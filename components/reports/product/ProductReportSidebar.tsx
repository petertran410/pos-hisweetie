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

  // Bộ chọn thời gian dùng chung (giống trang Hóa đơn), mặc định "Tháng này".
  const [timeRange, setTimeRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "this_month",
    fromDate: "",
    toDate: "",
  });

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

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: ProductReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (soldById && showSoldBy) f.soldById = parseInt(soldById);
      if (productKeywordDebounced) f.productKeyword = productKeywordDebounced;
      if (showCategory) {
        f.categoryLevel = categoryLevel;
        if (categoryValue) f.categoryValue = categoryValue;
      }

      // "Toàn thời gian" → null → không lọc theo ngày.
      const range = rangeToIso(timeRange);
      if (range) {
        f.fromDate = range.from;
        f.toDate = range.to;
      }

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
    timeRange,
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
