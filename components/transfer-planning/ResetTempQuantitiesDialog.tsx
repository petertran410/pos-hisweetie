"use client";

import React from "react";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transferPlanningApi } from "@/lib/api/transfer-planning";

interface ResetTempQuantitiesDialogProps {
  onClose: () => void;
}

export function ResetTempQuantitiesDialog({
  onClose,
}: ResetTempQuantitiesDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: transferPlanningApi.resetTempQuantities,
    onSuccess: ({ resetCount }) => {
      queryClient.invalidateQueries({ queryKey: ["transfer-planning"] });
      queryClient.invalidateQueries({
        queryKey: ["transfer-temp-quantities"],
      });
      toast.success(
        `Đã đặt lại ${resetCount.toLocaleString("vi-VN")} SKU về 0.`,
      );
      onClose();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Không thể đặt lại Tạm chuyển",
      );
    },
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!mutation.isPending ? onClose : undefined}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            Đặt lại Tạm chuyển?
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm leading-6 text-gray-700">
              Toàn bộ số lượng <strong>Tạm chuyển</strong> đã lưu của bạn trên
              tuyến <strong>Kho Hà Nội → Kho Sài Gòn</strong> sẽ được đưa về 0,
              bao gồm cả SKU ngoài trang và bộ lọc hiện tại.
            </p>
            <p className="mt-2 text-xs font-medium text-amber-700">
              Thao tác này không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 rounded-b-xl border-t border-gray-200 bg-gray-50 px-5 py-4">
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
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Đặt lại về 0
          </button>
        </div>
      </div>
    </div>
  );
}
