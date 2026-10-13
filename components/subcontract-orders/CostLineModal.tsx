"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useSaveSubcontractCost } from "@/lib/hooks/useSubcontractOrders";
import {
  SUBCONTRACT_COST_TYPES,
  SUBCONTRACT_COST_TYPE_LABEL,
  type SubcontractCost,
} from "@/lib/types/subcontract-order";
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

/** Thêm / sửa một dòng chi phí khác của lệnh đã lưu. */
export function CostLineModal({
  orderId,
  cost,
  onClose,
}: {
  orderId: number;
  cost?: SubcontractCost | null;
  onClose: () => void;
}) {
  const save = useSaveSubcontractCost();
  const [type, setType] = useState(cost?.type ?? "freight_out");
  const [name, setName] = useState(cost?.name ?? "");
  // Bồi thường lưu số âm; ô nhập luôn là số dương cho dễ gõ.
  const [amount, setAmount] = useState(Math.abs(cost?.amount ?? 0));
  const [isFactoryPayable, setIsFactoryPayable] = useState(
    cost?.isFactoryPayable ?? false,
  );
  const [costDate, setCostDate] = useState(
    cost?.costDate ? cost.costDate.slice(0, 10) : today(),
  );
  const [note, setNote] = useState(cost?.note ?? "");

  const isCompensation = type === "compensation";

  const handleSubmit = () => {
    save.mutate(
      {
        id: orderId,
        costId: cost?.id,
        data: {
          type,
          name: name.trim() || SUBCONTRACT_COST_TYPE_LABEL[type],
          amount: isCompensation ? -amount : amount,
          isFactoryPayable,
          costDate: dateInputToIso(costDate),
          note: note.trim() || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalShell
      title={cost ? "Sửa chi phí" : "Thêm chi phí"}
      onClose={onClose}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={amount <= 0 || save.isPending}
            className={BTN_PRIMARY}>
            Lưu
          </button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại chi phí">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={INPUT_CLASS}>
              {SUBCONTRACT_COST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngày phát sinh">
            <DatePickerInput
              value={costDate}
              onChange={setCostDate}
              className={DATE_CLASS}
            />
          </Field>
        </div>

        <Field label="Diễn giải">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={SUBCONTRACT_COST_TYPE_LABEL[type]}
            className={INPUT_CLASS}
          />
        </Field>

        <Field
          label="Số tiền (VND)"
          hint={
            isCompensation
              ? "Bồi thường làm GIẢM giá thành; nếu tích ô bên dưới thì giảm luôn công nợ nhà máy."
              : undefined
          }>
          <NumericInput
            value={amount}
            onValueChange={setAmount}
            maxFractionDigits={0}
            className={`${INPUT_CLASS} text-right`}
          />
        </Field>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isFactoryPayable}
            onChange={(e) => setIsFactoryPayable(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Tính vào công nợ nhà máy
            <span className="block text-xs text-gray-400">
              Tích khi khoản này do nhà máy thu (bao bì, phụ liệu nhà máy cấp…).
              Bỏ tích nếu trả cho bên thứ ba (vận chuyển, thuế) — khi đó chỉ
              cộng vào giá thành.
            </span>
          </span>
        </label>

        <Field label="Ghi chú">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
      </div>
    </ModalShell>
  );
}
