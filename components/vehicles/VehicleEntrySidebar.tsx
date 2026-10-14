"use client";

import {
  FilterDivider,
  FilterSection,
  FinanceFilterSidebar,
} from "@/components/internal-finance/FinanceFilterSidebar";
import { TimeRangeFilter } from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useSavedTimeRange } from "@/lib/internal-finance/time-range";
import type {
  VehicleEntryKind,
  VehicleEntryQuery,
} from "@/lib/api/internal-finance";
import type { Vehicle } from "@/lib/api/vehicles";
import {
  ENTRY_STATUS_LABELS,
  VEHICLE_SERVICE_TYPES,
} from "@/lib/internal-finance/vehicle-constants";

export type VehicleEntryFilters = Pick<
  VehicleEntryQuery,
  | "branchId"
  | "vehicleId"
  | "serviceType"
  | "check"
  | "status"
  | "fromDate"
  | "toDate"
>;

const STATUS_OPTIONS = [
  "PENDING_ACCOUNTANT",
  "READY_FOR_WEEKLY_APPROVAL",
  "IN_WEEKLY_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const CHECK_OPTIONS = [
  { value: "ABNORMAL", label: "Bất thường" },
  { value: "NORMAL", label: "Bình thường" },
];

export function VehicleEntrySidebar({
  kind,
  filters,
  branches,
  vehicles,
  storageKey,
  mobileOpen,
  onMobileClose,
  onChange,
  onClear,
}: {
  kind: VehicleEntryKind;
  filters: VehicleEntryFilters;
  branches: Array<{ id: number; name: string }>;
  vehicles: Vehicle[];
  /** Khóa lưu khoảng thời gian đã chọn. */
  storageKey: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onChange: (patch: Partial<VehicleEntryFilters>) => void;
  onClear: () => void;
}) {
  const time = useSavedTimeRange(storageKey, onChange);
  const activeCount = [
    filters.branchId,
    filters.vehicleId,
    filters.serviceType,
    filters.check,
    filters.status,
    time.active,
  ].filter(Boolean).length;
  const vehicleOptions = filters.branchId
    ? vehicles.filter((vehicle) => vehicle.branchId === filters.branchId)
    : vehicles;
  const select = (
    value: string | undefined,
    options: Array<{ value: string; label: string }>,
    placeholder: string,
    onSelect: (value: string | undefined) => void,
    searchable = false,
  ) => (
    <FilterSearchableSelect
      options={options}
      value={value || ""}
      onChange={(next) => onSelect(next || undefined)}
      placeholder={placeholder}
      searchable={searchable}
    />
  );

  return (
    <FinanceFilterSidebar
      activeCount={activeCount}
      onClear={() => {
        time.reset();
        onClear();
      }}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}>
      <TimeRangeFilter
        label="Thời gian"
        value={time.range}
        onChange={time.change}
      />
      <FilterDivider />
      <FilterSection label="Chi nhánh">
        {select(
          filters.branchId ? String(filters.branchId) : "",
          branches.map((branch) => ({
            value: String(branch.id),
            label: branch.name,
          })),
          "Tất cả chi nhánh",
          (value) =>
            onChange({
              branchId: value ? Number(value) : undefined,
              vehicleId: undefined,
            }),
        )}
      </FilterSection>
      <FilterSection label="Xe">
        {select(
          filters.vehicleId ? String(filters.vehicleId) : "",
          vehicleOptions.map((vehicle) => ({
            value: String(vehicle.id),
            label: `${vehicle.label}${vehicle.isActive ? "" : " (ngừng dùng)"}`,
          })),
          "Tất cả xe",
          (value) => onChange({ vehicleId: value ? Number(value) : undefined }),
          true,
        )}
      </FilterSection>
      <FilterDivider />
      {kind === "FUEL" ? (
        <FilterSection label="Kiểm tra tiêu hao">
          {select(filters.check, CHECK_OPTIONS, "Tất cả", (value) =>
            onChange({ check: value as "NORMAL" | "ABNORMAL" | undefined }),
          )}
        </FilterSection>
      ) : (
        <FilterSection label="Loại dịch vụ">
          {select(
            filters.serviceType,
            VEHICLE_SERVICE_TYPES.map((service) => ({
              value: service,
              label: service,
            })),
            "Tất cả dịch vụ",
            (value) => onChange({ serviceType: value }),
          )}
        </FilterSection>
      )}
      <FilterSection label="Trạng thái">
        {select(
          filters.status,
          STATUS_OPTIONS.map((status) => ({
            value: status,
            label: ENTRY_STATUS_LABELS[status],
          })),
          "Chưa hủy",
          (value) => onChange({ status: value }),
        )}
      </FilterSection>
    </FinanceFilterSidebar>
  );
}
