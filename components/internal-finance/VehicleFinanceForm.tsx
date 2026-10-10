"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type {
  InternalFinanceAttachment,
  VehicleEntry,
  VehicleEntryKind,
} from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateFuelEntry,
  useCreateVehicleCareEntry,
  useUpdateVehicleEntry,
} from "@/lib/hooks/useInternalFinance";
import { uploadPackingSlipExpenseFiles } from "@/lib/hooks/usePackingSlips";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useVehicles } from "@/lib/hooks/useVehicles";
import { toDateTimeInput } from "@/lib/internal-finance/dates";
import {
  VEHICLE_ATTACHMENT_KIND,
  VEHICLE_BRANCH_IDS,
  VEHICLE_SERVICE_TYPES,
  canVehicle,
} from "@/lib/internal-finance/vehicle-constants";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";

const BRANCH_FALLBACK: Record<number, string> = {
  6: "Kho Hà Nội",
  1: "Kho Sài Gòn",
};

const UPLOAD_GROUPS: Record<
  VehicleEntryKind,
  Array<{ kind: string; label: string }>
> = {
  FUEL: [
    { kind: VEHICLE_ATTACHMENT_KIND.PUMP_METER, label: "Đồng hồ cây xăng" },
    { kind: VEHICLE_ATTACHMENT_KIND.INVOICE, label: "Hóa đơn" },
  ],
  VEHICLE_CARE: [
    { kind: VEHICLE_ATTACHMENT_KIND.PHOTO, label: "Hình ảnh" },
    { kind: VEHICLE_ATTACHMENT_KIND.INVOICE, label: "Hóa đơn" },
  ],
};

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
};

const numberText = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : String(Number(value));

export function VehicleFinanceForm({
  kind: initialKind,
  branchId: initialBranchId,
  entry,
  onClose,
}: {
  kind: VehicleEntryKind;
  branchId: number;
  entry?: VehicleEntry | null;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const { data: branchData } = useBranches();
  const { data: users } = useUsersForFilter();
  const createFuel = useCreateFuelEntry();
  const createCare = useCreateVehicleCareEntry();
  const updateEntry = useUpdateVehicleEntry();
  const isEdit = Boolean(entry);

  const branches = useMemo(() => {
    const payload = branchData as
      | { data?: Array<{ id: number; name: string }> }
      | Array<{ id: number; name: string }>
      | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data || [];
    return VEHICLE_BRANCH_IDS.filter(
      (id) => entry?.branchId === id || canVehicle(user, "create", id),
    ).map((id) => ({
      id,
      name: rows.find((branch) => branch.id === id)?.name || BRANCH_FALLBACK[id],
    }));
  }, [branchData, entry, user]);

  const [kind, setKind] = useState<VehicleEntryKind>(
    entry ? (entry.category as VehicleEntryKind) : initialKind,
  );
  const [branchId, setBranchId] = useState(
    entry?.branchId ??
      (branches.some((branch) => branch.id === initialBranchId)
        ? initialBranchId
        : branches[0]?.id || initialBranchId),
  );
  const [vehicleId, setVehicleId] = useState(
    entry?.vehicleId ? String(entry.vehicleId) : "",
  );
  const [occurredAt, setOccurredAt] = useState(
    toDateTimeInput(entry ? new Date(entry.occurredAt) : new Date()),
  );
  const [amount, setAmount] = useState(numberText(entry?.amount));
  const [unitPrice, setUnitPrice] = useState(
    numberText(entry?.vehicleUnitPrice),
  );
  const [odo, setOdo] = useState(numberText(entry?.vehicleOdo));
  const [location, setLocation] = useState(entry?.vehicleLocation || "");
  const [serviceTypes, setServiceTypes] = useState<string[]>(
    entry?.vehicleServiceTypes || [],
  );
  const [dueAt, setDueAt] = useState(entry?.vehicleDueAt?.slice(0, 10) || "");
  const [payerId, setPayerId] = useState(
    String(entry?.payerId ?? user?.id ?? ""),
  );
  const [note, setNote] = useState(entry?.note || "");
  const [attachments, setAttachments] = useState<InternalFinanceAttachment[]>(
    () =>
      (entry?.attachments || []).map((file) => ({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        kind: file.kind || VEHICLE_ATTACHMENT_KIND.EVIDENCE,
      })),
  );
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  const vehicles = useVehicles({ branchId });
  const vehicleOptions = useMemo(() => {
    const rows = (vehicles.data || []).map((vehicle) => ({
      value: String(vehicle.id),
      label: vehicle.label,
    }));
    // Xe đã ngừng dùng vẫn phải hiện khi sửa phiếu cũ.
    if (entry?.vehicle && !rows.some((row) => row.value === String(entry.vehicle?.id))) {
      rows.unshift({
        value: String(entry.vehicle.id),
        label: entry.vehicle.label,
      });
    }
    return rows;
  }, [entry, vehicles.data]);
  const userOptions = useMemo(
    () =>
      (users || []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [users],
  );

  const parsedAmount = parseNumber(amount);
  const parsedUnitPrice = parseNumber(unitPrice);
  const liters =
    kind === "FUEL" && parsedAmount && parsedUnitPrice
      ? parsedAmount / parsedUnitPrice
      : null;

  const handleUpload = async (groupKind: string, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingKind(groupKind);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [
        ...current,
        ...result.files.map((file) => ({ ...file, kind: groupKind })),
      ]);
      if (result.errors.length) {
        toast.error(`Có ${result.errors.length} file không upload được`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload hình ảnh thất bại",
      );
    } finally {
      setUploadingKind(null);
    }
  };

  const toggleService = (service: string) =>
    setServiceTypes((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vehicleId) {
      toast.error("Cần chọn xe");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Cần nhập số tiền hợp lệ");
      return;
    }
    if (kind === "VEHICLE_CARE" && !serviceTypes.length) {
      toast.error("Cần chọn ít nhất một loại dịch vụ");
      return;
    }
    const time = new Date(occurredAt);
    if (Number.isNaN(time.getTime())) {
      toast.error("Thời gian không hợp lệ");
      return;
    }
    const parsedOdo = parseNumber(odo);
    const common = {
      vehicleId: Number(vehicleId),
      occurredAt: time.toISOString(),
      location: location.trim(),
      amount: parsedAmount,
      payerId: payerId ? Number(payerId) : undefined,
      note: note.trim(),
      attachments,
    };

    if (entry) {
      updateEntry.mutate(
        {
          id: entry.id,
          payload: {
            ...common,
            odo: parsedOdo,
            ...(kind === "FUEL"
              ? { unitPrice: parsedUnitPrice }
              : { serviceTypes, dueAt: dueAt || null }),
          },
        },
        { onSuccess: onClose },
      );
      return;
    }
    const createCommon = {
      ...common,
      branchId,
      location: common.location || undefined,
      note: common.note || undefined,
      odo: parsedOdo ?? undefined,
    };
    if (kind === "FUEL") {
      createFuel.mutate(
        { ...createCommon, unitPrice: parsedUnitPrice ?? undefined },
        { onSuccess: onClose },
      );
    } else {
      createCare.mutate(
        { ...createCommon, serviceTypes, dueAt: dueAt || undefined },
        { onSuccess: onClose },
      );
    }
  };

  const pending =
    createFuel.isPending || createCare.isPending || updateEntry.isPending;
  const labelClass = "flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4">
      <form
        onSubmit={submit}
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? "Sửa phiếu xe" : "Tạo phiếu xe"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Phiếu tạo một khoản chi kho, được tổng hợp tuần cùng phiếu chi kho.
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <label className={labelClass}>
            Nhóm nghiệp vụ
            <select
              value={kind}
              disabled={isEdit}
              onChange={(event) => setKind(event.target.value as VehicleEntryKind)}
              className="dt-select h-10 w-full disabled:bg-gray-50">
              <option value="FUEL">Xăng dầu</option>
              <option value="VEHICLE_CARE">Chăm sóc xe</option>
            </select>
          </label>
          <label className={labelClass}>
            Chi nhánh
            <select
              value={branchId}
              disabled={isEdit}
              onChange={(event) => {
                setBranchId(Number(event.target.value));
                setVehicleId("");
              }}
              className="dt-select h-10 w-full disabled:bg-gray-50">
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Xe
            <select
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              className="dt-select h-10 w-full"
              required>
              <option value="">
                {vehicles.isLoading ? "Đang tải..." : "Chọn xe"}
              </option>
              {vehicleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!vehicles.isLoading && vehicleOptions.length === 0 && (
              <span className="font-normal text-amber-600">
                Chi nhánh chưa có xe. Thêm xe ở mục Danh sách xe.
              </span>
            )}
          </label>
          <label className={labelClass}>
            Thời gian
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="dt-input h-10 w-full"
              required
            />
          </label>
          <label className={labelClass}>
            {kind === "FUEL" ? "Số tiền" : "Chi phí (VNĐ)"}
            <input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="dt-input h-10 w-full"
              placeholder="0"
              required
            />
          </label>
          <label className={labelClass}>
            ODO
            <input
              inputMode="numeric"
              value={odo}
              onChange={(event) => setOdo(event.target.value)}
              className="dt-input h-10 w-full"
              placeholder="Số km trên đồng hồ"
            />
          </label>

          {kind === "FUEL" ? (
            <>
              <label className={labelClass}>
                Đơn giá
                <input
                  inputMode="numeric"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  className="dt-input h-10 w-full"
                  placeholder="đ/lít"
                />
              </label>
              <div className={labelClass}>
                Số lít
                <div className="flex h-10 items-center rounded-lg border bg-gray-50 px-3 text-sm font-normal text-gray-700">
                  {liters ? liters.toFixed(2) : "= Số tiền / Đơn giá"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={`${labelClass} sm:col-span-2`}>
                Loại dịch vụ
                <div className="flex flex-wrap gap-1.5">
                  {VEHICLE_SERVICE_TYPES.map((service) => {
                    const active = serviceTypes.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}>
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className={labelClass}>
                Hạn đăng kiểm / bảo hiểm
                <input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="dt-input h-10 w-full"
                />
              </label>
            </>
          )}

          <label className={labelClass}>
            Địa điểm
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="dt-input h-10 w-full"
            />
          </label>
          <div className={labelClass}>
            Người chi
            <FilterSearchableSelect
              options={userOptions}
              value={payerId}
              onChange={setPayerId}
              placeholder="Chọn người chi"
              searchPlaceholder="Tìm nhân viên..."
              allowDeselect={false}
              showClearOption={false}
            />
          </div>
          <label className={`${labelClass} sm:col-span-2`}>
            Ghi chú
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="dt-input w-full"
            />
          </label>

          {UPLOAD_GROUPS[kind].map((group) => {
            // Ảnh nhập từ trước chưa phân loại được xếp chung với hóa đơn.
            const files = attachments.filter(
              (file) =>
                file.kind === group.kind ||
                (group.kind === VEHICLE_ATTACHMENT_KIND.INVOICE &&
                  !UPLOAD_GROUPS[kind].some((item) => item.kind === file.kind)),
            );
            return (
              <div key={group.kind}>
                <div className="mb-1.5 text-xs font-medium text-gray-600">
                  {group.label}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {uploadingKind === group.kind ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Chụp / tải ảnh
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleUpload(group.kind, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {files.map((file) => (
                      <li
                        key={file.fileUrl}
                        className="flex items-center justify-between gap-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-brand hover:underline">
                          {file.fileName || file.fileUrl.split("/").pop()}
                        </a>
                        <button
                          type="button"
                          title="Bỏ file"
                          onClick={() =>
                            setAttachments((current) =>
                              current.filter(
                                (item) => item.fileUrl !== file.fileUrl,
                              ),
                            )
                          }
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-4">
          <span className="text-xs text-gray-500">
            {parsedAmount ? `${formatCurrency(parsedAmount)} đ` : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending || uploadingKind !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Lưu thay đổi" : "Tạo phiếu"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
