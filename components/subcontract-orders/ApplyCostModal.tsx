"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  useApplySubcontractCost,
  useSubcontractCostPreview,
} from "@/lib/hooks/useSubcontractOrders";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { SubcontractOrder } from "@/lib/types/subcontract-order";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  Field,
  INPUT_CLASS,
  ModalShell,
} from "./ModalShell";

const cost2 = (v: number) => formatCurrency(Math.round(v * 100) / 100);

/**
 * Bước xác nhận ghi giá thành gia công vào giá vốn thành phẩm. Hệ thống đề
 * xuất giá bình quân gia quyền với tồn cũ; người dùng có thể sửa trước khi áp.
 */
export function ApplyCostModal({
  order,
  onClose,
}: {
  order: SubcontractOrder;
  onClose: () => void;
}) {
  const {
    data: preview,
    isLoading,
    error,
  } = useSubcontractCostPreview(order.id);
  const apply = useApplySubcontractCost();

  // null = người dùng chưa sửa → dùng giá đề xuất.
  const [editedCost, setEditedCost] = useState<number | null>(null);
  const newCost = editedCost ?? preview?.proposedCost ?? 0;
  const [scope, setScope] = useState<"receiveBranch" | "allBranches">(
    "receiveBranch",
  );

  const otherBranches = preview?.branches.filter((b) => !b.isReceiveBranch);

  const handleSubmit = () => {
    if (!preview) return;
    apply.mutate(
      {
        id: order.id,
        data: { newCost, scope, expectedOldCost: preview.oldCost },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalShell
      title={`Áp giá vốn thành phẩm — ${order.code}`}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Để sau
          </button>
          <button
            onClick={handleSubmit}
            disabled={!preview || newCost <= 0 || apply.isPending}
            className={BTN_PRIMARY}>
            {apply.isPending ? "Đang ghi..." : "Xác nhận áp giá vốn"}
          </button>
        </>
      }>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Đang tính giá vốn...
        </div>
      ) : !preview ? (
        <p className="text-sm text-red-600 py-6 text-center">
          {(error as Error)?.message || "Không tính được giá vốn"}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="text-sm">
            <div className="font-medium">{preview.productName}</div>
            <div className="text-gray-500">
              Kho nhận: {preview.receiveBranchName}
            </div>
          </div>

          <div className="rounded border divide-y text-sm">
            <Line
              label={`Giá thành lệnh này (${formatNumber(preview.goodQuantity)} thành phẩm đạt)`}
              value={cost2(preview.unitCost)}
            />
            <Line
              label={`Giá vốn hiện tại (tồn khác: ${formatNumber(preview.otherQuantity)})`}
              value={cost2(preview.oldCost)}
            />
            <div className="flex items-center justify-between px-3 py-2 bg-brand-soft">
              <span className="font-medium">Giá vốn bình quân đề xuất</span>
              <span className="text-base font-bold text-brand">
                {cost2(preview.proposedCost)}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            = ({formatNumber(preview.otherQuantity)} × {cost2(preview.oldCost)}{" "}
            + {formatNumber(preview.goodQuantity)} × {cost2(preview.unitCost)})
            / {formatNumber(preview.otherQuantity + preview.goodQuantity)}
            {preview.oldCost <= 0 &&
              ". Tồn cũ chưa có giá vốn nên không đưa vào bình quân."}
          </p>

          <Field label="Giá vốn mới sẽ ghi">
            <NumericInput
              value={newCost}
              onValueChange={setEditedCost}
              maxFractionDigits={2}
              className={`${INPUT_CLASS} text-right font-semibold`}
            />
          </Field>

          {otherBranches && otherBranches.length > 0 && (
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={scope === "receiveBranch"}
                  onChange={() => setScope("receiveBranch")}
                />
                Chỉ kho nhận ({preview.receiveBranchName})
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={scope === "allBranches"}
                  onChange={() => setScope("allBranches")}
                />
                Tất cả chi nhánh đang có sản phẩm này (
                {otherBranches.length + 1} chi nhánh)
              </label>
            </div>
          )}

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Báo cáo lãi lỗ dùng giá vốn hiện tại cho cả hóa đơn cũ, nên đổi giá
            vốn sẽ đổi lợi nhuận của các hóa đơn đã bán sản phẩm này. Sau khi
            áp, lệnh không thể hủy hay sửa chi phí.
          </p>
        </div>
      )}
    </ModalShell>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
