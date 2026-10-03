"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import type {
  InternalFinanceEntry,
  WarehouseExpenseInput,
} from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateWarehouseExpense,
  useUpdateWarehouseExpense,
} from "@/lib/hooks/useInternalFinance";
import {
  uploadPackingSlipExpenseFiles,
  type UploadedExpenseFile,
} from "@/lib/hooks/usePackingSlips";
import { useAuthStore } from "@/lib/store/auth";

const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const scopeForBranch = (branchId: number) =>
  branchId === 6 ? "hn" : branchId === 1 ? "sg" : "vp";

function asBranches(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as Array<{ id: number; name: string }>;
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

export function WarehouseExpenseForm({
  branchId,
  expense,
  onClose,
}: {
  branchId: number;
  expense?: InternalFinanceEntry | null;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter((branch) => {
        if (![1, 4, 6, 7].includes(branch.id)) return false;
        if (user?.roles?.includes("Super Admin")) return true;
        const action = `warehouse_expense:create_${scopeForBranch(branch.id)}`;
        return user?.permissions?.includes(action);
      }),
    [branchData, user],
  );
  const createExpense = useCreateWarehouseExpense();
  const updateExpense = useUpdateWarehouseExpense();
  const [selectedBranchId, setSelectedBranchId] = useState(
    branches.some((branch) => branch.id === branchId)
      ? branchId
      : branches[0]?.id || branchId,
  );
  const [amount, setAmount] = useState(
    expense ? String(Math.round(Number(expense.amount))) : "",
  );
  const [occurredAt, setOccurredAt] = useState(
    expense ? toDateInput(new Date(expense.occurredAt)) : toDateInput(new Date()),
  );
  const [description, setDescription] = useState(expense?.description || "");
  const [attachments, setAttachments] = useState<UploadedExpenseFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [...current, ...result.files]);
      if (result.errors.length) {
        toast.error(`Có ${result.errors.length} file không upload được`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload chứng từ thất bại",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/[^\d.-]/g, ""));
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !description.trim()
    ) {
      toast.error("Cần nhập số tiền và nội dung khoản chi");
      return;
    }
    const attachmentsPayload = attachments.map((file) => ({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        kind: "EVIDENCE",
    }));
    if (expense) {
      updateExpense.mutate(
        {
          id: expense.id,
          payload: {
            amount: parsedAmount,
            occurredAt: `${occurredAt}T00:00:00.000Z`,
            description: description.trim(),
            ...(attachments.length ? { attachments: attachmentsPayload } : {}),
          },
        },
        { onSuccess: onClose },
      );
      return;
    }
    const payload: WarehouseExpenseInput = {
      branchId: selectedBranchId,
      amount: parsedAmount,
      occurredAt: `${occurredAt}T00:00:00.000Z`,
      description: description.trim(),
      attachments: attachmentsPayload,
    };
    createExpense.mutate(payload, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form
        onSubmit={submit}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {expense ? "Sửa khoản chi" : "Tạo khoản chi khác"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Khoản chi sẽ được tổng hợp tuần và gửi Approval Lark.
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
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
            Chi nhánh
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(Number(event.target.value))}
              className="dt-select h-10 w-full">
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
            Số tiền
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="dt-input h-10 w-full"
              placeholder="0"
              required
            />
          </label>
          <InternalFinanceDateField
            label="Ngày chi"
            value={occurredAt}
            onChange={(value) => value && setOccurredAt(value)}
          />
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
            Nội dung khoản chi
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="dt-input w-full"
              required
            />
          </label>
          <div className="sm:col-span-2">
            <div className="mb-1.5 text-xs font-medium text-gray-600">
              Chứng từ
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Tải chứng từ
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => void handleUpload(event.target.files)}
              />
            </label>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                {attachments.map((file) => (
                  <div key={file.fileUrl} className="truncate">
                    {file.fileName || file.fileUrl}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="submit"
            disabled={createExpense.isPending || uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {createExpense.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
              {expense ? "Lưu thay đổi" : "Tạo khoản chi"}
          </button>
        </div>
      </form>
    </div>
  );
}
