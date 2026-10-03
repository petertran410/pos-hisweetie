"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Loader2, Plus, Send, X } from "lucide-react";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import {
  useCreateWarehouseExpenseApproval,
  usePrepareWarehouseExpenseBatch,
  useWarehouseExpenseBatch,
  useWarehouseExpenseBatches,
} from "@/lib/hooks/useInternalFinance";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng gửi",
  IN_APPROVAL: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  POSTED: "Đã ghi sổ",
};

const toDateInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
};

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return result;
};

export function WarehouseExpenseApprovalModal({
  branchId,
  canPrepare,
  canSubmit,
  onClose,
}: {
  branchId: number;
  canPrepare: boolean;
  canSubmit: boolean;
  onClose: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(toDateInput(startOfWeek(today)));
  const [weekEnd, setWeekEnd] = useState(toDateInput(endOfWeek(today)));
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const batches = useWarehouseExpenseBatches({
    branchIds: [branchId],
    fromDate: weekStart,
    toDate: weekEnd,
    limit: 20,
  });
  const selectedBatch = useWarehouseExpenseBatch(selectedBatchId);
  const prepare = usePrepareWarehouseExpenseBatch();
  const createApproval = useCreateWarehouseExpenseApproval();

  const prepareBatch = () => {
    prepare.mutate(
      { branchId, weekStart, weekEnd },
      {
        onSuccess: (batch) => setSelectedBatchId(batch.id),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
      <div className="flex h-full w-full max-w-2xl flex-col border-l bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Tổng hợp & gửi Approval
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Gom khoản chi trong kỳ thành một phiếu trình duyệt Lark.
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

        <div className="border-b p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
              Chi nhánh
              <div className="dt-input flex h-10 items-center bg-gray-50">
                {branchId === 6
                  ? "Kho Hà Nội"
                  : branchId === 1
                    ? "Kho Sài Gòn"
                    : "Văn phòng"}
              </div>
            </div>
            <InternalFinanceDateField
              label="Từ ngày"
              value={weekStart}
              onChange={(value) => value && setWeekStart(value)}
            />
            <InternalFinanceDateField
              label="Đến ngày"
              value={weekEnd}
              onChange={(value) => value && setWeekEnd(value)}
            />
          </div>
          {canPrepare && (
            <button
              type="button"
              onClick={prepareBatch}
              disabled={prepare.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {prepare.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tổng hợp tuần
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Batch trong kỳ
          </div>
          {batches.isLoading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : batches.data?.length ? (
            <div className="space-y-2">
              {batches.data.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedBatchId === batch.id
                      ? "border-brand bg-brand-soft"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-sm font-medium text-gray-900">
                      {batch.code}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {batch._count?.entries || 0} khoản ·{" "}
                      {formatCurrency(batch.totalAmount)}
                    </span>
                  </span>
                  <span className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
                      {STATUS_LABELS[batch.status] || batch.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              Chưa có batch trong khoảng này
            </div>
          )}

          {selectedBatch.data && (
            <div className="mt-5 border-t pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-gray-900">
                    {selectedBatch.data.code}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Tổng chi:{" "}
                    <strong>{formatCurrency(selectedBatch.data.totalAmount)}</strong>
                  </p>
                </div>
                {selectedBatch.data.status === "READY" && canSubmit && (
                  <button
                    type="button"
                    onClick={() =>
                      createApproval.mutate({ id: selectedBatch.data!.id })
                    }
                    disabled={createApproval.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                    {createApproval.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Tạo Approval Lark
                  </button>
                )}
              </div>
              {selectedBatch.data.status === "APPROVED" && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                  <Check className="h-4 w-4 shrink-0" />
                  Approval đã duyệt. Nhân sự kho có thể xác nhận Đã chi.
                </div>
              )}
              <div className="mt-4 divide-y rounded-lg border">
                {selectedBatch.data.entries?.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {entry.description || entry.code}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {entry.code}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-red-600">
                      -{formatCurrency(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
