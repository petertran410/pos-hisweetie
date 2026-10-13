"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useSendSubcontractMaterials } from "@/lib/hooks/useSubcontractOrders";
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

/** Xuất nguyên liệu khỏi kho, gửi sang nhà máy (Nháp → Đang gia công). */
export function SendMaterialsModal({
  order,
  onClose,
}: {
  order: SubcontractOrder;
  onClose: () => void;
}) {
  const send = useSendSubcontractMaterials();
  const [sentDate, setSentDate] = useState(today());
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(order.materials.map((m) => [m.id, m.plannedQuantity])),
  );

  const canViewCost = order.materials.every((m) => m.unitCost != null);
  const totalValue = order.materials.reduce(
    (s, m) => s + (quantities[m.id] || 0) * (m.unitCost ?? 0),
    0,
  );
  const hasAny = order.materials.some((m) => (quantities[m.id] || 0) > 0);

  const handleSubmit = () => {
    send.mutate(
      {
        id: order.id,
        data: {
          sentDate: dateInputToIso(sentDate),
          materials: order.materials.map((m) => ({
            id: m.id,
            sentQuantity: quantities[m.id] || 0,
          })),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalShell
      title={`Gửi nguyên liệu — ${order.code}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={!hasAny || send.isPending}
            className={BTN_PRIMARY}>
            {send.isPending ? "Đang xuất kho..." : "Xuất kho gửi nhà máy"}
          </button>
        </>
      }>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Nguyên liệu sẽ được trừ khỏi tồn kho <b>{order.branchName}</b> và theo
          dõi ở mục “Tồn tại nhà máy”. Giá vốn tại thời điểm này được chốt để
          tính giá thành.
        </p>

        <div className="w-48">
          <Field label="Ngày gửi">
            <DatePickerInput
              value={sentDate}
              onChange={setSentDate}
              className={DATE_CLASS}
            />
          </Field>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Nguyên liệu</th>
              <th className="px-3 py-2 text-right">Định mức</th>
              <th className="px-3 py-2 text-right w-36">Số lượng gửi</th>
              {canViewCost && <th className="px-3 py-2 text-right">Giá trị</th>}
            </tr>
          </thead>
          <tbody>
            {order.materials.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2">
                  <div>{m.productName}</div>
                  <div className="text-xs text-gray-400">{m.productCode}</div>
                </td>
                <td className="px-3 py-2 text-right">
                  {formatNumber(m.plannedQuantity)} {m.unit || ""}
                </td>
                <td className="px-3 py-2">
                  <NumericInput
                    value={quantities[m.id] || 0}
                    onValueChange={(v) =>
                      setQuantities((prev) => ({ ...prev, [m.id]: v }))
                    }
                    maxFractionDigits={4}
                    className={`${INPUT_CLASS} text-right`}
                  />
                </td>
                {canViewCost && (
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(
                      Math.round((quantities[m.id] || 0) * (m.unitCost ?? 0)),
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {canViewCost && (
            <tfoot>
              <tr className="border-t bg-gray-50 font-medium">
                <td colSpan={3} className="px-3 py-2 text-right">
                  Tổng giá trị nguyên liệu gửi đi
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(Math.round(totalValue))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ModalShell>
  );
}
