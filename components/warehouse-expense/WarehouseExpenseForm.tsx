"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type {
  InternalFinanceAttachment,
  InternalFinanceEntry,
  WarehouseExpenseInput,
} from "@/lib/api/internal-finance";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateWarehouseExpense,
  useUpdateWarehouseExpense,
} from "@/lib/hooks/useInternalFinance";
import { uploadPackingSlipExpenseFiles } from "@/lib/hooks/usePackingSlips";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { toDateInput, vnDateKey, vnDayIso } from "@/lib/internal-finance/dates";
import { WAREHOUSE_EXPENSE_ITEMS } from "@/lib/internal-finance/vehicle-constants";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
};

const numberText = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : String(Number(value));

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
        return user?.permissions?.includes(action) ||
          user?.permissions?.includes(`internal_fund:create_expense_${scopeForBranch(branch.id)}`);
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
    expense ? vnDateKey(expense.occurredAt) : toDateInput(new Date()),
  );
  const [description, setDescription] = useState(expense?.description || "");
  const [expenseItem, setExpenseItem] = useState(expense?.expenseItem || "");
  const [quantity, setQuantity] = useState(numberText(expense?.quantity));
  const [unitPrice, setUnitPrice] = useState(numberText(expense?.unitPrice));
  const [note, setNote] = useState(expense?.note || "");
  const [payerId, setPayerId] = useState(
    String(expense?.payerId ?? user?.id ?? ""),
  );
  // Backend thay toàn bộ danh sách chứng từ khi sửa, nên nạp sẵn file cũ.
  const [attachments, setAttachments] = useState<InternalFinanceAttachment[]>(
    () =>
      (expense?.attachments || []).map((file) => ({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        kind: file.kind || "EVIDENCE",
      })),
  );
  const [uploading, setUploading] = useState(false);
  const { data: users } = useUsersForFilter();
  const userOptions = useMemo(
    () =>
      (users || []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [users],
  );
  const parsedQuantity = parseNumber(quantity);
  const parsedUnitPrice = parseNumber(unitPrice);
  const lineTotal =
    parsedQuantity !== null && parsedUnitPrice !== null
      ? Math.round(parsedQuantity * parsedUnitPrice * 100) / 100
      : null;

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      setAttachments((current) => [
        ...current,
        ...result.files.map((file) => ({ ...file, kind: "EVIDENCE" })),
      ]);
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
    if ((parsedQuantity === null) !== (parsedUnitPrice === null)) {
      toast.error("Cần nhập cả số lượng và đơn giá, hoặc bỏ trống cả hai");
      return;
    }
    const parsedAmount = lineTotal ?? parseNumber(amount);
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) {
      toast.error("Cần nhập số tiền và nội dung khoản chi");
      return;
    }
    const fields = {
      // Có Số lượng × Đơn giá thì backend tự tính thành tiền.
      amount: lineTotal === null ? parsedAmount : undefined,
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      occurredAt: vnDayIso(occurredAt),
      description: description.trim(),
      expenseItem: expenseItem || undefined,
      payerId: payerId ? Number(payerId) : undefined,
      attachments,
    };
    if (expense) {
      updateExpense.mutate(
        { id: expense.id, payload: { ...fields, note: note.trim() } },
        { onSuccess: onClose },
      );
      return;
    }
    const payload: WarehouseExpenseInput = {
      ...fields,
      branchId: selectedBranchId,
      quantity: parsedQuantity ?? undefined,
      unitPrice: parsedUnitPrice ?? undefined,
      note: note.trim() || undefined,
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
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
            Khoản mục
            <select
              value={expenseItem}
              onChange={(event) => setExpenseItem(event.target.value)}
              className="dt-select h-10 w-full">
              <option value="">Chọn khoản mục</option>
              {expenseItem &&
                !(WAREHOUSE_EXPENSE_ITEMS as readonly string[]).includes(
                  expenseItem,
                ) && <option value={expenseItem}>{expenseItem}</option>}
              {WAREHOUSE_EXPENSE_ITEMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
            Số lượng
            <input
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="dt-input h-10 w-full"
              placeholder="Không bắt buộc"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
            Đơn giá
            <input
              inputMode="decimal"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="dt-input h-10 w-full"
              placeholder="Không bắt buộc"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
            {lineTotal === null ? "Số tiền" : "Thành tiền"}
            <input
              inputMode="decimal"
              value={lineTotal === null ? amount : formatCurrency(lineTotal)}
              onChange={(event) => setAmount(event.target.value)}
              readOnly={lineTotal !== null}
              className="dt-input h-10 w-full read-only:bg-gray-50"
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
              rows={3}
              className="dt-input w-full"
              required
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
            Ghi chú
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="dt-input h-10 w-full"
            />
          </label>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
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
                  <div
                    key={file.fileUrl}
                    className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {file.fileName || file.fileUrl}
                    </span>
                    <button
                      type="button"
                      title="Bỏ file"
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.fileUrl !== file.fileUrl),
                        )
                      }
                      className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
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
            disabled={
              createExpense.isPending || updateExpense.isPending || uploading
            }
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {(createExpense.isPending || updateExpense.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
              {expense ? "Lưu thay đổi" : "Tạo khoản chi"}
          </button>
        </div>
      </form>
    </div>
  );
}
