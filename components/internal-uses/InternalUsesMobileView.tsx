"use client";

import { useState, useEffect, useMemo } from "react";
import { useInternalUses } from "@/lib/hooks/useInternalUses";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useInternalUsePurposes } from "@/lib/hooks/useInternalUses";
import { useBranchStore } from "@/lib/store/branch";
import { usePermission } from "@/lib/hooks/usePermissions";
import { formatCurrency, formatDate, getDateRangeFromPreset } from "@/lib/utils";
import type { InternalUse } from "@/lib/api/internalUses";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
} from "lucide-react";
import { InternalUsesMobileDetailSheet } from "./InternalUsesMobileDetailSheet";
import { CodeLink } from "../shared/CodeLink";
import {
  MobileFilterSheet,
  FilterSection,
  ChipGroup,
  SearchableChecklist,
  DateRangeFilter,
  dateInputToIsoStart,
  dateInputToIsoEnd,
  isoToDateInput,
  readMobileFilters,
  writeMobileFilters,
  type ChipOption,
} from "../shared/MobileFilters";

const STORAGE_KEY = "internal-uses-mobile-filters";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Hoàn thành",
  3: "Đã hủy",
};

const STATUS_DOT: Record<number, string> = {
  1: "bg-gray-400",
  2: "bg-green-500",
  3: "bg-red-400",
};

// Tab nhanh → set status[]. "Tất cả" ẩn phiếu hủy (chỉ 1,2) khớp desktop.
const MOBILE_STATUS_TABS = [
  { value: "all", label: "Tất cả", status: [1, 2] },
  { value: "draft", label: "Phiếu tạm", status: [1] },
  { value: "completed", label: "Hoàn thành", status: [2] },
  { value: "cancelled", label: "Đã hủy", status: [3] },
] as const;

const FILTER_STATUS_OPTIONS: ChipOption[] = [
  { value: "1", label: "Phiếu tạm", dot: "bg-gray-400" },
  { value: "2", label: "Hoàn thành", dot: "bg-green-500" },
  { value: "3", label: "Đã hủy", dot: "bg-red-400" },
];

const DATE_PRESETS = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_week", label: "Tuần này" },
  { value: "last_7_days", label: "7 ngày qua" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_30_days", label: "30 ngày qua" },
];

// Key chỉ phục vụ UI, KHÔNG gửi lên backend.
const UI_ONLY_FILTER_KEYS = ["_preset", "_dateMode", "_fromDate", "_toDate"];

const toApiFilters = (f: any) => {
  if (!f) return f;
  const clean = { ...f };
  for (const k of UI_ONLY_FILTER_KEYS) delete clean[k];
  return clean;
};

// Đếm số nhóm filter đang bật (badge). Mỗi nhóm tính 1.
const countActiveFilters = (f: any): number => {
  if (!f) return 0;
  let n = 0;
  if (Array.isArray(f.status) && f.status.length > 0) n++;
  if (Array.isArray(f.branchIds) && f.branchIds.length > 0) n++;
  if (f.createdById != null) n++;
  if (f.userId != null) n++;
  if (f.purposeId != null) n++;
  if (f._preset || f.fromDate || f.toDate) n++;
  return n;
};

// ─── InternalUseMobileCard ────────────────────────────────────────────────────
function InternalUseMobileCard({
  item,
  canViewCost,
  onClick,
}: {
  item: InternalUse;
  canViewCost: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer active:scale-[0.98] transition-transform select-none">
      {/* Row 1: code + status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-brand font-bold text-[15px]">
          <CodeLink entity="internal-use" code={item.code} />
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] || "bg-gray-400"}`}
          />
          <span className="text-sm text-gray-500 font-medium">
            {STATUS_TEXT[item.status] || "—"}
          </span>
        </div>
      </div>

      {/* Row 2: purpose */}
      <p className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">
        {item.purpose?.name || "Không có mục đích"}
      </p>

      {/* Row 3: user + date */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3.5">
        {item.userName && (
          <span className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{item.userName}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(item.transDate || item.createdAt)}
        </span>
      </div>

      {/* Dashed divider */}
      <div className="border-t border-dashed border-gray-200 mb-3.5" />

      {/* Row 4: branch + total */}
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 leading-none mb-0.5">Chi nhánh</p>
          <p className="text-sm font-medium text-gray-700 leading-none truncate">
            {item.branchName || "-"}
          </p>
        </div>
        {canViewCost && (
          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-xs text-gray-400 leading-none mb-0.5">
              Tổng giá trị
            </p>
            <p className="text-base font-bold text-gray-900 leading-none">
              {formatCurrency(Number(item.totalValue))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InternalUsesMobileFilterSheet ────────────────────────────────────────────
function InternalUsesMobileFilterSheet({
  filters,
  onApply,
  onClose,
}: {
  filters: any;
  onApply: (f: any) => void;
  onClose: () => void;
}) {
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b: any) => b.isActive),
    [branches]
  );
  const { data: users } = useUsersForFilter();
  const { data: purposes } = useInternalUsePurposes();

  const [status, setStatus] = useState<string[]>(
    (filters.status ?? []).map(String)
  );
  const [branchIds, setBranchIds] = useState<string[]>(
    (filters.branchIds ?? []).map(String)
  );
  const [createdById, setCreatedById] = useState<string>(
    filters.createdById != null ? String(filters.createdById) : ""
  );
  const [userId, setUserId] = useState<string>(
    filters.userId != null ? String(filters.userId) : ""
  );
  const [purposeId, setPurposeId] = useState<string>(
    filters.purposeId != null ? String(filters.purposeId) : ""
  );

  // Thời gian
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    filters._dateMode || "preset"
  );
  const [preset, setPreset] = useState<string>(filters._preset || "this_month");
  const [fromDate, setFromDate] = useState<string>(
    filters._fromDate || isoToDateInput(filters.fromDate)
  );
  const [toDate, setToDate] = useState<string>(
    filters._toDate || isoToDateInput(filters.toDate)
  );

  const handleApply = () => {
    const f: any = {};

    if (status.length > 0) f.status = status.map(Number);
    if (branchIds.length > 0) f.branchIds = branchIds.map(Number);
    if (createdById) f.createdById = Number(createdById);
    if (userId) f.userId = Number(userId);
    if (purposeId) f.purposeId = Number(purposeId);

    if (dateMode === "preset" && preset) {
      const range = getDateRangeFromPreset(preset);
      f._preset = preset;
      f.fromDate = range.from.toISOString();
      f.toDate = range.to.toISOString();
    } else if (dateMode === "custom" && (fromDate || toDate)) {
      f._dateMode = "custom";
      f._fromDate = fromDate;
      f._toDate = toDate;
      if (fromDate) f.fromDate = dateInputToIsoStart(fromDate);
      if (toDate) f.toDate = dateInputToIsoEnd(toDate);
    }

    onApply(f);
  };

  const handleReset = () => {
    setStatus([]);
    setBranchIds([]);
    setCreatedById("");
    setUserId("");
    setPurposeId("");
    setDateMode("preset");
    setPreset("this_month");
    setFromDate("");
    setToDate("");
  };

  const branchOptions: ChipOption[] = activeBranches.map((b: any) => ({
    value: String(b.id),
    label: b.name,
  }));
  const userOptions: ChipOption[] = (users ?? []).map((u: any) => ({
    value: String(u.id),
    label: u.name,
  }));
  const purposeOptions: ChipOption[] = (purposes ?? []).map((p: any) => ({
    value: String(p.id),
    label: p.name,
  }));

  const dateSummary =
    dateMode === "custom" && (fromDate || toDate)
      ? `${fromDate || "…"} → ${toDate || "…"}`
      : DATE_PRESETS.find((p) => p.value === preset)?.label;

  const activeCount = [
    status.length > 0,
    branchIds.length > 0,
    !!createdById,
    !!userId,
    !!purposeId,
    dateMode === "custom" ? !!(fromDate || toDate) : !!preset,
  ].filter(Boolean).length;

  return (
    <MobileFilterSheet
      title="Bộ lọc"
      activeCount={activeCount}
      onReset={handleReset}
      onApply={handleApply}
      onClose={onClose}>
      {/* Trạng thái */}
      <FilterSection
        label="Trạng thái"
        defaultOpen
        summary={status.length > 0 ? `${status.length} đã chọn` : undefined}>
        <ChipGroup
          options={FILTER_STATUS_OPTIONS}
          values={status}
          onChange={setStatus}
        />
      </FilterSection>

      {/* Thời gian */}
      <FilterSection label="Thời gian" defaultOpen summary={dateSummary}>
        <DateRangeFilter
          presets={DATE_PRESETS}
          mode={dateMode}
          preset={preset}
          fromDate={fromDate}
          toDate={toDate}
          onChange={(next) => {
            setDateMode(next.mode);
            setPreset(next.preset);
            setFromDate(next.fromDate);
            setToDate(next.toDate);
          }}
        />
      </FilterSection>

      {/* Chi nhánh */}
      <FilterSection
        label="Chi nhánh"
        summary={
          branchIds.length > 0 ? `${branchIds.length} đã chọn` : undefined
        }>
        <SearchableChecklist
          options={branchOptions}
          values={branchIds}
          searchPlaceholder="Tìm chi nhánh..."
          emptyText="Không có chi nhánh"
          onChange={setBranchIds}
        />
      </FilterSection>

      {/* Người tạo */}
      <FilterSection
        label="Người tạo"
        summary={
          createdById
            ? userOptions.find((u) => u.value === createdById)?.label
            : undefined
        }>
        <SearchableChecklist
          options={userOptions}
          values={createdById ? [createdById] : []}
          searchPlaceholder="Tìm người tạo..."
          emptyText="Không có nhân viên"
          onChange={(v) => setCreatedById(v[v.length - 1] || "")}
        />
      </FilterSection>

      {/* Người sử dụng */}
      <FilterSection
        label="Người sử dụng"
        summary={
          userId
            ? userOptions.find((u) => u.value === userId)?.label
            : undefined
        }>
        <SearchableChecklist
          options={userOptions}
          values={userId ? [userId] : []}
          searchPlaceholder="Tìm người sử dụng..."
          emptyText="Không có nhân viên"
          onChange={(v) => setUserId(v[v.length - 1] || "")}
        />
      </FilterSection>

      {/* Mục đích sử dụng */}
      <FilterSection
        label="Mục đích sử dụng"
        summary={
          purposeId
            ? purposeOptions.find((p) => p.value === purposeId)?.label
            : undefined
        }>
        <SearchableChecklist
          options={purposeOptions}
          values={purposeId ? [purposeId] : []}
          searchPlaceholder="Tìm mục đích..."
          emptyText="Không có mục đích"
          onChange={(v) => setPurposeId(v[v.length - 1] || "")}
        />
      </FilterSection>
    </MobileFilterSheet>
  );
}

// ─── InternalUsesMobileView (main export) ────────────────────────────────────
interface InternalUsesMobileViewProps {
  codeParam?: string | null;
  onCreateClick: () => void;
}

export function InternalUsesMobileView({
  codeParam,
  onCreateClick,
}: InternalUsesMobileViewProps) {
  const { selectedBranch } = useBranchStore();
  const canViewCost = usePermission("internal-use", "view_cost_price");

  // Filter riêng mobile (khôi phục từ localStorage). Mặc định lọc tháng này.
  const [localFilters, setLocalFilters] = useState<any>(() => {
    const restored = readMobileFilters(STORAGE_KEY);
    if (restored) return restored;
    const range = getDateRangeFromPreset("this_month");
    return {
      _preset: "this_month",
      fromDate: range.from.toISOString(),
      toDate: range.to.toISOString(),
    };
  });
  const [search, setSearch] = useState(codeParam ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(codeParam ?? "");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const limit = 20;

  // Lưu filter mỗi khi đổi
  useEffect(() => {
    writeMobileFilters(STORAGE_KEY, localFilters);
  }, [localFilters]);

  const applyFilters = (f: any) => {
    if (codeParam) return; // đang lọc theo Code → khoá filter
    setLocalFilters(f);
  };

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter / search / tab đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, localFilters, activeTab]);

  const apiFilters = toApiFilters(localFilters);

  // Tab nhanh ghi đè status — chỉ khi sheet không lọc đa trạng thái.
  const tabStatus = MOBILE_STATUS_TABS.find((t) => t.value === activeTab)
    ?.status;
  const effectiveStatus =
    Array.isArray(apiFilters.status) && apiFilters.status.length > 0
      ? apiFilters.status
      : tabStatus;

  const { data, isLoading } = useInternalUses({
    ...apiFilters,
    status: effectiveStatus,
    branchIds: apiFilters.branchIds,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const activeFilterCount = countActiveFilters(localFilters);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ─── Header: search + filter ─── */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã xuất dùng nội bộ..."
              className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!codeParam && (
            <button
              onClick={() => setShowFilter(true)}
              className={`relative p-2.5 rounded-xl transition-colors flex-shrink-0 ${
                activeFilterCount > 0
                  ? "bg-brand hover:bg-brand-dark"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}>
              <SlidersHorizontal
                className={`w-5 h-5 ${activeFilterCount > 0 ? "text-white" : "text-gray-600"}`}
              />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] px-0.5 h-[18px] bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Status tabs — horizontal scroll */}
        {!codeParam && (
          <div
            className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {MOBILE_STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── List ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-gray-400 text-sm">
              Không tìm thấy phiếu nào
            </span>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <InternalUseMobileCard
                key={item.id}
                item={item}
                canViewCost={canViewCost}
                onClick={() => setSelectedId(item.id)}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── FAB ─── */}
      <button
        onClick={onCreateClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand rounded-full shadow-xl flex items-center justify-center hover:bg-brand-dark active:scale-95 transition-all z-40">
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* ─── Detail sheet ─── */}
      {selectedId !== null && (
        <InternalUsesMobileDetailSheet
          internalUseId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* ─── Filter sheet ─── */}
      {showFilter && (
        <InternalUsesMobileFilterSheet
          filters={localFilters}
          onApply={(f) => {
            applyFilters(f);
            setShowFilter(false);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
