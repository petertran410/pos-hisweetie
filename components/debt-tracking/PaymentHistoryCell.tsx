"use client";

import { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import {
  AppliedPaymentHistoryInfo,
  PAYMENT_HISTORY_LABELS,
  PaymentHistory,
} from "@/lib/api/debt-tracking";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { debtTrackingApi } from "@/lib/api/debt-tracking";
import { toast } from "sonner";

const STYLE: Record<PaymentHistory, string> = {
  ON_TIME: "bg-green-50 text-green-700 border-green-200",
  SLIGHT_LATE: "bg-amber-50 text-amber-700 border-amber-200",
  OFTEN_LATE: "bg-orange-50 text-orange-700 border-orange-200",
  HIGH_RISK: "bg-red-50 text-red-700 border-red-200",
};

export function PaymentHistoryCell({
  customerId,
  value,
  canOverride,
}: {
  customerId: number;
  value: AppliedPaymentHistoryInfo;
  canOverride: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<PaymentHistory>(value.applied);
  const [reason, setReason] = useState("");

  const update = useMutation({
    mutationFn: () =>
      debtTrackingApi.updatePaymentHistory(customerId, {
        paymentHistoryOverride: history,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debt-tracking"] });
      setEditing(false);
      setReason("");
      toast.success("Đã cập nhật đánh giá thanh toán");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại"),
  });

  if (editing) {
    return (
      <div className="min-w-[220px] space-y-1">
        <select
          value={history}
          onChange={(e) => setHistory(e.target.value as PaymentHistory)}
          className="w-full border rounded px-2 py-1 text-xs"
        >
          {(Object.keys(PAYMENT_HISTORY_LABELS) as PaymentHistory[]).map((k) => (
            <option key={k} value={k}>
              {PAYMENT_HISTORY_LABELS[k]}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do chỉnh tay (bắt buộc)"
          className="w-full border rounded px-2 py-1 text-xs"
        />
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => setEditing(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!reason.trim() || update.isPending}
            onClick={() => update.mutate()}
            className="p-1 text-brand hover:bg-brand/10 rounded disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group min-w-[145px]">
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex px-2 py-0.5 text-xs rounded-full border ${STYLE[value.applied]}`}
          title={value.auto.reason}
        >
          {PAYMENT_HISTORY_LABELS[value.applied]}
        </span>
        {canOverride && (
          <button
            onClick={() => {
              setHistory(value.applied);
              setEditing(true);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded"
            title="Chỉnh đánh giá"
          >
            <Pencil className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5" title={value.auto.reason}>
        {value.isOverridden ? "Đã chỉnh tay" : `Tự tính · ${value.auto.sampleSize} HĐ`}
      </div>
    </div>
  );
}
