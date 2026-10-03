"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { useBranches } from "@/lib/hooks/useBranches";
import type { WarehouseReceiptQuery } from "@/lib/api/internal-finance";
import { useBranchStore } from "@/lib/store/branch";
import { getFixedRect } from "@/lib/utils/zoom";

const WAREHOUSE_IDS = [6, 1];
const STORAGE_KEY = "warehouse-cash-sidebar-filters";

type SavedWarehouseFilters = {
  branchIds?: number[];
  fromDate?: string;
  toDate?: string;
  receiptStatus?: string;
};

function readSavedFilters(): SavedWarehouseFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedWarehouseFilters) : null;
  } catch {
    return null;
  }
}

export function loadWarehouseCashFilters(headerBranchId: number | null): WarehouseReceiptQuery {
  const saved = readSavedFilters();
  const savedIds = Array.isArray(saved?.branchIds)
    ? saved.branchIds.map(Number).filter((id) => WAREHOUSE_IDS.includes(id))
    : null;
  let branchIds: number[] | undefined;
  if (savedIds) {
    branchIds =
      savedIds.length >= 2 || savedIds.length === 0
        ? savedIds
        : headerBranchId
          ? [headerBranchId]
          : savedIds;
  } else if (headerBranchId) {
    branchIds = [headerBranchId];
  }
  const status = saved?.receiptStatus;
  return {
    page: 1,
    limit: 20,
    branchIds,
    fromDate: saved?.fromDate || undefined,
    toDate: saved?.toDate || undefined,
    receiptStatus:
      status === "OPEN" || status === "POSTED" || status === "CANCELLED"
        ? status
        : undefined,
  };
}

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả", dot: "bg-gray-300" },
  { value: "OPEN", label: "Chưa lập phiếu", dot: "bg-amber-400" },
  { value: "POSTED", label: "Đã lập phiếu", dot: "bg-green-500" },
  { value: "CANCELLED", label: "Đã hủy", dot: "bg-red-400" },
];

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<ReturnType<typeof getFixedRect> | null>(null);
  const selected = STATUS_OPTIONS.find((option) => option.value === value) || STATUS_OPTIONS[0];

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
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
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
              const dropUp = spaceBelow < 220 && box.top > spaceBelow;
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
            {STATUS_OPTIONS.map((option, index) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                  option.value === selected.value
                    ? "bg-brand-soft font-medium text-brand-dark"
                    : "text-gray-700 hover:bg-gray-50"
                } ${index > 0 ? "border-t border-gray-50" : ""}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`} />
                  <span className="truncate">{option.label}</span>
                </span>
                {option.value === selected.value && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
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
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-sm transition-colors ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
          <span className="truncate text-gray-800">{selected.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected.value && (
            <button
              type="button"
              title="Bỏ lọc trạng thái"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
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
  const { selectedBranch } = useBranchStore();
  const headerBranchId =
    selectedBranch && WAREHOUSE_IDS.includes(selectedBranch.id)
      ? selectedBranch.id
      : null;
  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string }> }
      | Array<{ id: number; name: string }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    const known = rows.filter((branch) => WAREHOUSE_IDS.includes(branch.id));
    const base = known.length
      ? known
      : [
          { id: 6, name: "Kho Hà Nội" },
          { id: 1, name: "Kho Sài Gòn" },
        ];
    if (
      selectedBranch &&
      WAREHOUSE_IDS.includes(selectedBranch.id) &&
      !base.some((branch) => branch.id === selectedBranch.id)
    ) {
      return [{ id: selectedBranch.id, name: selectedBranch.name }, ...base];
    }
    return base;
  }, [branchData, selectedBranch]);
  const lastHeaderId = useRef<number | null>(headerBranchId);
  const skippedHeaderSync = useRef(false);
  useEffect(() => {
    if (!skippedHeaderSync.current) {
      skippedHeaderSync.current = true;
      lastHeaderId.current = headerBranchId;
      return;
    }
    if (headerBranchId === lastHeaderId.current) return;
    lastHeaderId.current = headerBranchId;
    const current = filters.branchIds || [];
    if (current.length === 1 && headerBranchId) {
      onChange({ branchIds: [headerBranchId] });
    }
  }, [filters.branchIds, headerBranchId, onChange]);
  useEffect(() => {
    const state: SavedWarehouseFilters = {
      branchIds: filters.branchIds || [],
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      receiptStatus: filters.receiptStatus || "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [filters.branchIds, filters.fromDate, filters.toDate, filters.receiptStatus]);
  const activeCount = [
    filters.branchIds?.length,
    filters.fromDate || filters.toDate,
    filters.receiptStatus,
  ].filter(Boolean).length;
  const resetBranchIds = headerBranchId ? [headerBranchId] : undefined;

  return (
    <aside className="custom-sidebar-scroll m-4 flex h-[calc(100%-2rem)] min-h-0 w-64 shrink-0 flex-col overflow-y-auto rounded-xl border bg-white shadow-xl">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b bg-white px-4 py-2">
        <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onChange({
                branchIds: resetBranchIds,
                fromDate: undefined,
                toDate: undefined,
                receiptStatus: undefined,
              })
            }
            className="text-sm font-medium text-brand hover:text-brand-dark">
            Xóa tất cả
          </button>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branches.map((branch) => ({
              value: String(branch.id),
              label: branch.name,
            }))}
            values={(filters.branchIds || []).map(String)}
            onChange={(values) =>
              onChange({
                branchIds: values.map(Number).filter((id) => WAREHOUSE_IDS.includes(id)),
              })
            }
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(count) => `${count} chi nhánh`}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Thời gian</label>
          <InternalFinanceDateField
            compact
            label="Từ ngày"
            value={filters.fromDate || ""}
            maxDate={filters.toDate || undefined}
            onChange={(value) => onChange({ fromDate: value || undefined })}
          />
          <InternalFinanceDateField
            compact
            label="Đến ngày"
            value={filters.toDate || ""}
            minDate={filters.fromDate || undefined}
            onChange={(value) => onChange({ toDate: value || undefined })}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Trạng thái
          </label>
          <StatusDropdown
            value={filters.receiptStatus || ""}
            onChange={(value) =>
              onChange({
                receiptStatus: (value || undefined) as WarehouseReceiptQuery["receiptStatus"],
              })
            }
          />
        </div>
      </div>
    </aside>
  );
}
