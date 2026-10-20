"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilterDivider,
  FilterSection,
  FinanceFilterSidebar,
} from "@/components/internal-finance/FinanceFilterSidebar";
import {
  IsoWeekPicker,
  type IsoWeek,
} from "@/components/internal-finance/IsoWeekPicker";
import { TimeRangeFilter } from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  isoWeekOf,
  isoWeekRange,
  toDateInput,
} from "@/lib/internal-finance/dates";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  useFollowHeaderBranch,
  useHeaderBranchId,
} from "@/lib/internal-finance/header-branch";
import {
  readSavedFilters,
  restoreBranchIds,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";
import { useSavedTimeRange } from "@/lib/internal-finance/time-range";
import {
  CASH_ADVANCE_BRANCH_IDS,
  CASH_ADVANCE_STATUS_OPTIONS,
} from "@/lib/cash-advances/display";

export interface CashAdvanceSidebarFilters {
  branchId?: number;
  status?: string;
  personId?: number;
  refundState?: "NEEDS_REFUND" | "OVERDUE";
  /** Lọc thời gian theo tuần ISO hay theo khoảng ngày. */
  timeMode: "range" | "week";
  week: IsoWeek;
  fromDate?: string;
  toDate?: string;
}

type SavedState = Partial<
  Omit<CashAdvanceSidebarFilters, "branchId"> & { branchIds: number[] }
>;

const currentWeek = () => isoWeekOf(toDateInput(new Date()));

export function loadCashAdvanceFilters(
  storageKey: string,
  headerBranchId?: number | null,
): CashAdvanceSidebarFilters {
  const saved = readSavedFilters<SavedState>(storageKey) || {};
  const timeMode = saved.timeMode === "week" ? "week" : "range";
  // Tuần đã lưu từ phiên trước: mở lại thì về tuần hiện tại.
  const week = currentWeek();
  const weekDates = isoWeekRange(week.year, week.week);
  const rangeDates =
    readSavedFilters<{ fromDate?: string; toDate?: string }>(
      `${storageKey}:dates`,
    ) || {};
  return {
    branchId: restoreBranchIds(
      saved.branchIds,
      headerBranchId,
      CASH_ADVANCE_BRANCH_IDS,
    )[0],
    status: saved.status || undefined,
    personId: Number(saved.personId) || undefined,
    refundState: saved.refundState || undefined,
    timeMode,
    week,
    ...(timeMode === "week"
      ? { fromDate: weekDates.from, toDate: weekDates.to }
      : {
          fromDate: rangeDates.fromDate || undefined,
          toDate: rangeDates.toDate || undefined,
        }),
  };
}

/**
 * Bộ lọc trang Tạm ứng / Hoàn ứng: kỳ theo tuần số (giống Approval tuần) hoặc
 * khoảng ngày, kho, trạng thái, người nhận / người hoàn ứng.
 */
export function CashAdvanceSidebar({
  resource,
  storageKey,
  filters,
  onChange,
  personLabel,
  timeLabel,
  showRefundState = false,
  mobileOpen,
  onMobileClose,
}: {
  resource: "cash_advance" | "cash_advance_refund";
  storageKey: string;
  filters: CashAdvanceSidebarFilters;
  onChange: (patch: Partial<CashAdvanceSidebarFilters>) => void;
  personLabel: string;
  timeLabel: string;
  showRefundState?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const access = useFinanceAccess();
  const { data: branchData } = useBranches();
  const { data: users } = useUsersForFilter();
  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string }> }
      | Array<{ id: number; name: string }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    return rows.filter(
      (branch) =>
        CASH_ADVANCE_BRANCH_IDS.includes(branch.id) &&
        access.can(resource, "view", branch.id),
    );
  }, [access, branchData, resource]);
  const userOptions = useMemo(
    () =>
      (users || []).map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    [users],
  );

  // Khoảng ngày đã chọn ở chế độ "Khoảng ngày" được giữ khi chuyển qua lại tuần.
  const [rangeDates, setRangeDates] = useState<{
    fromDate?: string;
    toDate?: string;
  }>(() => ({
    fromDate: filters.timeMode === "range" ? filters.fromDate : undefined,
    toDate: filters.timeMode === "range" ? filters.toDate : undefined,
  }));
  const applyRange = useCallback(
    (dates: { fromDate?: string; toDate?: string }) => {
      setRangeDates(dates);
      writeSavedFilters(`${storageKey}:dates`, dates);
      onChange(dates);
    },
    [onChange, storageKey],
  );
  const time = useSavedTimeRange(storageKey, applyRange);

  useEffect(() => {
    writeSavedFilters(storageKey, {
      branchIds: filters.branchId ? [filters.branchId] : [],
      status: filters.status || "",
      personId: filters.personId || "",
      refundState: filters.refundState || "",
      timeMode: filters.timeMode,
    });
  }, [
    filters.branchId,
    filters.personId,
    filters.refundState,
    filters.status,
    filters.timeMode,
    storageKey,
  ]);

  const headerBranchId = useHeaderBranchId(CASH_ADVANCE_BRANCH_IDS, (id) =>
    access.can(resource, "view", id),
  );
  useFollowHeaderBranch(
    headerBranchId,
    filters.branchId ? [filters.branchId] : [],
    (id) => onChange({ branchId: id || undefined }),
  );

  const changeWeek = (week: IsoWeek) => {
    const { from, to } = isoWeekRange(week.year, week.week);
    onChange({ week, fromDate: from, toDate: to });
  };

  const activeCount = [
    filters.branchId,
    filters.status,
    filters.personId,
    filters.refundState,
    filters.timeMode === "week" || time.active,
  ].filter(Boolean).length;

  const clearAll = () => {
    time.reset();
    setRangeDates({});
    writeSavedFilters(`${storageKey}:dates`, {});
    onChange({
      branchId: headerBranchId || undefined,
      status: undefined,
      personId: undefined,
      refundState: undefined,
      timeMode: "range",
      fromDate: undefined,
      toDate: undefined,
    });
  };

  const modeButton = (mode: "range" | "week", label: string) => (
    <button
      type="button"
      onClick={() => {
        if (mode === filters.timeMode) return;
        if (mode === "week") {
          const { from, to } = isoWeekRange(
            filters.week.year,
            filters.week.week,
          );
          onChange({ timeMode: "week", fromDate: from, toDate: to });
        } else {
          onChange({ timeMode: "range", ...rangeDates });
        }
      }}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
        filters.timeMode === mode
          ? "bg-white text-brand shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}>
      {label}
    </button>
  );

  return (
    <FinanceFilterSidebar
      activeCount={activeCount}
      onClear={clearAll}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}>
      <FilterSection label={timeLabel}>
        <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
          {modeButton("range", "Khoảng ngày")}
          {modeButton("week", "Theo tuần")}
        </div>
        {filters.timeMode === "week" ? (
          <IsoWeekPicker value={filters.week} onChange={changeWeek} />
        ) : (
          <TimeRangeFilter label="" value={time.range} onChange={time.change} />
        )}
      </FilterSection>
      <FilterDivider />
      <FilterSection label="Kho">
        <FilterSearchableSelect
          options={branches.map((branch) => ({
            value: String(branch.id),
            label: branch.name,
          }))}
          value={filters.branchId ? String(filters.branchId) : ""}
          onChange={(value) =>
            onChange({ branchId: value ? Number(value) : undefined })
          }
          placeholder="Tất cả kho"
          searchable={false}
        />
      </FilterSection>
      <FilterSection label="Trạng thái">
        <FilterSearchableSelect
          options={CASH_ADVANCE_STATUS_OPTIONS}
          value={filters.status || ""}
          onChange={(value) => onChange({ status: value || undefined })}
          placeholder="Tất cả trạng thái"
          searchable={false}
        />
      </FilterSection>
      {showRefundState && (
        <FilterSection label="Hoàn ứng">
          <FilterSearchableSelect
            options={[
              { value: "NEEDS_REFUND", label: "Cần làm hoàn ứng" },
              { value: "OVERDUE", label: "Quá hạn hoàn ứng" },
            ]}
            value={filters.refundState || ""}
            onChange={(value) =>
              onChange({
                refundState: (value || undefined) as
                  "NEEDS_REFUND" | "OVERDUE" | undefined,
              })
            }
            placeholder="Tất cả"
            searchable={false}
          />
        </FilterSection>
      )}
      <FilterDivider />
      <FilterSection label={personLabel}>
        <FilterSearchableSelect
          options={userOptions}
          value={filters.personId ? String(filters.personId) : ""}
          onChange={(value) =>
            onChange({ personId: value ? Number(value) : undefined })
          }
          placeholder="Tất cả"
        />
      </FilterSection>
    </FinanceFilterSidebar>
  );
}
