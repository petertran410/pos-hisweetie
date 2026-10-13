"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Lock, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";
import type { FinanceSyncStepKey } from "@/lib/api/internal-finance";
import {
  useFinanceCutover,
  useFinanceSync,
} from "@/lib/hooks/useInternalFinance";

const STEP_LABELS: Record<FinanceSyncStepKey, string> = {
  EXPENSES: "Phiếu chi kho & xe cộ",
  WEEKLY_APPROVALS: "Approval tuần",
  WAREHOUSE_CASH: "Tiền mặt kho",
  FUND_LEDGER: "Sổ quỹ",
  DOCUMENTS: "Chứng từ đính kèm",
};

export function FinanceSyncButton() {
  const sync = useFinanceSync();
  const cutover = useFinanceCutover();
  const [open, setOpen] = useState(false);

  const toggleCutover = async () => {
    const locking = !cutover.locked;
    const result = await Swal.fire({
      title: locking ? "Chốt chuyển đổi?" : "Mở lại đồng bộ dữ liệu?",
      text: locking
        ? "Từ lúc này POS là sổ chính: khóa đồng bộ dữ liệu cũ và ngừng đẩy phí báo đơn sang hệ thống cũ."
        : "Đồng bộ lại sau khi đã dùng POS thật có thể làm trùng tiền mặt kho và sổ quỹ.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: locking ? "Chốt chuyển đổi" : "Mở lại",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: locking ? "#0f766e" : "#dc2626",
    });
    if (result.isConfirmed) cutover.set(locking);
  };
  const steps = sync.status?.steps || [];
  const started = Boolean(sync.status?.startedAt);

  return (
    <div className="relative flex items-center gap-2">
      {cutover.locked ? (
        <span
          className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700"
          title={
            cutover.cutoverAt
              ? `Chốt lúc ${new Date(cutover.cutoverAt).toLocaleString("vi-VN")}`
              : undefined
          }>
          <Lock className="h-4 w-4" />
          Đã chốt chuyển đổi
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            if (!sync.running) sync.start();
          }}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <RefreshCw
            className={`h-4 w-4 ${sync.running ? "animate-spin" : ""}`}
          />
          {sync.running ? "Đang đồng bộ…" : "Đồng bộ dữ liệu"}
        </button>
      )}
      {!sync.running && (
        <button
          type="button"
          onClick={toggleCutover}
          disabled={cutover.pending}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {cutover.locked ? "Mở lại đồng bộ" : "Chốt chuyển đổi"}
        </button>
      )}
      {open && started && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Tiến độ đồng bộ
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:underline">
              Đóng
            </button>
          </div>
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.key} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5">
                  {step.state === "RUNNING" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  ) : step.state === "DONE" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : step.state === "FAILED" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <span className="block h-4 w-4 rounded-full border" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-gray-900">
                    {STEP_LABELS[step.key]}
                  </span>
                  {step.state === "FAILED" ? (
                    <span className="block break-words text-xs text-red-600">
                      {step.error}
                    </span>
                  ) : step.state !== "PENDING" ? (
                    <span className="block text-xs text-gray-500">
                      {step.key === "DOCUMENTS"
                        ? `Đã tải ${step.created}/${step.fetched}${step.skipped ? ` · lỗi ${step.skipped}` : ""}`
                        : `Đọc ${step.fetched} · thêm ${step.created} · cập nhật ${step.updated} · bỏ qua ${step.skipped}`}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
