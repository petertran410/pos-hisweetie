"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useFactories } from "@/lib/hooks/useFactories";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useBranchStore } from "@/lib/store/branch";
import { Check, ChevronDown, X } from "lucide-react";
import {
  FilterMultiSelect,
  FilterProductSearch,
} from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import type { ProductionQueryParams } from "@/lib/api/productions";

interface ProductionSidebarProps {
  filters: ProductionQueryParams;
  onFiltersChange: (filters: ProductionQueryParams) => void;
}

interface SavedFilters {
  branchIds?: number[];
  productionType?: string;
  statuses?: string[];
  manufacturedRange?: TimeRangeState;
  createdRange?: TimeRangeState;
  productId?: number;
  componentProductId?: number;
  factoryIds?: string[];
  supplierIds?: string[];
  creatorIds?: string[];
}

interface DropdownOption {
  value: string;
  label: string;
  color: string;
  dot: string;
}

const STATUS_OPTIONS: DropdownOption[] = [
  {
    value: "1",
    label: "Phiếu tạm",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "4",
    label: "Đã gửi",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "2",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "3",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const TYPE_OPTIONS = [
  { value: "internal", label: "Sản xuất nội bộ" },
  { value: "external", label: "Gửi sản xuất (nhà máy)" },
];

// Giữ mặc định cũ của trang: thời gian sản xuất = tháng này.
const DEFAULT_MANUFACTURED_RANGE: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "this_month",
  fromDate: "",
  toDate: "",
};
const ALL_TIME: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "all_time",
  fromDate: "",
  toDate: "",
};

const STORAGE_KEY = "productions-sidebar-filters";

const isRangeActive = (r: TimeRangeState, defaultPreset: string) =>
  r.dateMode === "custom" || r.selectedPreset !== defaultPreset;

// ─── MultiStatusDropdown (cùng giao diện với sidebar Hóa đơn) ────────────────
function MultiStatusDropdown({
  options,
  values,
  placeholder,
  onChange,
}: {
  options: DropdownOption[];
  values: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectedOptions = options.filter((o) => values.includes(o.value));
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((s) => (
              <span
                key={s.value}
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${s.color}`}>
                {s.label}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
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
          {options.map((opt, idx) => {
            const isSelected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange(
                    isSelected
                      ? values.filter((v) => v !== opt.value)
                      : [...values, opt.value],
                  )
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                  isSelected ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                />
                <span
                  className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SimpleDropdown (cùng giao diện với sidebar Hóa đơn) ─────────────────────
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
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
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
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {children}
    </label>
  );
}

const Divider = () => <div className="border-t border-gray-100" />;

// ─── Main ────────────────────────────────────────────────────────────────────
export function ProductionSidebar({ onFiltersChange }: ProductionSidebarProps) {
  const { data: branchesData } = useBranches();
  const branchOptions = useMemo(
    () =>
      (branchesData || [])
        .filter((b) => b.isActive)
        .map((b) => ({ value: String(b.id), label: b.name })),
    [branchesData],
  );
  const factoriesData = useFactories({ includeInactive: false, limit: 500 });
  const factoryOptions = useMemo(
    () =>
      (factoriesData?.data ?? []).map((f) => ({
        value: String(f.id),
        label: f.code ? `${f.code} — ${f.name}` : f.name,
      })),
    [factoriesData],
  );
  const { data: suppliersData } = useSuppliers({
    pageSize: 500,
    currentItem: 0,
  });
  const supplierOptions = useMemo(
    () =>
      (suppliersData?.data ?? []).map((s) => ({
        value: String(s.id),
        label: s.code ? `${s.code} — ${s.name}` : s.name,
      })),
    [suppliersData],
  );
  const { data: users } = useUsersForFilter();
  const userOptions = useMemo(
    () => (users ?? []).map((u) => ({ value: String(u.id), label: u.name })),
    [users],
  );
  const { selectedBranch } = useBranchStore();

  // Khôi phục bộ lọc đã lưu (giống sidebar Hóa đơn).
  const saved = useRef<SavedFilters | null>(null);
  if (saved.current === null && typeof window !== "undefined") {
    try {
      saved.current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      saved.current = {};
    }
  }
  const s = saved.current ?? {};

  const [branchIds, setBranchIds] = useState<number[]>(() => {
    const savedIds = s.branchIds;
    // Giữ lựa chọn nhiều chi nhánh / "tất cả" mà người dùng đã chủ động chọn;
    // còn lại bám theo chi nhánh đang chọn ở header.
    if (Array.isArray(savedIds) && savedIds.length !== 1) return savedIds;
    return selectedBranch ? [selectedBranch.id] : [];
  });
  const [productionType, setProductionType] = useState<string>(
    s.productionType || "",
  );
  const [statuses, setStatuses] = useState<string[]>(s.statuses || []);
  const [manufacturedRange, setManufacturedRange] = useState<TimeRangeState>(
    s.manufacturedRange || DEFAULT_MANUFACTURED_RANGE,
  );
  const [createdRange, setCreatedRange] = useState<TimeRangeState>(
    s.createdRange || ALL_TIME,
  );
  const [productId, setProductId] = useState<number | undefined>(s.productId);
  const [componentProductId, setComponentProductId] = useState<
    number | undefined
  >(s.componentProductId);
  const [factoryIds, setFactoryIds] = useState<string[]>(s.factoryIds || []);
  const [supplierIds, setSupplierIds] = useState<string[]>(s.supplierIds || []);
  const [creatorIds, setCreatorIds] = useState<string[]>(s.creatorIds || []);

  const isInternalOnly = productionType === "internal";

  // Lưu bộ lọc
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        branchIds,
        productionType,
        statuses,
        manufacturedRange,
        createdRange,
        productId,
        componentProductId,
        factoryIds,
        supplierIds,
        creatorIds,
      }),
    );
  }, [
    branchIds,
    productionType,
    statuses,
    manufacturedRange,
    createdRange,
    productId,
    componentProductId,
    factoryIds,
    supplierIds,
    creatorIds,
  ]);

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh ở header
  // thì tick lại chi nhánh đó. Skip lần mount đầu. Chỉ ghi đè khi đang ở chế độ
  // "bám theo header" (đúng 1 chi nhánh).
  const isFirstBranchSyncRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null,
  );
  useEffect(() => {
    const cur = selectedBranch?.id ?? null;
    if (isFirstBranchSyncRef.current) {
      isFirstBranchSyncRef.current = false;
      lastSyncedBranchIdRef.current = cur;
      return;
    }
    if (cur !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = cur;
      setBranchIds((prev) => (prev.length === 1 ? (cur ? [cur] : []) : prev));
    }
  }, [selectedBranch?.id]);

  // Debounce emit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: ProductionQueryParams = {};
      if (branchIds.length > 0) f.branchIds = branchIds;
      if (statuses.length > 0) f.status = statuses.map(Number);
      if (productionType) f.isExternal = productionType === "external";

      const manufacturedIso = rangeToIso(manufacturedRange);
      if (manufacturedIso) {
        f.fromManufacturedDate = manufacturedIso.from;
        f.toManufacturedDate = manufacturedIso.to;
      }
      const createdIso = rangeToIso(createdRange);
      if (createdIso) {
        f.fromCreatedDate = createdIso.from;
        f.toCreatedDate = createdIso.to;
      }

      if (productId) f.productId = productId;
      if (componentProductId) f.componentProductId = componentProductId;
      if (creatorIds.length > 0) f.createdByIds = creatorIds.map(Number);
      // Nhà máy / NCC chỉ có ở phiếu gửi sản xuất.
      if (!isInternalOnly) {
        if (factoryIds.length > 0) f.factoryIds = factoryIds.map(Number);
        if (supplierIds.length > 0) f.supplierIds = supplierIds.map(Number);
      }

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    branchIds,
    statuses,
    productionType,
    manufacturedRange,
    createdRange,
    productId,
    componentProductId,
    creatorIds,
    factoryIds,
    supplierIds,
    isInternalOnly,
  ]);

  const activeFilterCount = [
    branchIds.length > 0,
    !!productionType,
    statuses.length > 0,
    isRangeActive(manufacturedRange, "this_month"),
    isRangeActive(createdRange, "all_time"),
    !!productId,
    !!componentProductId,
    creatorIds.length > 0,
    !isInternalOnly && factoryIds.length > 0,
    !isInternalOnly && supplierIds.length > 0,
  ].filter(Boolean).length;

  const clearAll = () => {
    setBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setProductionType("");
    setStatuses([]);
    setManufacturedRange(DEFAULT_MANUFACTURED_RANGE);
    setCreatedRange(ALL_TIME);
    setProductId(undefined);
    setComponentProductId(undefined);
    setFactoryIds([]);
    setSupplierIds([]);
    setCreatorIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Thời gian ── */}
        <TimeRangeFilter
          label="Thời gian sản xuất"
          value={manufacturedRange}
          onChange={setManufacturedRange}
        />
        <Divider />
        <TimeRangeFilter
          label="Thời gian tạo"
          value={createdRange}
          onChange={setCreatedRange}
        />

        <Divider />

        {/* ── Loại phiếu ── */}
        <div>
          <FilterLabel>Loại phiếu</FilterLabel>
          <SimpleDropdown
            options={TYPE_OPTIONS}
            value={productionType}
            placeholder="Tất cả"
            onChange={setProductionType}
          />
        </div>

        {/* ── Trạng thái ── */}
        <div>
          <FilterLabel>Trạng thái</FilterLabel>
          <MultiStatusDropdown
            options={
              isInternalOnly
                ? STATUS_OPTIONS.filter((o) => o.value !== "4")
                : STATUS_OPTIONS
            }
            values={statuses}
            placeholder="Tất cả trạng thái"
            onChange={setStatuses}
          />
        </div>

        <Divider />

        {/* ── Chi nhánh ── */}
        <div>
          <FilterLabel>Chi nhánh</FilterLabel>
          <FilterMultiSelect
            options={branchOptions}
            values={branchIds.map(String)}
            onChange={(vals) => setBranchIds(vals.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>

        <Divider />

        {/* ── Hàng hóa ── */}
        <div>
          <FilterLabel>Thành phẩm</FilterLabel>
          <FilterProductSearch value={productId} onChange={setProductId} />
        </div>
        <div>
          <FilterLabel>Nguyên liệu sử dụng</FilterLabel>
          <FilterProductSearch
            value={componentProductId}
            onChange={setComponentProductId}
          />
        </div>

        {/* ── Nhà máy / NCC (phiếu gửi sản xuất) ── */}
        {!isInternalOnly && (
          <>
            <Divider />
            <div>
              <FilterLabel>Nhà máy</FilterLabel>
              <FilterMultiSelect
                options={factoryOptions}
                values={factoryIds}
                onChange={setFactoryIds}
                placeholder="Tất cả nhà máy"
                searchPlaceholder="Tìm nhà máy..."
                multiLabel={(n) => `${n} nhà máy`}
              />
            </div>
            <div>
              <FilterLabel>Nhà cung cấp</FilterLabel>
              <FilterMultiSelect
                options={supplierOptions}
                values={supplierIds}
                onChange={setSupplierIds}
                placeholder="Tất cả nhà cung cấp"
                searchPlaceholder="Tìm nhà cung cấp..."
                multiLabel={(n) => `${n} nhà cung cấp`}
              />
            </div>
          </>
        )}

        <Divider />

        {/* ── Người tạo ── */}
        <div>
          <FilterLabel>Người tạo</FilterLabel>
          <FilterMultiSelect
            options={userOptions}
            values={creatorIds}
            onChange={setCreatorIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm theo tên người tạo..."
          />
        </div>
      </div>
    </aside>
  );
}
