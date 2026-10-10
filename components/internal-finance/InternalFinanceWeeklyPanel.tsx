"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCan } from "@/lib/hooks/useCan";
import {
  useCreateWeeklyApproval,
  useInternalFinanceWeeklyBatch,
  useInternalFinanceWeeklyBatches,
  usePrepareWeeklyBatch,
} from "@/lib/hooks/useInternalFinance";
import { InternalFinanceDateField } from "./InternalFinanceDateField";

const BRANCH_IDS = [6, 1, 4, 7];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng tạo Approval",
  IN_APPROVAL: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  POSTED: "Đã xử lý",
};

const toDateInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return result;
};

function asBranches(payload: unknown) {
  if (Array.isArray(payload)) return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

export function InternalFinanceWeeklyPanel({
  onClose,
  initialBatchId,
}: {
  onClose: () => void;
  initialBatchId?: number | null;
}) {
  const { data: branchData } = useBranches();
  const branches = useMemo(
    () => asBranches(branchData).filter((branch) => BRANCH_IDS.includes(branch.id)),
    [branchData],
  );
  const canUpdate = useCan("cash_flows", "update");
  const canCreate = useCan("cash_flows", "create");
  const today = useMemo(() => new Date(), []);
  const [branchId, setBranchId] = useState(6);
  const [weekStart, setWeekStart] = useState(toDateInput(startOfWeek(today)));
  const [weekEnd, setWeekEnd] = useState(toDateInput(endOfWeek(today)));
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(
    initialBatchId || null,
  );

  const batches = useInternalFinanceWeeklyBatches({
    branchIds: [branchId],
    fromDate: weekStart,
    toDate: weekEnd,
    limit: 20,
  });
  const selectedBatch = useInternalFinanceWeeklyBatch(selectedBatchId);
  const prepare = usePrepareWeeklyBatch();
  const createApproval = useCreateWeeklyApproval();

  const prepareBatch = () => {
    prepare.mutate(
      { branchId, weekStart, weekEnd },
      {
        onSuccess: (batch) => {
          setSelectedBatchId(batch.id);
        },
      },
    );
  };

  const createWeeklyApproval = (batchId: number) => {
    createApproval.mutate(
      { id: batchId },
      {
        onSuccess: () => setSelectedBatchId(batchId),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
      <div className="flex h-full w-full max-w-xl flex-col border-l bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Tổng hợp Approval tuần
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Chỉ tổng hợp và gửi Approval. Không tạo phiếu chi hoặc CashFlow.
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
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Chi nhánh
              <select
                value={branchId}
                onChange={(event) => {
                  setBranchId(Number(event.target.value));
                  setSelectedBatchId(null);
                }}
                className="dt-select rounded-lg">
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
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
          <button
            type="button"
            onClick={prepareBatch}
            disabled={!canUpdate || prepare.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {prepare.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Chuẩn bị tổng hợp tuần
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Các batch trong khoảng thời gian
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
                    <span className="block truncate font-medium text-gray-900">
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
              Chưa có batch đủ điều kiện trong khoảng này
            </div>
          )}

          {selectedBatch.data && (
            <div className="mt-5 border-t pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedBatch.data.code}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Tổng chi:{" "}
                    <strong>{formatCurrency(selectedBatch.data.totalAmount)}</strong>
                  </p>
                </div>
                {selectedBatch.data.status === "READY" && canCreate && (
                  <button
                    type="button"
                    onClick={() => createWeeklyApproval(selectedBatch.data!.id)}
                    disabled={createApproval.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                    {createApproval.isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Tạo Approval tuần
                  </button>
                )}
              </div>
              {selectedBatch.data.status === "APPROVED" && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                  <Check className="h-4 w-4 shrink-0" />
                  Approval đã duyệt. Hãy đánh dấu Đã chi từng khoản ở bảng chính.
                </div>
              )}
              <div className="mt-4 divide-y rounded-lg border">
                {selectedBatch.data.entries?.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {entry.code}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {[
                          entry.description || "Khoản chi nội bộ",
                          entry.expenseItem,
                          entry.payer?.name && `Người chi: ${entry.payer.name}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
