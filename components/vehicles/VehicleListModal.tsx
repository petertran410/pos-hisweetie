"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type { Vehicle } from "@/lib/api/vehicles";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  useCreateVehicle,
  useUpdateVehicle,
  useVehicles,
} from "@/lib/hooks/useVehicles";
import { formatDateOnly } from "@/lib/internal-finance/dates";
import {
  FUEL_NORM_TOLERANCE,
  FUEL_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  canVehicle,
} from "@/lib/internal-finance/vehicle-constants";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";

const DUE_SOON_DAYS = 30;

const numberOrNull = (value: string) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
};

const numberText = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "" : String(Number(value));

const FUEL_NORM_MIN = 0.1;
const FUEL_NORM_MAX = 100;

/** Định mức L/100km: nhận cả "12,5" lẫn "12.5". */
const fuelNormOrNull = (value: string) => numberOrNull(value.replace(",", "."));

const formatLiters = (value: number | string | null | undefined) =>
  value === null || value === undefined
    ? null
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

function DueDate({ value, now }: { value: string | null; now: number }) {
  if (!value) return <span className="text-gray-400">-</span>;
  const days = Math.floor(
    (new Date(value.slice(0, 10)).getTime() - now) / 86_400_000,
  );
  const tone =
    days < 0
      ? "text-red-600"
      : days <= DUE_SOON_DAYS
        ? "text-amber-600"
        : "text-gray-900";
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${tone}`}>
      {days <= DUE_SOON_DAYS && <AlertTriangle className="h-3.5 w-3.5" />}
      {formatDateOnly(value)}
      {days < 0
        ? " (quá hạn)"
        : days <= DUE_SOON_DAYS
          ? ` (còn ${days + 1} ngày)`
          : ""}
    </span>
  );
}

function VehicleForm({
  vehicle,
  branches,
  defaultBranchId,
  onDone,
}: {
  vehicle: Vehicle | null;
  branches: Array<{ id: number; name: string }>;
  defaultBranchId: number;
  onDone: () => void;
}) {
  const { data: users } = useUsersForFilter();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const [branchId, setBranchId] = useState(
    vehicle?.branchId ?? defaultBranchId,
  );
  const [label, setLabel] = useState(vehicle?.label || "");
  const [plate, setPlate] = useState(vehicle?.plate || "");
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicleType || "CAR");
  const [fuelType, setFuelType] = useState(vehicle?.fuelType || "");
  const [driverId, setDriverId] = useState(
    vehicle?.driverId ? String(vehicle.driverId) : "",
  );
  const [costMin, setCostMin] = useState(numberText(vehicle?.costPerKmMin));
  const [costMax, setCostMax] = useState(numberText(vehicle?.costPerKmMax));
  const [fuelNorm, setFuelNorm] = useState(numberText(vehicle?.fuelNorm));
  const [oilInterval, setOilInterval] = useState(
    numberText(vehicle?.oilChangeIntervalKm),
  );
  const [note, setNote] = useState(vehicle?.note || "");
  const userOptions = useMemo(
    () =>
      (users || []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [users],
  );
  const pending = createVehicle.isPending || updateVehicle.isPending;
  const labelClass =
    "flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!label.trim() || !plate.trim()) {
      toast.error("Cần nhập tên xe và biển số");
      return;
    }
    const min = numberOrNull(costMin);
    const max = numberOrNull(costMax);
    if (min !== null && max !== null && min >= max) {
      toast.error("Ngưỡng đ/km tối thiểu phải nhỏ hơn tối đa");
      return;
    }
    const normValue = fuelNormOrNull(fuelNorm);
    if (
      normValue !== null &&
      (normValue < FUEL_NORM_MIN || normValue > FUEL_NORM_MAX)
    ) {
      toast.error(
        `Định mức L/100km phải từ ${FUEL_NORM_MIN} đến ${FUEL_NORM_MAX}`,
      );
      return;
    }
    const payload = {
      label: label.trim(),
      plate: plate.trim(),
      vehicleType,
      fuelType: fuelType || null,
      driverId: driverId ? Number(driverId) : null,
      costPerKmMin: min,
      costPerKmMax: max,
      fuelNorm: normValue !== null ? Math.round(normValue * 100) / 100 : null,
      oilChangeIntervalKm: numberOrNull(oilInterval),
      note: note.trim() || null,
    };
    if (vehicle) {
      updateVehicle.mutate({ id: vehicle.id, payload }, { onSuccess: onDone });
    } else {
      createVehicle.mutate({ ...payload, branchId }, { onSuccess: onDone });
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 border-b bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className={labelClass}>
        Chi nhánh
        <select
          value={branchId}
          disabled={Boolean(vehicle)}
          onChange={(event) => setBranchId(Number(event.target.value))}
          className="dt-select h-10 w-full disabled:bg-gray-100">
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Tên xe (hiện khi chọn xe)
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="dt-input h-10 w-full"
          placeholder="29D - 223.09 - Xăng"
          required
        />
      </label>
      <label className={labelClass}>
        Biển số
        <input
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          className="dt-input h-10 w-full"
          placeholder="29D-223.09"
          required
        />
      </label>
      <div className={labelClass}>
        Lái xe phụ trách
        <FilterSearchableSelect
          options={userOptions}
          value={driverId}
          onChange={setDriverId}
          placeholder="Chưa gán"
          searchPlaceholder="Tìm nhân viên..."
        />
      </div>
      <label className={labelClass}>
        Loại xe
        <select
          value={vehicleType}
          onChange={(event) => setVehicleType(event.target.value)}
          className="dt-select h-10 w-full">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Nhiên liệu
        <select
          value={fuelType}
          onChange={(event) => setFuelType(event.target.value)}
          className="dt-select h-10 w-full">
          <option value="">Không rõ</option>
          {Object.entries(FUEL_TYPE_LABELS).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <div className={labelClass}>
        Ngưỡng đ/km bình thường
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={costMin}
            onChange={(event) => setCostMin(event.target.value)}
            className="dt-input h-10 w-full"
            placeholder="Từ"
          />
          <input
            inputMode="numeric"
            value={costMax}
            onChange={(event) => setCostMax(event.target.value)}
            className="dt-input h-10 w-full"
            placeholder="Đến"
          />
        </div>
      </div>
      <label className={labelClass}>
        Chu kỳ thay nhớt (km)
        <input
          inputMode="numeric"
          value={oilInterval}
          onChange={(event) => setOilInterval(event.target.value)}
          className="dt-input h-10 w-full"
          placeholder="Ví dụ 5000"
        />
      </label>
      <label className={labelClass}>
        Định mức (L/100km)
        <input
          inputMode="decimal"
          value={fuelNorm}
          onChange={(event) => setFuelNorm(event.target.value)}
          className="dt-input h-10 w-full"
          placeholder="Ví dụ 12.5"
        />
        <span className="font-normal text-gray-500">
          {vehicle?.recentLitersPer100Km != null
            ? `Thực tế gần đây: ${formatLiters(vehicle.recentLitersPer100Km)} L/100km (trung bình ${vehicle.recentFuelSamples} lần đổ)`
            : `Lệch quá ±${FUEL_NORM_TOLERANCE} so với mức này thì phiếu xăng bị “Bất thường”`}
        </span>
      </label>
      <label className={`${labelClass} sm:col-span-2 lg:col-span-2`}>
        Ghi chú
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="dt-input h-10 w-full"
        />
      </label>
      <div className="flex items-end justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-lg border px-4 text-sm text-gray-700 hover:bg-white">
          Hủy
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {vehicle ? "Lưu xe" : "Thêm xe"}
        </button>
      </div>
    </form>
  );
}

export function VehicleListModal({
  branches,
  defaultBranchId,
  onClose,
}: {
  branches: Array<{ id: number; name: string }>;
  defaultBranchId: number;
  onClose: () => void;
}) {
  const access = useFinanceAccess();
  const vehicles = useVehicles({ includeInactive: true });
  const updateVehicle = useUpdateVehicle();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);
  const [now] = useState(() => Date.now());
  const manageBranches = branches.filter((branch) =>
    canVehicle(access, "manage", branch.id),
  );
  const rows = vehicles.data || [];
  const missingNorm = rows.filter(
    (vehicle) => vehicle.isActive && vehicle.fuelNorm == null,
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)] sm:max-w-[1600px] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Danh sách xe
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              ODO, hạn đăng kiểm, bảo hiểm, km từ lần thay nhớt và L/100km thực
              tế lấy từ các phiếu xe. Phiếu xăng có L/100km lệch quá ±
              {FUEL_NORM_TOLERANCE} so với định mức của xe là “Bất thường”.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {manageBranches.length > 0 && !adding && !editing && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                <Plus className="h-4 w-4" />
                Thêm xe
              </button>
            )}
            <button
              type="button"
              title="Đóng"
              onClick={onClose}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {(adding || editing) && (
          <VehicleForm
            key={editing?.id ?? "new"}
            vehicle={editing}
            branches={manageBranches}
            defaultBranchId={
              manageBranches.some((branch) => branch.id === defaultBranchId)
                ? defaultBranchId
                : manageBranches[0]?.id || defaultBranchId
            }
            onDone={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        )}

        {missingNorm > 0 && (
          <p className="flex shrink-0 items-center gap-2 border-b bg-amber-50 px-5 py-2 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {missingNorm} xe đang dùng chưa đặt định mức L/100km: phiếu xăng của
            các xe này chưa được kiểm tra định mức. Bấm “Sửa” để đặt.
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                {[
                  "Xe",
                  "Chi nhánh",
                  "Loại",
                  "Lái xe",
                  "ODO hiện tại",
                  "Hạn đăng kiểm",
                  "Hạn bảo hiểm",
                  "Km từ lần thay nhớt",
                  "Ngưỡng đ/km",
                  "L/100km thực tế",
                  "Định mức L/100km",
                  "",
                ].map((label) => (
                  <th
                    key={label || "actions"}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.isLoading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                    Đang tải...
                  </td>
                </tr>
              ) : vehicles.isError ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-red-600">
                    {vehicles.error instanceof Error
                      ? vehicles.error.message
                      : "Không tải được danh sách xe"}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-gray-400">
                    Chưa có xe nào. Bấm “Thêm xe” để tạo danh sách xe của kho.
                  </td>
                </tr>
              ) : (
                rows.map((vehicle) => {
                  const canManage = canVehicle(
                    access,
                    "manage",
                    vehicle.branchId,
                  );
                  const norm =
                    vehicle.fuelNorm != null ? Number(vehicle.fuelNorm) : null;
                  // L/100km thực tế lệch quá ±dung sai: cần xem lại định mức hoặc xe.
                  const outOfNorm =
                    norm !== null &&
                    vehicle.recentLitersPer100Km != null &&
                    Math.round(
                      Math.abs(vehicle.recentLitersPer100Km - norm) * 100,
                    ) /
                      100 >
                      FUEL_NORM_TOLERANCE;
                  return (
                    <tr
                      key={vehicle.id}
                      className={`border-b hover:bg-gray-50 ${
                        vehicle.isActive ? "" : "opacity-60"
                      }`}>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="font-medium text-gray-900">
                          {vehicle.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {vehicle.plate}
                          {vehicle.isActive ? "" : " · Ngừng dùng"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {vehicle.branch?.name || vehicle.branchId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {VEHICLE_TYPE_LABELS[vehicle.vehicleType] ||
                          vehicle.vehicleType}
                        {vehicle.fuelType
                          ? ` · ${FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType}`
                          : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        {vehicle.driver?.name || (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {vehicle.currentOdo !== null
                          ? vehicle.currentOdo.toLocaleString("en-US")
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <DueDate value={vehicle.registrationDueAt} now={now} />
                      </td>
                      <td className="px-3 py-2.5">
                        <DueDate value={vehicle.insuranceDueAt} now={now} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {vehicle.kmSinceOilChange !== null ? (
                          <span
                            className={
                              vehicle.oilChangeDue
                                ? "inline-flex items-center gap-1 font-medium text-red-600"
                                : ""
                            }>
                            {vehicle.oilChangeDue && (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {vehicle.kmSinceOilChange.toLocaleString("en-US")}
                            {vehicle.oilChangeIntervalKm
                              ? ` / ${vehicle.oilChangeIntervalKm.toLocaleString("en-US")}`
                              : ""}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {vehicle.costPerKmMin !== null &&
                        vehicle.costPerKmMax !== null
                          ? `${Number(vehicle.costPerKmMin).toLocaleString("en-US")} – ${Number(vehicle.costPerKmMax).toLocaleString("en-US")}`
                          : "-"}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2.5 tabular-nums"
                        title={
                          vehicle.recentFuelSamples
                            ? `Tổng lít ÷ tổng km của ${vehicle.recentFuelSamples} lần đổ gần nhất`
                            : undefined
                        }>
                        {vehicle.recentLitersPer100Km != null ? (
                          <span
                            className={
                              outOfNorm
                                ? "inline-flex items-center gap-1 font-medium text-red-600"
                                : ""
                            }>
                            {outOfNorm && (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {formatLiters(vehicle.recentLitersPer100Km)}
                            <span className="ml-1 text-xs font-normal text-gray-400">
                              ({vehicle.recentFuelSamples} lần)
                            </span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        {norm !== null ? (
                          <>
                            {formatLiters(norm)}
                            <span className="ml-1 text-xs text-gray-400">
                              ±{FUEL_NORM_TOLERANCE}
                            </span>
                          </>
                        ) : vehicle.isActive ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Chưa đặt
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {canManage && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdding(false);
                                setEditing(vehicle);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs text-gray-700 hover:bg-white">
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={updateVehicle.isPending}
                              onClick={() =>
                                updateVehicle.mutate({
                                  id: vehicle.id,
                                  payload: { isActive: !vehicle.isActive },
                                })
                              }
                              className="whitespace-nowrap rounded-lg border px-2 py-1.5 text-xs text-gray-700 hover:bg-white disabled:opacity-50">
                              {vehicle.isActive ? "Ngừng dùng" : "Dùng lại"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
