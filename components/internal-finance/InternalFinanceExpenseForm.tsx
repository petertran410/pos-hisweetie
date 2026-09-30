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
import { useCreateManualExpense } from "@/lib/hooks/useInternalFinance";
import { InternalFinanceDateField } from "./InternalFinanceDateField";

const BRANCH_IDS = [6, 1, 4, 7];

const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

export function InternalFinanceExpenseForm({
  onClose,
}: {
  onClose: () => void;
}) {
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
  const createExpense = useCreateManualExpense();
  const [branchId, setBranchId] = useState(selectedBranch?.id || 6);
  const [category, setCategory] = useState<"OTHER_EXPENSE" | "SALARY_ADVANCE">("OTHER_EXPENSE");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(toDateInput(new Date()));
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
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) {
      toast.error("Cần nhập số tiền và nội dung khoản chi");
      return;
    }
    createExpense.mutate(
      {
        branchId,
        category,
        amount: parsedAmount,
        occurredAt: `${occurredAt}T00:00:00.000Z`,
        description: description.trim(),
        attachments: attachments.map((file) => ({
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          kind: "EVIDENCE",
        })),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form onSubmit={submit} className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tạo phiếu chi nội bộ</h2>
            <p className="mt-0.5 text-xs text-gray-500">Khoản chi sẽ đi qua kiểm tra kế toán, quản lý và Approval tuần.</p>
          </div>
          <button type="button" title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Nhóm chi phí
            <select value={category} onChange={(event) => setCategory(event.target.value as "OTHER_EXPENSE" | "SALARY_ADVANCE")} className="dt-select rounded-lg">
              <option value="OTHER_EXPENSE">Chi phí khác</option>
              <option value="SALARY_ADVANCE">Tạm ứng lương</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Chi nhánh
            <select value={branchId} onChange={(event) => setBranchId(Number(event.target.value))} className="dt-select rounded-lg">
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Số tiền
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="dt-input rounded-lg" placeholder="0" required />
          </label>
          <InternalFinanceDateField
            label="Ngày chi"
            value={occurredAt}
            onChange={(value) => value && setOccurredAt(value)}
          />
          <label className="flex flex-col gap-1 text-xs text-gray-600 sm:col-span-2">
            Nội dung khoản chi
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="dt-input min-h-24 rounded-lg" required />
          </label>
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs text-gray-600">Chứng từ</div>
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
          <button type="submit" disabled={createExpense.isPending || uploading} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {createExpense.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo phiếu chi
          </button>
        </div>
      </form>
    </div>
  );
}
