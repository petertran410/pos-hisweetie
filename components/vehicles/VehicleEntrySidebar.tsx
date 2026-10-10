"use client";

import { X } from "lucide-react";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
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

export function VehicleEntrySidebar({
  kind,
  filters,
  branches,
  vehicles,
  mobileOpen,
  onMobileClose,
  onChange,
  onClear,
}: {
  kind: VehicleEntryKind;
  filters: VehicleEntryFilters;
  branches: Array<{ id: number; name: string }>;
  vehicles: Vehicle[];
  mobileOpen: boolean;
  onMobileClose: () => void;
  onChange: (patch: Partial<VehicleEntryFilters>) => void;
  onClear: () => void;
}) {
  const activeCount = [
    filters.branchId,
    filters.vehicleId,
    filters.serviceType,
    filters.check,
    filters.status,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;
  const vehicleOptions = filters.branchId
    ? vehicles.filter((vehicle) => vehicle.branchId === filters.branchId)
    : vehicles;
  const fieldLabel = "mb-2 block text-sm font-medium text-gray-700";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`custom-sidebar-scroll z-40 min-h-0 w-64 shrink-0 flex-col overflow-y-auto border bg-white shadow-xl md:static md:m-4 md:flex md:h-[calc(100%-2rem)] md:rounded-xl ${
          mobileOpen ? "fixed inset-y-0 left-0 flex" : "hidden"
        }`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-2 md:rounded-t-xl">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-sm font-medium text-brand hover:text-brand-dark">
                Xóa tất cả
              </button>
            )}
            <button
              type="button"
              title="Đóng bộ lọc"
              onClick={onMobileClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 md:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className={fieldLabel}>Chi nhánh</label>
            <select
              value={filters.branchId ? String(filters.branchId) : ""}
              onChange={(event) =>
                onChange({
                  branchId: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                  vehicleId: undefined,
                })
              }
              className="dt-select h-10 w-full">
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel}>Xe</label>
            <select
              value={filters.vehicleId ? String(filters.vehicleId) : ""}
              onChange={(event) =>
                onChange({
                  vehicleId: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              className="dt-select h-10 w-full">
              <option value="">Tất cả xe</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.label}
                  {vehicle.isActive ? "" : " (ngừng dùng)"}
                </option>
              ))}
            </select>
          </div>

          {kind === "FUEL" ? (
            <div>
              <label className={fieldLabel}>Kiểm tra tiêu hao</label>
              <select
                value={filters.check || ""}
                onChange={(event) =>
                  onChange({
                    check: (event.target.value || undefined) as
                      | "NORMAL"
                      | "ABNORMAL"
                      | undefined,
                  })
                }
                className="dt-select h-10 w-full">
                <option value="">Tất cả</option>
                <option value="ABNORMAL">Bất thường</option>
                <option value="NORMAL">Bình thường</option>
              </select>
            </div>
          ) : (
            <div>
              <label className={fieldLabel}>Loại dịch vụ</label>
              <select
                value={filters.serviceType || ""}
                onChange={(event) =>
                  onChange({ serviceType: event.target.value || undefined })
                }
                className="dt-select h-10 w-full">
                <option value="">Tất cả dịch vụ</option>
                {VEHICLE_SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={fieldLabel}>Trạng thái</label>
            <select
              value={filters.status || ""}
              onChange={(event) =>
                onChange({ status: event.target.value || undefined })
              }
              className="dt-select h-10 w-full">
              <option value="">Chưa hủy</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {ENTRY_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Thời gian
            </label>
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
        </div>
      </aside>
    </>
  );
}
