"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  uploadPackingSlipExpenseFiles,
  type UploadedExpenseFile,
} from "@/lib/hooks/usePackingSlips";
import { useBranchStore } from "@/lib/store/branch";
import {
  useCreateFuelEntry,
  useCreateVehicleCareEntry,
} from "@/lib/hooks/useInternalFinance";
import { InternalFinanceDateField } from "./InternalFinanceDateField";

const BRANCH_IDS = [6, 1, 4, 7];

const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

export function VehicleFinanceForm({ onClose }: { onClose: () => void }) {
  const { data: branchData } = useBranches();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branches = useMemo(
    () => {
      const payload = branchData as
        | { data?: Array<{ id: number; name: string }> }
        | Array<{ id: number; name: string }>
        | undefined;
      const rows = Array.isArray(payload) ? payload : payload?.data || [];
      return rows.filter((branch) => BRANCH_IDS.includes(branch.id));
    },
    [branchData],
  );
  const createFuel = useCreateFuelEntry();
  const createCare = useCreateVehicleCareEntry();
  const [kind, setKind] = useState<"FUEL" | "VEHICLE_CARE">("FUEL");
  const [branchId, setBranchId] = useState(selectedBranch?.id || 6);
  const [vehicle, setVehicle] = useState("");
  const [occurredAt, setOccurredAt] = useState(toDateInput(new Date()));
  const [amount, setAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [liters, setLiters] = useState("");
  const [odo, setOdo] = useState("");
  const [consumptionLimit, setConsumptionLimit] = useState("");
  const [anomalyNote, setAnomalyNote] = useState("");
  const [location, setLocation] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedExpenseFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [...current, ...result.files]);
      if (result.errors.length) toast.error(`Có ${result.errors.length} file không upload được`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload chứng từ thất bại");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/[^\d.-]/g, ""));
    if (!vehicle.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Cần nhập xe và số tiền hợp lệ");
      return;
    }
    const files = attachments.map((file) => ({
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      kind: "EVIDENCE",
    }));
    const common = {
      branchId,
      vehicle: vehicle.trim(),
      occurredAt: `${occurredAt}T00:00:00.000Z`,
      amount: parsedAmount,
      odo: odo ? Number(odo) : undefined,
      anomalyNote: anomalyNote.trim() || undefined,
      description: description.trim() || undefined,
      attachments: files,
    };

    if (kind === "FUEL") {
      createFuel.mutate(
        {
          ...common,
          location: location.trim() || undefined,
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          liters: liters ? Number(liters) : undefined,
          consumptionLimit: consumptionLimit ? Number(consumptionLimit) : undefined,
        },
        { onSuccess: onClose },
      );
    } else {
      if (!serviceType.trim()) {
        toast.error("Cần nhập loại dịch vụ");
        return;
      }
      createCare.mutate(
        {
          ...common,
          serviceType: serviceType.trim(),
          dueAt: dueAt ? `${dueAt}T00:00:00.000Z` : undefined,
        },
        { onSuccess: onClose },
      );
    }
  };

  const pending = createFuel.isPending || createCare.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form onSubmit={submit} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tạo phiếu xe</h2>
            <p className="mt-0.5 text-xs text-gray-500">Phiếu sẽ tạo một dòng chi nội bộ theo chi nhánh.</p>
          </div>
          <button type="button" title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Nhóm nghiệp vụ
            <select value={kind} onChange={(event) => setKind(event.target.value as "FUEL" | "VEHICLE_CARE")} className="dt-select rounded-lg">
              <option value="FUEL">Xăng dầu</option>
              <option value="VEHICLE_CARE">Chăm sóc xe</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Chi nhánh
            <select value={branchId} onChange={(event) => setBranchId(Number(event.target.value))} className="dt-select rounded-lg">
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Xe
            <input value={vehicle} onChange={(event) => setVehicle(event.target.value)} className="dt-input rounded-lg" placeholder="Biển số hoặc mã xe" required />
          </label>
          <InternalFinanceDateField
            label="Thời gian"
            value={occurredAt}
            onChange={(value) => value && setOccurredAt(value)}
          />
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Số tiền
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="dt-input rounded-lg" placeholder="0" required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            ODO
            <input inputMode="decimal" value={odo} onChange={(event) => setOdo(event.target.value)} className="dt-input rounded-lg" placeholder="Không bắt buộc" />
          </label>

          {kind === "FUEL" ? (
            <>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Địa điểm
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="dt-input rounded-lg" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Đơn giá
                <input inputMode="decimal" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="dt-input rounded-lg" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Số lít
                <input inputMode="decimal" value={liters} onChange={(event) => setLiters(event.target.value)} className="dt-input rounded-lg" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Định mức tiêu hao
                <input inputMode="decimal" value={consumptionLimit} onChange={(event) => setConsumptionLimit(event.target.value)} className="dt-input rounded-lg" />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Loại dịch vụ
                <input value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="dt-input rounded-lg" required />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                Địa điểm
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="dt-input rounded-lg" />
              </label>
              <InternalFinanceDateField
                label="Hạn kiểm tra tiếp"
                value={dueAt}
                onChange={(value) => setDueAt(value || "")}
              />
            </>
          )}

          <label className="flex flex-col gap-1 text-xs text-gray-600 sm:col-span-2">
            Kiểm tra bất thường
            <input value={anomalyNote} onChange={(event) => setAnomalyNote(event.target.value)} className="dt-input rounded-lg" placeholder="Ghi chú khi vượt định mức hoặc có dấu hiệu bất thường" />
          </label>

          <label className="flex flex-col gap-1 text-xs text-gray-600 sm:col-span-2">
            Ghi chú
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="dt-input min-h-20 rounded-lg" />
          </label>
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs text-gray-600">Hóa đơn / hình ảnh</div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Tải chứng từ
              <input type="file" multiple className="hidden" onChange={(event) => void handleUpload(event.target.files)} />
            </label>
            {attachments.length > 0 && <div className="mt-2 space-y-1 text-xs text-gray-600">{attachments.map((file) => <div key={file.fileUrl} className="truncate">{file.fileName}</div>)}</div>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
          <button type="submit" disabled={pending || uploading} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo phiếu
          </button>
        </div>
      </form>
    </div>
  );
}
