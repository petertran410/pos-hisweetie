"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart2, Table2 } from "lucide-react";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { TradeMark } from "@/lib/api/trademarks";
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

const CATEGORY_LEVEL_OPTIONS: { value: CategoryLevel; label: string }[] = [
  { value: "parent", label: "Nhóm cha" },
  { value: "middle", label: "Nhóm giữa" },
  { value: "child", label: "Nhóm con" },
];

const PAGE_SIZE_OPTIONS = ["500", "1000", "2000"].map((v) => ({
  value: v,
  label: v,
}));

export function ProductReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const { data: trademarks } = useTrademarks({ silentForbidden: true });
  const { has } = useReportAccess();
  const trademarkOptions = useMemo(
    () =>
      (trademarks || []).map((t: TradeMark) => ({
        value: String(t.id),
        label: t.name,
      })),
    [trademarks]
  );

  const [branchId, setBranchId] = useState("");
  const [soldById, setSoldById] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const [productKeywordDebounced, setProductKeywordDebounced] = useState("");
  const [categoryLevel, setCategoryLevel] = useState<CategoryLevel>("parent");
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);
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

  // Nạp option nhóm hàng theo cấp (bộ lọc Nhóm hàng có ở mọi loại báo cáo)
  useEffect(() => {
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
  }, [categoryLevel]);

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
      // "Theo nhóm hàng" luôn cần cấp nhóm (để gom dòng); view khác chỉ gửi khi đang lọc.
      if (showCategory || categoryValues.length > 0)
        f.categoryLevel = categoryLevel;
      if (categoryValues.length > 0) f.categoryValues = categoryValues;
      if (tradeMarkIds.length > 0) f.tradeMarkIds = tradeMarkIds.map(Number);

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
    categoryValues,
    tradeMarkIds,
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
          <FilterSearchableSelect
            options={(branches || [])
              .filter((b: { isActive: boolean }) => b.isActive)
              .map((b: { id: number; name: string }) => ({
                value: String(b.id),
                label: b.name,
              }))}
            value={branchId}
            onChange={setBranchId}
            placeholder="Tất cả"
            searchPlaceholder="Tìm chi nhánh..."
          />
        </div>

        {/* ── Số dòng hiển thị (chỉ tab Dữ liệu) ── */}
        {mode === "data" && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Dòng mỗi trang
            </label>
            <FilterSearchableSelect
              options={PAGE_SIZE_OPTIONS}
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              searchable={false}
              allowDeselect={false}
              showClearOption={false}
            />
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
            className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          />
        </div>

        {/* ── Nhóm hàng (mọi loại báo cáo) ── */}
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Cấp nhóm hàng
            </label>
            <FilterSearchableSelect
              options={CATEGORY_LEVEL_OPTIONS}
              value={categoryLevel}
              onChange={(v) => {
                setCategoryLevel(v as CategoryLevel);
                setCategoryValues([]);
              }}
              searchable={false}
              allowDeselect={false}
              showClearOption={false}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Nhóm hàng
            </label>
            <FilterMultiSelect
              options={categoryOptions.map((o) => ({ value: o, label: o }))}
              values={categoryValues}
              onChange={setCategoryValues}
              placeholder="Tất cả"
              searchPlaceholder="Tìm nhóm hàng..."
              multiLabel={(n) => `${n} nhóm hàng`}
            />
          </div>
        </div>

        {/* ── Thương hiệu (mọi loại báo cáo) ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Thương hiệu
          </label>
          <FilterMultiSelect
            options={trademarkOptions}
            values={tradeMarkIds}
            onChange={setTradeMarkIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm thương hiệu..."
            multiLabel={(n) => `${n} thương hiệu`}
          />
        </div>

        {/* ── NV bán hàng (ProductByUser) ── */}
        {showSoldBy && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              NV bán hàng
            </label>
            <FilterSearchableSelect
              options={(users || []).map((u: { id: number; name: string }) => ({
                value: String(u.id),
                label: u.name,
              }))}
              value={soldById}
              onChange={setSoldById}
              placeholder="Tất cả"
              searchPlaceholder="Tìm nhân viên..."
            />
          </div>
        )}
      </div>
    </aside>
  );
}
