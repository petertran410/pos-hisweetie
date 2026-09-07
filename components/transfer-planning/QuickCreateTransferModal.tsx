"use client";

import React, { useMemo, useState } from "react";
import { FileText, Loader2, Plus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  transferPlanningApi,
  useTempTransferDrafts,
} from "@/lib/api/transfer-planning";
import { transfersApi, type DraftTransferCandidate } from "@/lib/api/transfers";
import {
  formatNumber,
  formatWholeQuantity,
} from "@/lib/utils/transfer-planning-calc";
import { TransferPreviewPopup } from "./TransferPreviewPopup";

interface QuickCreateTransferModalProps {
  onClose: () => void;
}

export function QuickCreateTransferModal({
  onClose,
}: QuickCreateTransferModalProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useTempTransferDrafts();
  const [deselectedIds, setDeselectedIds] = useState<Set<number>>(new Set());
  const [targetId, setTargetId] = useState<number | "new">("new");
  const [previewTransferId, setPreviewTransferId] = useState<number | null>(
    null,
  );
  const items = useMemo(() => data?.data ?? [], [data]);

  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["transfer-draft-candidates"],
    queryFn: transfersApi.getDraftCandidates,
    staleTime: 30_000,
  });
  const candidates: DraftTransferCandidate[] = candidatesData?.data ?? [];
  const selectedItems = useMemo(
    () =>
      items.filter((item) => !deselectedIds.has(item.id) && item.tempQty > 0),
    [items, deselectedIds],
  );
  const totalQuantity = selectedItems.reduce(
    (sum, item) => sum + item.tempQty,
    0,
  );
  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === targetId,
  );

  const mutation = useMutation({
    mutationFn: () =>
      transferPlanningApi.quickCreate({
        productIds: selectedItems.map((item) => item.id),
        transferId: targetId === "new" ? undefined : targetId,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-planning"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-temp-quantities"] });
      queryClient.invalidateQueries({
        queryKey: ["transfer-draft-candidates"],
      });
      toast.success(
        result.createdNew
          ? `Đã tạo đơn chuyển kho ${result.transfer.code} với ${result.itemCount} SKU.`
          : `Đã thêm ${result.itemCount} SKU vào phiếu ${result.transfer.code}.`,
      );
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo đơn chuyển kho",
      );
    },
  });

  const toggleAll = (checked: boolean) => {
    setDeselectedIds(
      checked ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!mutation.isPending ? onClose : undefined}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Tạo đơn chuyển kho nhanh
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Kho Hà Nội → Kho Sài Gòn
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-52 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải SKU đã lưu...
            </div>
          ) : isError ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 text-sm text-red-600">
              Không thể tải danh sách Tạm chuyển.
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded border px-3 py-1.5 text-gray-700"
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-gray-500">
              Không còn SKU nào có Tạm chuyển lớn hơn 0.
            </div>
          ) : (
            <>
              <div className="max-h-[44vh] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-semibold text-gray-700">
                    <tr>
                      <th className="w-14 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả"
                          checked={deselectedIds.size === 0}
                          ref={(input) => {
                            if (input)
                              input.indeterminate =
                                deselectedIds.size > 0 &&
                                deselectedIds.size < items.length;
                          }}
                          onChange={(event) => toggleAll(event.target.checked)}
                        />
                      </th>
                      <th className="px-3 py-3 text-left">SKU</th>
                      <th className="px-3 py-3 text-left">Tên sản phẩm</th>
                      <th className="px-3 py-3 text-right">SL đề xuất</th>
                      <th className="px-3 py-3 text-right">Tạm chuyển</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${item.sku}`}
                            checked={!deselectedIds.has(item.id)}
                            onChange={(event) =>
                              setDeselectedIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                          {item.sku}
                        </td>
                        <td
                          className="max-w-md truncate px-3 py-2.5 text-gray-800"
                          title={item.name}
                        >
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatNumber(item.computed.suggestedQuantity, 1)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900">
                          {formatWholeQuantity(item.tempQty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold text-gray-600">
                  Chọn phiếu đích
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTargetId("new")}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left ${targetId === "new" ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <Plus className="h-4 w-4 text-brand" />
                    <span className="text-sm font-medium">
                      Tạo phiếu chuyển mới
                    </span>
                  </button>
                  {isLoadingCandidates ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải phiếu...
                    </div>
                  ) : (
                    candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setTargetId(candidate.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left ${targetId === candidate.id ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="min-w-0 flex-1">
                          <span
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewTransferId(candidate.id);
                            }}
                            className="block truncate text-sm font-medium text-brand hover:underline"
                          >
                            {candidate.code}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {candidate.itemCount} mặt hàng
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Đã chọn <strong>{selectedItems.length}</strong> SKU • Tổng SL
            chuyển: <strong>{formatWholeQuantity(totalQuantity)}</strong>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={selectedItems.length === 0 || mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {targetId === "new"
                ? "Tạo đơn chuyển"
                : `Thêm vào phiếu ${selectedCandidate?.code || ""}`}
            </button>
          </div>
        </div>
      </div>
      {previewTransferId !== null && (
        <TransferPreviewPopup
          transferId={previewTransferId}
          onClose={() => setPreviewTransferId(null)}
        />
      )}
    </div>
  );
}
