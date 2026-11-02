"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart2, Table2, Check } from "lucide-react";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomerGroups } from "@/lib/hooks/useCustomerGroups";
import { useCategories } from "@/lib/hooks/useCategories";
import { Category } from "@/lib/api/categories";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { TradeMark } from "@/lib/api/trademarks";
import { MultiSelectDropdown } from "@/components/shared/MultiSelectDropdown";
import {
  useReportAccess,
  REPORT_VIEWTYPE_PERMISSION,
} from "@/lib/permissions/reportPermissions";
import { CustomerReportFilters, CustomerViewType } from "@/lib/api/reports";

export type CustomerMode = "chart" | "data";

interface Props {
  viewType: CustomerViewType;
  onViewTypeChange: (v: CustomerViewType) => void;
  mode: CustomerMode;
  onModeChange: (m: CustomerMode) => void;
  onFiltersChange: (filters: CustomerReportFilters) => void;
}

const VIEW_TYPES: { value: CustomerViewType; label: string }[] = [
  { value: "CustomerBySale", label: "Bán hàng" },
  { value: "CustomerByProfit", label: "Lợi nhuận" },
  { value: "CustomerDebt", label: "Công nợ" },
  { value: "CustomerByProduct", label: "Hàng bán theo khách" },
  { value: "CustomerShipping", label: "Phí ship" },
];

export function CustomerReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { data: customerGroups } = useCustomerGroups();
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
  const { has } = useReportAccess();

  const [branchId, setBranchId] = useState("");
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [customerKeywordDebounced, setCustomerKeywordDebounced] = useState("");
  const [pageSize, setPageSize] = useState<number>(500);

  // ── Bộ lọc sản phẩm ──
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);
  const [middleNames, setMiddleNames] = useState<string[]>([]);
  const [childNames, setChildNames] = useState<string[]>([]);
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);

  // Bộ chọn thời gian dùng chung (giống trang Hóa đơn), mặc định "Tháng này".
  const [timeRange, setTimeRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "this_month",
    fromDate: "",
    toDate: "",
  });

  const visibleViewTypes = useMemo(
    () =>
      VIEW_TYPES.filter((v) =>
        has(REPORT_VIEWTYPE_PERMISSION["khach-hang"][v.value]),
      ),
    [has],
  );

  useEffect(() => {
    if (
      visibleViewTypes.length > 0 &&
      !visibleViewTypes.some((v) => v.value === viewType)
    ) {
      onViewTypeChange(visibleViewTypes[0].value);
    }
  }, [visibleViewTypes, viewType, onViewTypeChange]);

  useEffect(() => {
    const t = setTimeout(
      () => setCustomerKeywordDebounced(customerKeyword.trim()),
      300,
    );
    return () => clearTimeout(t);
  }, [customerKeyword]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: CustomerReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (customerGroupId) f.customerGroupId = parseInt(customerGroupId);
      if (customerKeywordDebounced) f.customerKeyword = customerKeywordDebounced;

      const isSaleReport =
        viewType === "CustomerBySale" ||
        viewType === "CustomerByProfit" ||
        viewType === "CustomerByProduct";

      if (isSaleReport) {
        if (selectedTypes.length > 0) f.types = selectedTypes;
        if (parentNames.length > 0) f.parentNames = parentNames;
        if (middleNames.length > 0) f.middleNames = middleNames;
        if (childNames.length > 0) f.childNames = childNames;
        if (tradeMarkIds.length > 0) f.tradeMarkIds = tradeMarkIds.map(Number);
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
    customerGroupId,
    customerKeywordDebounced,
    timeRange,
    pageSize,
    selectedTypes,
    parentNames,
    middleNames,
    childNames,
    tradeMarkIds,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Khách hàng</h2>
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
              options={["500", "1000", "2000"].map((v) => ({
                value: v,
                label: v,
              }))}
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              searchable={false}
              allowDeselect={false}
              showClearOption={false}
            />
          </div>
        )}

        {/* ── Nhóm khách hàng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Nhóm khách hàng
          </label>
          <FilterSearchableSelect
            options={(
              (customerGroups as any)?.data ||
              (customerGroups as any) ||
              []
            ).map((g: { id: number; name: string }) => ({
              value: String(g.id),
              label: g.name,
            }))}
            value={customerGroupId}
            onChange={setCustomerGroupId}
            placeholder="Tất cả"
            searchPlaceholder="Tìm nhóm khách hàng..."
          />
        </div>

        {/* ── Bộ lọc sản phẩm (chỉ áp dụng cho các báo cáo bán hàng) ── */}
        {(viewType === "CustomerBySale" ||
          viewType === "CustomerByProfit" ||
          viewType === "CustomerByProduct") && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại sản phẩm
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 2, label: "Hàng hóa" },
                  { value: 3, label: "Dịch vụ" },
                  { value: 1, label: "Combo - đóng gói" },
                  { value: 4, label: "Hàng sản xuất" },
                ].map((opt) => {
                  const isActive = selectedTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setSelectedTypes((prev) =>
                          prev.includes(opt.value)
                            ? prev.filter((t) => t !== opt.value)
                            : [...prev, opt.value],
                        )
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
          </>
        )}

        {/* ── Tìm khách hàng ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Khách hàng
          </label>
          <input
            type="text"
            placeholder="Theo mã, tên, SĐT..."
            value={customerKeyword}
            onChange={(e) => setCustomerKeyword(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
          />
        </div>
      </div>
    </aside>
  );
}
