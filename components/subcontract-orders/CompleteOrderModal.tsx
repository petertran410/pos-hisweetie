"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { useCompleteSubcontractOrder } from "@/lib/hooks/useSubcontractOrders";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  computeLossPercent,
  type SubcontractOrder,
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

/**
 * Quyết toán: ghi nhận nguyên liệu thừa nhà máy trả về, chốt hao hụt và giá
 * thành. Giá vốn thành phẩm CHƯA đổi ở bước này — phải bấm "Áp giá vốn".
 */
export function CompleteOrderModal({
  order,
  onClose,
  onCompleted,
}: {
  order: SubcontractOrder;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const complete = useCompleteSubcontractOrder();
  const [completedDate, setCompletedDate] = useState(today());
  const [returned, setReturned] = useState<Record<number, number>>({});

  const canViewCost = order.materials.every((m) => m.unitCost != null);

  const preview = useMemo(() => {
    const materials = order.materials.map((m) => ({
      ...m,
      returnedQuantity: returned[m.id] || 0,
    }));
    const materialCost = materials.reduce(
      (s, m) => s + (m.sentQuantity - m.returnedQuantity) * (m.unitCost ?? 0),
      0,
    );
    const totalCost = materialCost + order.processingCost + order.otherCost;
    return {
      materialCost,
      totalCost,
      unitCost: order.goodQuantity > 0 ? totalCost / order.goodQuantity : 0,
      lossPercent: computeLossPercent({
        plannedQuantity: order.plannedQuantity,
        goodQuantity: order.goodQuantity,
        materials,
      }),
    };
  }, [order, returned]);

  const lossExceeded =
    preview.lossPercent != null &&
    preview.lossPercent > order.lossAllowancePercent;
  const overReturned = order.materials.some(
    (m) => (returned[m.id] || 0) > m.sentQuantity,
  );

  const handleSubmit = () => {
    complete.mutate(
      {
        id: order.id,
        data: {
          completedDate: dateInputToIso(completedDate),
          materials: order.materials.map((m) => ({
            id: m.id,
            returnedQuantity: returned[m.id] || 0,
          })),
        },
      },
      {
        onSuccess: () => {
          onClose();
          onCompleted?.();
        },
      },
    );
  };

  return (
    <ModalShell
      title={`Hoàn thành & quyết toán — ${order.code}`}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className={BTN_SECONDARY}>
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={overReturned || complete.isPending}
            className={BTN_PRIMARY}>
            {complete.isPending ? "Đang lưu..." : "Hoàn thành lệnh"}
          </button>
        </>
      }>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm text-gray-600">
            Đã nhận <b>{formatNumber(order.goodQuantity)}</b> /{" "}
            {formatNumber(order.plannedQuantity)} {order.productName}
            {order.defectQuantity > 0 &&
              ` (lỗi ${formatNumber(order.defectQuantity)})`}
            . Nhập số nguyên liệu thừa nhà máy trả về; phần còn lại được tính là
            đã tiêu hao.
          </p>
          <div className="w-44 shrink-0">
            <Field label="Ngày hoàn thành">
              <DatePickerInput
                value={completedDate}
                onChange={setCompletedDate}
                className={DATE_CLASS}
              />
            </Field>
          </div>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Nguyên liệu</th>
              <th className="px-3 py-2 text-right">Đã gửi</th>
              <th className="px-3 py-2 text-right w-32">Trả về kho</th>
              <th className="px-3 py-2 text-right">Tiêu hao</th>
              {canViewCost && (
                <th className="px-3 py-2 text-right">Giá trị tiêu hao</th>
              )}
            </tr>
          </thead>
          <tbody>
            {order.materials.map((m) => {
              const back = returned[m.id] || 0;
              const consumed = m.sentQuantity - back;
              return (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">
                    <div>{m.productName}</div>
                    <div className="text-xs text-gray-400">{m.productCode}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(m.sentQuantity)} {m.unit || ""}
                  </td>
                  <td className="px-3 py-2">
                    <NumericInput
                      value={back}
                      onValueChange={(v) =>
                        setReturned((prev) => ({ ...prev, [m.id]: v }))
                      }
                      maxFractionDigits={4}
                      className={`${INPUT_CLASS} text-right ${
                        back > m.sentQuantity ? "border-red-500" : ""
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(consumed)} {m.unit || ""}
                  </td>
                  {canViewCost && (
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(Math.round(consumed * (m.unitCost ?? 0)))}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {overReturned && (
          <p className="text-sm text-red-600">
            Số lượng trả về không được vượt số đã gửi.
          </p>
        )}

        {preview.lossPercent != null && (
          <div
            className={`rounded border px-3 py-2 text-sm flex items-start gap-2 ${
              lossExceeded
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}>
            {lossExceeded && <AlertTriangle className="w-4 h-4 mt-0.5" />}
            <div>
              Hao hụt thực tế so với định mức:{" "}
              <b>
                {preview.lossPercent > 0 ? "+" : ""}
                {preview.lossPercent}%
              </b>{" "}
              (cho phép {order.lossAllowancePercent}%).
              {lossExceeded &&
                " Vượt định mức — nếu nhà máy chịu trách nhiệm, hãy thêm một dòng chi phí loại “Bồi thường” trước khi áp giá vốn."}
            </div>
          </div>
        )}

        {canViewCost && (
          <div className="rounded border divide-y text-sm">
            <Row label="Nguyên liệu tiêu hao" value={preview.materialCost} />
            <Row label="Phí gia công" value={order.processingCost} />
            <Row label="Chi phí khác" value={order.otherCost} />
            <Row label="Tổng giá thành" value={preview.totalCost} bold />
            <div className="flex items-center justify-between px-3 py-2 bg-brand-soft">
              <span className="font-medium">Giá thành / 1 thành phẩm đạt</span>
              <span className="text-base font-bold text-brand">
                {formatCurrency(Math.round(preview.unitCost * 100) / 100)}
              </span>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        bold ? "font-semibold" : ""
      }`}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span>{formatCurrency(Math.round(value))}</span>
    </div>
  );
}
