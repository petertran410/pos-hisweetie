"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search, X } from "lucide-react";
import {
  FilterMultiSelect,
  FilterNumberRange,
  type FilterOption,
} from "@/components/ui/filters";
import {
  CONFIDENCE_LABEL,
  FLAG_CODE_LABEL,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_STYLE,
  RELIABILITY_LABEL,
  type ConfidenceLevel,
  type PriorityLevel,
  type RecommendationFilters,
  type RecommendationListMeta,
  type ReliabilityLevel,
} from "@/lib/types/purchasing-planning";

interface Props {
  filters: RecommendationFilters;
  setFilters: (f: Partial<RecommendationFilters>) => void;
  meta?: RecommendationListMeta;
  suppliers?: { id: number; name: string }[];
  trademarks?: { id: number; name: string }[];
  parentCategories?: string[];
  middleCategories?: string[];
  childCategories?: string[];
}

const PRIORITY_OPTIONS: FilterOption[] = PRIORITY_ORDER.map((p) => ({
  value: p,
  label: PRIORITY_LABEL[p],
}));

const RELIABILITY_OPTIONS: FilterOption[] = (
  ["RELIABLE", "CAUTION", "UNRELIABLE", "BLOCKED"] as ReliabilityLevel[]
).map((r) => ({ value: r, label: RELIABILITY_LABEL[r] }));

const CONFIDENCE_OPTIONS: FilterOption[] = (
  ["HIGH", "MEDIUM", "LOW", "VERY_LOW", "NO_DATA"] as ConfidenceLevel[]
).map((c) => ({ value: c, label: CONFIDENCE_LABEL[c] }));

const FLAG_OPTIONS: FilterOption[] = Object.entries(FLAG_CODE_LABEL).map(
  ([code, label]) => ({ value: code, label })
);

const STORAGE_KEY = "pp-sidebar-sections";

type SectionKey = "level" | "classify" | "threshold" | "flags";

export function PurchasingPlanningSidebar({
  filters,
  setFilters,
  meta,
  suppliers = [],
  trademarks = [],
  parentCategories = [],
  middleCategories = [],
  childCategories = [],
}: Props) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Trạng thái gập/mở từng nhóm — ghi nhớ giữa các lần mở trang
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    level: true,
    classify: false,
    threshold: false,
    flags: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOpenSections(JSON.parse(saved));
    } catch {
      // bỏ qua lỗi localStorage (chế độ riêng tư…)
    }
  }, []);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua
      }
      return next;
    });
  };

  // Debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.search ?? "") !== searchInput) {
        setFilters({ search: searchInput || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const toOptions = (list: string[]): FilterOption[] =>
    list.map((v) => ({ value: v, label: v }));

  const supplierOptions: FilterOption[] = useMemo(
    () => suppliers.map((s) => ({ value: String(s.id), label: s.name })),
    [suppliers]
  );

  const trademarkOptions: FilterOption[] = useMemo(
    () => trademarks.map((t) => ({ value: String(t.id), label: t.name })),
    [trademarks]
  );

  // Đếm số bộ lọc đang bật để hiển thị badge
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.search) n++;
    if (filters.priority?.length) n++;
    if (filters.reliability?.length) n++;
    if (filters.confidence?.length) n++;
    if (filters.parentNames?.length) n++;
    if (filters.middleNames?.length) n++;
    if (filters.childNames?.length) n++;
    if (filters.tradeMarkIds?.length) n++;
    if (filters.supplierIds?.length) n++;
    if (filters.daysUntilStockoutFrom !== undefined) n++;
    if (filters.daysUntilStockoutTo !== undefined) n++;
    if (filters.daysOfSupplyFrom !== undefined) n++;
    if (filters.daysOfSupplyTo !== undefined) n++;
    if (filters.estimatedValueFrom !== undefined) n++;
    if (filters.estimatedValueTo !== undefined) n++;
    if (filters.hasFlags) n++;
    if (filters.flagCodes?.length) n++;
    if (filters.isBlocked) n++;
    if (filters.needsOrderOnly === false) n++;
    return n;
  }, [filters]);

  const handleReset = () => {
    setSearchInput("");
    setFilters({
      search: undefined,
      priority: undefined,
      reliability: undefined,
      confidence: undefined,
      parentNames: undefined,
      middleNames: undefined,
      childNames: undefined,
      tradeMarkIds: undefined,
      supplierIds: undefined,
      supplierId: undefined,
      daysUntilStockoutFrom: undefined,
      daysUntilStockoutTo: undefined,
      daysOfSupplyFrom: undefined,
      daysOfSupplyTo: undefined,
      estimatedValueFrom: undefined,
      estimatedValueTo: undefined,
      hasFlags: undefined,
      flagCodes: undefined,
      isBlocked: undefined,
      needsOrderOnly: true,
      page: 1,
    });
  };

  return (
    <aside
      className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r p-4"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* ── Tiêu đề ── */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          Bộ lọc
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-800">
            <RotateCcw className="h-3 w-3" />
            Đặt lại
          </button>
        )}
      </div>

      {/* ── Tìm kiếm ── */}
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Mã hoặc tên hàng..."
            className="w-full rounded border py-1.5 pr-7 pl-8 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            style={{ borderColor: "var(--dt-border)" }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Toggle nhanh ── */}
      <div className="flex flex-col gap-1.5">
        <Checkbox
          checked={filters.needsOrderOnly !== false}
          onChange={(v) => setFilters({ needsOrderOnly: v, page: 1 })}
          label="Chỉ hiện SKU cần đặt"
        />
        <Checkbox
          checked={!!filters.hasFlags}
          onChange={(v) => setFilters({ hasFlags: v || undefined, page: 1 })}
          label="Chỉ hiện SKU có cảnh báo"
        />
        <Checkbox
          checked={!!filters.isBlocked}
          onChange={(v) => setFilters({ isBlocked: v || undefined, page: 1 })}
          label="Chỉ hiện SKU bị chặn"
        />
      </div>

      {/* ── NHÓM: MỨC ĐỘ ── */}
      <Section
        title="Mức độ"
        open={openSections.level}
        onToggle={() => toggleSection("level")}>
        <Field label="Mức ưu tiên">
          <FilterMultiSelect
            options={PRIORITY_OPTIONS}
            values={(filters.priority ?? []) as string[]}
            onChange={(v) =>
              setFilters({
                priority: v.length ? (v as PriorityLevel[]) : undefined,
                page: 1,
              })
            }
            placeholder="Tất cả mức"
            searchable={false}
            multiLabel={(n) => `Đã chọn ${n}`}
          />
        </Field>

        <Field label="Độ tin cậy đề xuất">
          <FilterMultiSelect
            options={RELIABILITY_OPTIONS}
            values={(filters.reliability ?? []) as string[]}
            onChange={(v) =>
              setFilters({
                reliability: v.length ? (v as ReliabilityLevel[]) : undefined,
                page: 1,
              })
            }
            placeholder="Tất cả"
            searchable={false}
            multiLabel={(n) => `Đã chọn ${n}`}
          />
        </Field>

        <Field label="Độ tin cậy dự báo">
          <FilterMultiSelect
            options={CONFIDENCE_OPTIONS}
            values={(filters.confidence ?? []) as string[]}
            onChange={(v) =>
              setFilters({
                confidence: v.length ? (v as ConfidenceLevel[]) : undefined,
                page: 1,
              })
            }
            placeholder="Tất cả"
            searchable={false}
            multiLabel={(n) => `Đã chọn ${n}`}
          />
        </Field>
      </Section>

      {/* ── NHÓM: PHÂN LOẠI HÀNG ── */}
      <Section
        title="Phân loại hàng"
        open={openSections.classify}
        onToggle={() => toggleSection("classify")}>
        {parentCategories.length > 0 && (
          <Field label="Loại hàng">
            <FilterMultiSelect
              options={toOptions(parentCategories)}
              values={filters.parentNames ?? []}
              onChange={(v) =>
                setFilters({ parentNames: v.length ? v : undefined, page: 1 })
              }
              placeholder="Tất cả"
              searchPlaceholder="Tìm loại hàng..."
            />
          </Field>
        )}

        {middleCategories.length > 0 && (
          <Field label="Nguồn gốc">
            <FilterMultiSelect
              options={toOptions(middleCategories)}
              values={filters.middleNames ?? []}
              onChange={(v) =>
                setFilters({ middleNames: v.length ? v : undefined, page: 1 })
              }
              placeholder="Tất cả"
              searchPlaceholder="Tìm nguồn gốc..."
            />
          </Field>
        )}

        {childCategories.length > 0 && (
          <Field label="Danh mục">
            <FilterMultiSelect
              options={toOptions(childCategories)}
              values={filters.childNames ?? []}
              onChange={(v) =>
                setFilters({ childNames: v.length ? v : undefined, page: 1 })
              }
              placeholder="Tất cả"
              searchPlaceholder="Tìm danh mục..."
            />
          </Field>
        )}

        {trademarkOptions.length > 0 && (
          <Field label="Thương hiệu">
            <FilterMultiSelect
              options={trademarkOptions}
              values={(filters.tradeMarkIds ?? []).map(String)}
              onChange={(v) =>
                setFilters({
                  tradeMarkIds: v.length ? v.map(Number) : undefined,
                  page: 1,
                })
              }
              placeholder="Tất cả"
              searchPlaceholder="Tìm thương hiệu..."
            />
          </Field>
        )}

        {supplierOptions.length > 0 && (
          <Field label="Nhà cung cấp">
            <FilterMultiSelect
              options={supplierOptions}
              values={(filters.supplierIds ?? []).map(String)}
              onChange={(v) =>
                setFilters({
                  supplierIds: v.length ? v.map(Number) : undefined,
                  supplierId: undefined,
                  page: 1,
                })
              }
              placeholder="Tất cả NCC"
              searchPlaceholder="Tìm nhà cung cấp..."
            />
          </Field>
        )}
      </Section>

      {/* ── NHÓM: NGƯỠNG SỐ ── */}
      <Section
        title="Ngưỡng số"
        open={openSections.threshold}
        onToggle={() => toggleSection("threshold")}>
        <Field label="Ngày còn hàng">
          <FilterNumberRange
            from={filters.daysUntilStockoutFrom}
            to={filters.daysUntilStockoutTo}
            onChange={(from, to) =>
              setFilters({
                daysUntilStockoutFrom: from,
                daysUntilStockoutTo: to,
                page: 1,
              })
            }
            suffix="ngày"
            min={0}
          />
        </Field>

        <Field label="Số ngày cung ứng">
          <FilterNumberRange
            from={filters.daysOfSupplyFrom}
            to={filters.daysOfSupplyTo}
            onChange={(from, to) =>
              setFilters({
                daysOfSupplyFrom: from,
                daysOfSupplyTo: to,
                page: 1,
              })
            }
            suffix="ngày"
            min={0}
          />
        </Field>

        <Field label="Giá trị đề xuất (triệu)">
          <FilterNumberRange
            from={
              filters.estimatedValueFrom !== undefined
                ? filters.estimatedValueFrom / 1_000_000
                : undefined
            }
            to={
              filters.estimatedValueTo !== undefined
                ? filters.estimatedValueTo / 1_000_000
                : undefined
            }
            onChange={(from, to) =>
              setFilters({
                estimatedValueFrom:
                  from !== undefined ? from * 1_000_000 : undefined,
                estimatedValueTo: to !== undefined ? to * 1_000_000 : undefined,
                page: 1,
              })
            }
            min={0}
            step={1}
          />
        </Field>
      </Section>

      {/* ── NHÓM: CẢNH BÁO ── */}
      <Section
        title="Cảnh báo"
        open={openSections.flags}
        onToggle={() => toggleSection("flags")}>
        <Field label="Loại cảnh báo">
          <FilterMultiSelect
            options={FLAG_OPTIONS}
            values={filters.flagCodes ?? []}
            onChange={(v) =>
              setFilters({ flagCodes: v.length ? v : undefined, page: 1 })
            }
            placeholder="Tất cả"
            searchPlaceholder="Tìm cảnh báo..."
          />
        </Field>
      </Section>

      {/* ── Thống kê nhanh ── */}
      {meta?.counts && (
        <div
          className="mt-1 border-t pt-3"
          style={{ borderColor: "var(--dt-border)" }}>
          <div className="mb-2 text-xs font-medium text-gray-600">
            Tổng quan
          </div>
          <div className="flex flex-col gap-1">
            {PRIORITY_ORDER.map((p) => {
              const count = meta.counts[p] ?? 0;
              if (count === 0) return null;
              const active = (filters.priority ?? []).includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setFilters({ priority: active ? undefined : [p], page: 1 })
                  }
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                    active ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
                  }`}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${PRIORITY_STYLE[p].dot}`}
                    />
                    {PRIORITY_LABEL[p]}
                  </span>
                  <span className="font-medium tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Thông tin snapshot ── */}
      {meta && (
        <div
          className="mt-auto border-t pt-3 text-[11px] text-gray-500"
          style={{ borderColor: "var(--dt-border)" }}>
          <div>
            Dữ liệu ngày:{" "}
            <span className="font-medium">
              {new Date(meta.snapshotDate).toLocaleDateString("vi-VN")}
            </span>
          </div>
          {meta.isStale && (
            <div className="mt-1 text-orange-600">⚠️ Dữ liệu đã quá 24 giờ</div>
          )}
        </div>
      )}
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THÀNH PHẦN PHỤ
// ═══════════════════════════════════════════════════════════════════════════

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-t pt-2.5"
      style={{ borderColor: "var(--dt-border)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-xs font-semibold tracking-wide text-gray-500 uppercase transition-colors hover:text-gray-800">
        {title}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="mt-2 flex flex-col gap-2.5">{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded"
      />
      <span>{label}</span>
    </label>
  );
}
