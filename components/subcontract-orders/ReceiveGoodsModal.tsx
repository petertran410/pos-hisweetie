"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useCreateSubcontractReceipt } from "@/lib/hooks/useSubcontractOrders";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { SubcontractOrder } from "@/lib/types/subcontract-order";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  DATE_CLASS,
  Field,
  INPUT_CLASS,
  ModalShell,
  dateInputToIso,
  today,
} from "./ModalShell";

/** Nhập một đợt thành phẩm nhà máy giao về. */
export function ReceiveGoodsModal({
  order,
  onClose,
}: {
  order: SubcontractOrder;
  onClose: () => void;
}) {
  const createReceipt = useCreateSubcontractReceipt();
  const remaining = Math.max(order.plannedQuantity - order.goodQuantity, 0);

  const [receivedDate, setReceivedDate] = useState(today());
  const [goodQuantity, setGoodQuantity] = useState(remaining);
  const [defectQuantity, setDefectQuantity] = useState(0);
  const [note, setNote] = useState("");

  const isForeign = order.currency !== "VND";
  const feeForeign = goodQuantity * order.processingUnitPrice;
  const feeVnd = Math.round(feeForeign * (order.exchangeRate || 1));

  const handleSubmit = () => {
    createReceipt.mutate(
      {
        id: order.id,
        data: {
          receivedDate: dateInputToIso(receivedDate),
          goodQuantity,
          defectQuantity,
          note: note.trim() || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalShell
      title={`Nhập thành phẩm — ${order.code}`}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              goodQuantity + defectQuantity <= 0 || createReceipt.isPending
            }
            className={BTN_PRIMARY}>
            {createReceipt.isPending ? "Đang nhập kho..." : "Nhập kho"}
          </button>
        </>
      }>
      <div className="space-y-4">
        <div className="rounded border bg-gray-50 px-3 py-2 text-sm">
          <div className="font-medium">{order.productName}</div>
          <div className="text-gray-500">
            Kế hoạch {formatNumber(order.plannedQuantity)} · đã nhận{" "}
            {formatNumber(order.goodQuantity)} · còn lại{" "}
            {formatNumber(remaining)} · nhập vào kho{" "}
            <b>{order.receiveBranchName}</b>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Ngày nhận">
            <DatePickerInput
              value={receivedDate}
              onChange={setReceivedDate}
              minDate={order.sentDate?.slice(0, 10)}
              className={DATE_CLASS}
            />
          </Field>
          <Field label="SL đạt">
            <NumericInput
              value={goodQuantity}
              onValueChange={setGoodQuantity}
              maxFractionDigits={4}
              className={`${INPUT_CLASS} text-right`}
            />
          </Field>
          <Field label="SL lỗi" hint="Không nhập kho">
            <NumericInput
              value={defectQuantity}
              onValueChange={setDefectQuantity}
              maxFractionDigits={4}
              className={`${INPUT_CLASS} text-right`}
            />
          </Field>
        </div>

        <Field label="Ghi chú">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Số xe, số lô, tình trạng hàng..."
          />
        </Field>

        <div className="rounded border px-3 py-2 text-sm flex items-center justify-between">
          <span className="text-gray-600">
            Phí gia công đợt này ({formatNumber(goodQuantity)} ×{" "}
            {formatNumber(order.processingUnitPrice)}
            {isForeign
              ? ` ${order.currency} × ${formatNumber(order.exchangeRate)}`
              : ""}
            )
          </span>
          <span className="font-semibold text-red-600">
            +{formatCurrency(feeVnd)}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Khoản này được cộng vào công nợ phải trả nhà máy
          {isForeign ? ` (${formatNumber(feeForeign)} ${order.currency})` : ""}.
        </p>
      </div>
    </ModalShell>
  );
}
