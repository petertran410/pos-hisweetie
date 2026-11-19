"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import {
  FilterDivider,
  FilterSection,
  FinanceFilterSidebar,
} from "@/components/internal-finance/FinanceFilterSidebar";
import { TimeRangeFilter } from "@/components/shared/TimeRangeFilter";
import { FilterMultiSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
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
import {
  loadSavedDates,
  useSavedTimeRange,
} from "@/lib/internal-finance/time-range";
import type { WarehouseReceiptQuery } from "@/lib/api/internal-finance";
import { getFixedRect } from "@/lib/utils/zoom";

// Tiền mặt của 2 kho và 2 văn phòng.
const WAREHOUSE_IDS = [6, 1, 4, 7];
const STORAGE_KEY = "warehouse-cash-sidebar-filters";

type SavedWarehouseFilters = {
  branchIds?: number[];
  receiptStatus?: string;
  confirmStatus?: string;
};

// Giống ô "Trạng thái hóa đơn" của sidebar hóa đơn: chấm màu + nhãn màu.
interface StatusOption {
  value: string;
  label: string;
  color: string;
  dot: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "OPEN",
    label: "Chưa lập phiếu",
    color: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  {
    value: "POSTED",
    label: "Đã lập phiếu",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "CANCELLED",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

// Kế toán kho xác nhận số tiền thực nhận.
const CONFIRM_OPTIONS: StatusOption[] = [
  {
    value: "UNCONFIRMED",
    label: "Chưa xác nhận",
    color: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  {
    value: "CONFIRMED",
    label: "Đã xác nhận",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "DIFFERENT",
    label: "Có chênh lệch",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const pick = <T extends string>(options: StatusOption[], value?: string) =>
  options.some((option) => option.value === value) ? (value as T) : undefined;

export function loadWarehouseCashFilters(
  headerBranchId: number | null,
): WarehouseReceiptQuery {
  const saved = readSavedFilters<SavedWarehouseFilters>(STORAGE_KEY);
  const branchIds = restoreBranchIds(
    saved?.branchIds,
    headerBranchId,
    WAREHOUSE_IDS,
  );
  return {
    page: 1,
    limit: 20,
    branchIds: branchIds.length ? branchIds : undefined,
    receiptStatus: pick<NonNullable<WarehouseReceiptQuery["receiptStatus"]>>(
      STATUS_OPTIONS,
      saved?.receiptStatus,
    ),
    confirmStatus: pick<NonNullable<WarehouseReceiptQuery["confirmStatus"]>>(
      CONFIRM_OPTIONS,
      saved?.confirmStatus,
    ),
    ...loadSavedDates(STORAGE_KEY),
  };
}

/**
 * Ô chọn trạng thái theo giao diện sidebar hóa đơn. Danh sách mở qua portal
 * (đã tính zoom) để không bị khung cuộn của sidebar cắt mất.
 */
function StatusDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: StatusOption[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<ReturnType<typeof getFixedRect> | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      if (triggerRef.current) setBox(getFixedRect(triggerRef.current));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const menu =
    open && box && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={(() => {
              const viewportHeight = window.innerHeight / box.zoom;
              const spaceBelow = viewportHeight - box.bottom;
              const dropUp = spaceBelow < 180 && box.top > spaceBelow;
              return {
                position: "fixed" as const,
                left: box.left,
                width: box.width,
                zIndex: 9999,
                ...(dropUp
                  ? { bottom: viewportHeight - box.top + 4 }
                  : { top: box.bottom + 4 }),
              };
            })()}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(value === option.value ? "" : option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  value === option.value ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${index > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${option.dot}`}
                />
                <span
                  className={`flex-1 rounded-full px-2 py-0.5 text-xs font-medium ${option.color}`}>
                  {option.label}
                </span>
                {value === option.value && (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={triggerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setOpen((current) => !current);
        }}
        className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-sm transition-colors ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <div className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${selected.dot}`}
              />
              <span
                className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${selected.color}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {menu}
    </div>
  );
}

export function WarehouseCashSidebar({
  filters,
  onChange,
}: {
  filters: WarehouseReceiptQuery;
  onChange: (patch: Partial<WarehouseReceiptQuery>) => void;
}) {
  const { data: branchData } = useBranches();
  const access = useFinanceAccess();
  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string; isActive?: boolean }> }
      | Array<{ id: number; name: string; isActive?: boolean }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    const known = rows.filter(
      (branch) =>
        WAREHOUSE_IDS.includes(branch.id) && branch.isActive !== false,
    );
    const all = known.length
      ? known
      : [
          { id: 6, name: "Kho Hà Nội" },
          { id: 1, name: "Kho Sài Gòn" },
          { id: 4, name: "Văn phòng Hà Nội" },
          { id: 7, name: "Văn phòng Sài Gòn" },
        ];
    // Chỉ hiện chi nhánh user được xem.
    return all.filter((branch) =>
      access.can("warehouse_cash", "view", branch.id),
    );
  }, [branchData, access]);

  // Đổi chi nhánh ở header thì bộ lọc đổi theo, như sidebar hóa đơn.
  const headerBranchId = useHeaderBranchId(WAREHOUSE_IDS, (id) =>
    access.can("warehouse_cash", "view", id),
  );
  useFollowHeaderBranch(headerBranchId, filters.branchIds || [], (id) =>
    onChange({ branchIds: id ? [id] : undefined }),
  );

  const time = useSavedTimeRange(STORAGE_KEY, onChange);

  useEffect(() => {
    const state: SavedWarehouseFilters = {
      branchIds: filters.branchIds || [],
      receiptStatus: filters.receiptStatus || "",
      confirmStatus: filters.confirmStatus || "",
    };
    writeSavedFilters(STORAGE_KEY, state);
  }, [filters.branchIds, filters.receiptStatus, filters.confirmStatus]);

  const activeCount = [
    filters.branchIds?.length,
    time.active,
    filters.receiptStatus,
    filters.confirmStatus,
  ].filter(Boolean).length;

  const clearAll = () => {
    time.reset();
    onChange({
      branchIds: headerBranchId ? [headerBranchId] : undefined,
      fromDate: undefined,
      toDate: undefined,
      receiptStatus: undefined,
      confirmStatus: undefined,
    });
  };

  return (
    <FinanceFilterSidebar activeCount={activeCount} onClear={clearAll}>
      <TimeRangeFilter
        label="Thời gian"
        value={time.range}
        onChange={time.change}
      />
      <FilterDivider />
      <FilterSection label="Chi nhánh">
        <FilterMultiSelect
          options={branches.map((branch) => ({
            value: String(branch.id),
            label: branch.name,
          }))}
          values={(filters.branchIds || []).map(String)}
          onChange={(values) =>
            onChange({
              branchIds: values
                .map(Number)
                .filter((id) => WAREHOUSE_IDS.includes(id)),
            })
          }
          placeholder="Tất cả chi nhánh"
          searchPlaceholder="Tìm chi nhánh..."
          multiLabel={(count) => `${count} chi nhánh`}
        />
      </FilterSection>
      <FilterDivider />
      <FilterSection label="Trạng thái">
        <StatusDropdown
          options={STATUS_OPTIONS}
          value={filters.receiptStatus || ""}
          placeholder="Tất cả"
          onChange={(value) =>
            onChange({
              receiptStatus: (value ||
                undefined) as WarehouseReceiptQuery["receiptStatus"],
            })
          }
        />
      </FilterSection>
      <FilterSection label="Kế toán kho xác nhận">
        <StatusDropdown
          options={CONFIRM_OPTIONS}
          value={filters.confirmStatus || ""}
          placeholder="Tất cả"
          onChange={(value) =>
            onChange({
              confirmStatus: (value ||
                undefined) as WarehouseReceiptQuery["confirmStatus"],
            })
          }
        />
      </FilterSection>
    </FinanceFilterSidebar>
  );
}
