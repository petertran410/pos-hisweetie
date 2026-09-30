"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Calendar, Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import type { Branch } from "@/lib/api/branches";
import type { InternalFinanceQuery } from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import { getFixedRect, normalizeRectForFixed } from "@/lib/utils/zoom";

const FINANCE_BRANCH_IDS = new Set([1, 4, 6, 7]);

const CATEGORIES = [
  ["", "Tất cả nghiệp vụ"],
  ["DELIVERY_FEE", "Chi phí giao hàng"],
  ["FUEL", "Xăng dầu"],
  ["VEHICLE_CARE", "Chăm sóc xe"],
  ["SALARY_ADVANCE", "Tạm ứng lương"],
  ["CUSTOMER_RECEIPT", "Thu tiền khách hàng"],
  ["MANUAL_RECEIPT", "Phiếu thu thủ công"],
  ["OTHER_EXPENSE", "Chi phí khác"],
];

const SUBCATEGORIES = [
  ["FEE_GUI_BEN", "Phí gửi bến"],
  ["FEE_GRAB", "Phí Grab"],
  ["SHIPPING_OUT", "Cước gửi hàng"],
  ["SHIPPING_IN", "Cước nhận hàng"],
  ["FUEL", "Xăng dầu"],
  ["VEHICLE_CARE", "Chăm sóc xe"],
  ["SALARY_ADVANCE", "Tạm ứng lương"],
  ["OTHER", "Chi phí khác"],
];

const DIRECTION_OPTIONS = [
  { value: "EXPENSE", label: "Phiếu chi" },
  { value: "RECEIPT", label: "Phiếu thu" },
];

const EVIDENCE_OPTIONS = [
  { value: "COMPLETE", label: "Đủ chứng từ", dot: "bg-green-500" },
  { value: "MISSING", label: "Thiếu chứng từ", dot: "bg-red-400" },
  { value: "EXCEPTION_APPROVED", label: "Duyệt ngoại lệ", dot: "bg-orange-400" },
];

const ACCOUNTANT_OPTIONS = [
  { value: "PENDING", label: "Chờ kiểm tra", dot: "bg-yellow-400" },
  { value: "APPROVED", label: "Đã kiểm tra", dot: "bg-green-500" },
];

const MANAGER_OPTIONS = [
  { value: "PENDING", label: "Chờ kiểm tra", dot: "bg-yellow-400" },
  { value: "APPROVED", label: "Đã duyệt", dot: "bg-green-500" },
  { value: "NOT_REQUIRED", label: "Không áp dụng", dot: "bg-gray-400" },
];

const WEEKLY_OPTIONS = [
  { value: "READY", label: "Sẵn sàng tổng hợp", dot: "bg-blue-400" },
  { value: "IN_APPROVAL", label: "Đang duyệt", dot: "bg-orange-400" },
  { value: "APPROVED", label: "Đã duyệt", dot: "bg-green-500" },
  { value: "NOT_REQUIRED", label: "Không áp dụng", dot: "bg-gray-400" },
];

const POSTED_OPTIONS = [
  { value: "POSTED", label: "Đã ghi nhận", dot: "bg-green-500" },
  { value: "UNPOSTED", label: "Chưa ghi nhận", dot: "bg-gray-400" },
];

const CASH_ISSUED_OPTIONS = [
  { value: "ISSUED", label: "Đã chi", dot: "bg-green-500" },
  { value: "NOT_ISSUED", label: "Chưa chi", dot: "bg-gray-400" },
];

const STATUS_OPTIONS = [
  { value: "PENDING_ACCOUNTANT", label: "Chờ kế toán", dot: "bg-yellow-400" },
  { value: "ACCOUNTANT_APPROVED", label: "Kế toán đã duyệt", dot: "bg-teal-500" },
  { value: "PENDING_MANAGER", label: "Chờ quản lý", dot: "bg-orange-400" },
  { value: "MANAGER_APPROVED", label: "Quản lý đã duyệt", dot: "bg-teal-300" },
  { value: "READY_FOR_WEEKLY_APPROVAL", label: "Sẵn sàng tổng hợp", dot: "bg-blue-400" },
  { value: "IN_WEEKLY_APPROVAL", label: "Đang duyệt tuần", dot: "bg-orange-500" },
  { value: "APPROVED", label: "Đã duyệt", dot: "bg-green-500" },
  { value: "POSTED", label: "Đã ghi sổ", dot: "bg-green-600" },
  { value: "REJECTED", label: "Từ chối", dot: "bg-red-400" },
];

const PRESET_GROUPS = [
  {
    label: "Tất cả",
    options: [{ label: "Toàn thời gian", value: "all_time" }],
  },
  {
    label: "Theo ngày",
    options: [
      { label: "Hôm nay", value: "today" },
      { label: "Hôm qua", value: "yesterday" },
    ],
  },
  {
    label: "Theo tuần",
    options: [
      { label: "Tuần này", value: "this_week" },
      { label: "Tuần trước", value: "last_week" },
      { label: "7 ngày qua", value: "last_7_days" },
    ],
  },
  {
    label: "Theo tháng",
    options: [
      { label: "Tháng này", value: "this_month" },
      { label: "Tháng trước", value: "last_month" },
      { label: "30 ngày qua", value: "last_30_days" },
    ],
  },
  {
    label: "Theo quý",
    options: [
      { label: "Quý này", value: "this_quarter" },
      { label: "Quý trước", value: "last_quarter" },
    ],
  },
  {
    label: "Theo năm",
    options: [
      { label: "Năm nay", value: "this_year" },
      { label: "Năm trước", value: "last_year" },
    ],
  },
];

const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.value, option.label]),
  ),
);

interface FilterChoice {
  value: string;
  label: string;
  dot?: string;
}

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const toInputDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 86400000);
      return { from: yesterday, to: new Date(yesterday.getTime() + 86400000 - 1) };
    }
    case "this_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { from: start, to: now };
    }
    case "last_week": {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start, to: endOfDay(end) };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
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
      const quarter = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), quarter * 3, 1), to: now };
    }
    case "last_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start =
        quarter === 0
          ? new Date(now.getFullYear() - 1, 9, 1)
          : new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      return { from: start, to: endOfDay(new Date(now.getFullYear(), quarter * 3, 0)) };
    }
    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    default:
      return { from: today, to: now };
  }
};

const formatDateLabel = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function asBranches(payload: unknown): Branch[] {
  if (Array.isArray(payload)) return payload as Branch[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Branch[] }).data;
  }
  return [];
}

function FilterDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: FilterChoice[];
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
      ) {
        return;
      }
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
                maxHeight: 208,
                ...(dropUp
                  ? { bottom: viewportHeight - box.top + 4 }
                  : { top: box.bottom + 4 }),
              };
            })()}
            className="overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value === value ? "" : option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                  option.value === value
                    ? "bg-brand-soft font-medium text-brand-dark"
                    : "text-gray-700 hover:bg-gray-50"
                } ${index > 0 ? "border-t border-gray-50" : ""}`}>
                <span className="flex min-w-0 items-center gap-2">
                  {option.dot && (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </span>
                {option.value === value && (
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
          if (event.key === "Enter") setOpen((current) => !current);
        }}
        className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1 text-sm transition-colors ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        }`}>
        <span className="flex min-w-0 items-center gap-2">
          {selected?.dot && (
            <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
          )}
          <span className={selected ? "truncate text-gray-800" : "truncate text-gray-400"}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
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
            className={`h-4 w-4 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>
      {menu}
    </div>
  );
}

function PresetPanel({
  selected,
  onSelect,
  onClose,
  anchorRect,
  triggerRef,
}: {
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onClose, triggerRef]);

  if (!anchorRect || typeof document === "undefined") return null;
  const rect = normalizeRectForFixed(anchorRect);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: rect.top, left: rect.right + 8, zIndex: 9999 }}
      className="flex animate-in gap-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl fade-in zoom-in-95 duration-150">
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="flex min-w-[88px] flex-col gap-1.5">
          <span className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {group.label}
          </span>
          {group.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-left text-sm transition-all ${
                selected === option.value
                  ? "border-brand bg-brand font-medium text-white shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
              }`}>
              {option.label}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function InternalFinanceSidebar({
  filters,
  onChange,
  categories = CATEGORIES,
  resetPatch,
}: {
  filters: InternalFinanceQuery;
  onChange: (patch: Partial<InternalFinanceQuery>) => void;
  categories?: string[][];
  resetPatch?: Partial<InternalFinanceQuery>;
}) {
  const branchesQuery = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchesQuery.data).filter(
        (branch) => branch.isActive && FINANCE_BRANCH_IDS.has(branch.id),
      ),
    [branchesQuery.data],
  );
  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
    [branches],
  );
  const categoryOptions = useMemo(
    () =>
      categories
        .filter(([value]) => value)
        .map(([value, label]) => ({ value, label })),
    [categories],
  );
  const selectedBranchIds = filters.branchIds || [];
  const [dateMode, setDateMode] = useState<"preset" | "custom">(
    filters.fromDate || filters.toDate ? "custom" : "preset",
  );
  const [selectedPreset, setSelectedPreset] = useState("all_time");
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [panelAnchorRect, setPanelAnchorRect] = useState<DOMRect | null>(null);
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const presetRowRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBranchIds.length > 0) count += 1;
    if (filters.direction) count += 1;
    if (filters.category && filters.category !== resetPatch?.category) count += 1;
    if (filters.evidenceStatus) count += 1;
    if (filters.accountantStatus) count += 1;
    if (filters.managerStatus) count += 1;
    if (filters.weeklyApprovalStatus) count += 1;
    if (filters.posted) count += 1;
    if (filters.cashIssued) count += 1;
    if (filters.status) count += 1;
    if (filters.fromDate || filters.toDate) count += 1;
    return count;
  }, [filters, resetPatch?.category, selectedBranchIds.length]);

  useEffect(() => {
    if (!openCal) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        customDateRef.current &&
        !customDateRef.current.contains(event.target as Node)
      ) {
        setOpenCal(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openCal]);

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    setDateMode("preset");
    if (preset === "all_time") {
      onChange({ fromDate: undefined, toDate: undefined });
      return;
    }
    const range = getDateRangeFromPreset(preset);
    onChange({
      fromDate: toInputDate(range.from),
      toDate: toInputDate(range.to),
    });
  };

  const clearAll = () => {
    setDateMode("preset");
    setSelectedPreset("all_time");
    setShowPresetPanel(false);
    setOpenCal(null);
    onChange({
      branchIds: undefined,
      direction: undefined,
      category: undefined,
      status: undefined,
      accountantStatus: undefined,
      managerStatus: undefined,
      weeklyApprovalStatus: undefined,
      posted: undefined,
      cashIssued: undefined,
      evidenceStatus: undefined,
      fromDate: undefined,
      toDate: undefined,
      search: undefined,
      page: 1,
      ...resetPatch,
    });
  };

  return (
    <aside className="m-4 flex h-[calc(100%-2rem)] max-h-[calc(100%-2rem)] w-64 shrink-0 flex-col overflow-hidden rounded-xl border bg-white shadow-xl">
      <div className="flex shrink-0 items-center justify-between rounded-t-xl border-b bg-white px-4 py-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-medium text-brand hover:text-brand-dark">
              Xóa tất cả
            </button>
          )}
      </div>
      <div
        className="custom-sidebar-scroll min-h-0 flex-1 overscroll-y-contain"
        style={{ overflowY: "scroll", overscrollBehaviorY: "contain" }}>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Thời gian
            </label>
            <div className="space-y-1.5">
              <div
                ref={presetRowRef}
                onClick={() => {
                  setOpenCal(null);
                  if (dateMode !== "preset") applyPreset(selectedPreset);
                  else setDateMode("preset");
                  if (showPresetPanel) {
                    setShowPresetPanel(false);
                  } else {
                    setPanelAnchorRect(
                      presetRowRef.current?.getBoundingClientRect() ?? null,
                    );
                    setShowPresetPanel(true);
                  }
                }}
                className={`flex cursor-pointer select-none items-center gap-2.5 rounded-lg border px-2 py-1 transition-all ${
                  dateMode === "preset"
                    ? "border-brand bg-brand-soft"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <div
                  className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    dateMode === "preset" ? "border-brand" : "border-gray-300"
                  }`}>
                  {dateMode === "preset" && (
                    <div className="h-1 w-1 rounded-full bg-brand" />
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {PRESET_LABELS[selectedPreset] ?? "Chọn thời gian"}
                </span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    showPresetPanel ? "text-brand" : "text-gray-400"
                  }`}
                />
              </div>

              <div
                onClick={() => {
                  setDateMode("custom");
                  setShowPresetPanel(false);
                }}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1 transition-all ${
                  dateMode === "custom"
                    ? "border-brand bg-brand-soft"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <div
                  className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    dateMode === "custom" ? "border-brand" : "border-gray-300"
                  }`}>
                  {dateMode === "custom" && (
                    <div className="h-1 w-1 rounded-full bg-brand" />
                  )}
                </div>
                <span className="flex-1 text-sm text-gray-700">Tùy chỉnh</span>
                <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
              </div>

              {dateMode === "custom" && (
                <div ref={customDateRef} className="space-y-2 pt-1">
                  {(["from", "to"] as const).map((field) => {
                    const isFrom = field === "from";
                    const value = isFrom ? filters.fromDate || "" : filters.toDate || "";
                    const isOpen = openCal === field;
                    return (
                      <div key={field}>
                        <span className="mb-1 block text-xs text-gray-500">
                          {isFrom ? "Từ ngày" : "Đến ngày"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOpenCal(isOpen ? null : field)}
                          className={`flex w-full items-center justify-between rounded-lg border px-2 py-1 text-sm transition-all ${
                            value
                              ? "border-brand bg-brand-soft text-gray-800"
                              : "border-gray-200 text-gray-400"
                          } ${
                            isOpen
                              ? "border-brand ring-2 ring-brand-soft"
                              : "hover:border-gray-300"
                          }`}>
                          <span>{value ? formatDateLabel(value) : "Chọn ngày"}</span>
                          <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                        {isOpen && (
                          <MiniCalendar
                            value={value}
                            onChange={(nextValue) =>
                              onChange(
                                isFrom
                                  ? { fromDate: nextValue || undefined }
                                  : { toDate: nextValue || undefined },
                              )
                            }
                            onClose={() => setOpenCal(null)}
                            minDate={field === "to" ? filters.fromDate : undefined}
                            maxDate={field === "from" ? filters.toDate : undefined}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showPresetPanel && (
                <PresetPanel
                  selected={selectedPreset}
                  onSelect={applyPreset}
                  onClose={() => setShowPresetPanel(false)}
                  anchorRect={panelAnchorRect}
                  triggerRef={presetRowRef}
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Chi nhánh
            </label>
            <FilterMultiSelect
              options={branchOptions}
              values={selectedBranchIds.map(String)}
              onChange={(values) =>
                onChange({
                  branchIds: values.length ? values.map(Number) : undefined,
                })
              }
              placeholder="Tất cả chi nhánh"
              searchPlaceholder="Tìm chi nhánh..."
              multiLabel={(count) => `${count} chi nhánh`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Loại dòng tiền
            </label>
            <FilterDropdown
              options={DIRECTION_OPTIONS}
              value={filters.direction || ""}
              placeholder="Thu và chi"
              onChange={(value) => onChange({ direction: value || undefined })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nhóm nghiệp vụ
            </label>
            <FilterDropdown
              options={categoryOptions}
              value={filters.category || ""}
              placeholder="Tất cả nghiệp vụ"
              onChange={(value) =>
                onChange({
                  category: value || resetPatch?.category || undefined,
                })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nhóm chi phí
            </label>
            <FilterDropdown
              options={SUBCATEGORIES.map(([value, label]) => ({
                value,
                label,
              }))}
              value={filters.subCategory || ""}
              placeholder="Tất cả nhóm chi phí"
              onChange={(value) =>
                onChange({ subCategory: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trạng thái chứng từ
            </label>
            <FilterDropdown
              options={EVIDENCE_OPTIONS}
              value={filters.evidenceStatus || ""}
              placeholder="Tất cả chứng từ"
              onChange={(value) =>
                onChange({ evidenceStatus: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trạng thái kế toán
            </label>
            <FilterDropdown
              options={ACCOUNTANT_OPTIONS}
              value={filters.accountantStatus || ""}
              placeholder="Tất cả"
              onChange={(value) =>
                onChange({ accountantStatus: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trạng thái quản lý
            </label>
            <FilterDropdown
              options={MANAGER_OPTIONS}
              value={filters.managerStatus || ""}
              placeholder="Tất cả"
              onChange={(value) =>
                onChange({ managerStatus: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Approval tuần
            </label>
            <FilterDropdown
              options={WEEKLY_OPTIONS}
              value={filters.weeklyApprovalStatus || ""}
              placeholder="Tất cả"
              onChange={(value) =>
                onChange({ weeklyApprovalStatus: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Ghi nhận vào quỹ
            </label>
            <FilterDropdown
              options={POSTED_OPTIONS}
              value={filters.posted || ""}
              placeholder="Tất cả"
              onChange={(value) =>
                onChange({
                  posted: (value || undefined) as
                    | "POSTED"
                    | "UNPOSTED"
                    | undefined,
                })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trạng thái Đã chi
            </label>
            <FilterDropdown
              options={CASH_ISSUED_OPTIONS}
              value={filters.cashIssued || ""}
              placeholder="Tất cả"
              onChange={(value) =>
                onChange({ cashIssued: value || undefined })
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Trạng thái
            </label>
            <FilterDropdown
              options={STATUS_OPTIONS}
              value={filters.status || ""}
              placeholder="Tất cả trạng thái"
              onChange={(value) => onChange({ status: value || undefined })}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
