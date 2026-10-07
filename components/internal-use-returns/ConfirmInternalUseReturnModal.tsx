"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  useCancelInternalUseReturn,
  useConfirmInternalUseReturnStock,
  useInternalUseReturn,
} from "@/lib/hooks/useInternalUseReturns";
import {
  INTERNAL_USE_RETURN_STATUS,
  INTERNAL_USE_RETURN_STATUS_LABELS,
} from "@/lib/types/internal-use-return";
import { formatMonthYear } from "@/components/ui/DatePickerInput";

interface Props {
  returnId: number;
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Row {
  detailId: number;
  productName: string;
  productCode: string;
  requestQuantity: number;
  sourceConditionType: string;
  sourceSoldExpiryDate?: string | null;
  goodQuantity: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  nearExpiryDate: string;
}

const toMonth = (value?: string | null) => (value ? String(value).slice(0, 7) : "");

export function ConfirmInternalUseReturnModal({
  returnId,
  readOnly = false,
  onClose,
  onSuccess,
}: Props) {
  const { data: item, isLoading } = useInternalUseReturn(returnId);
  const confirmStock = useConfirmInternalUseReturnStock();
  const cancelReturn = useCancelInternalUseReturn();
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!item) return;
    setNote(item.note || "");
    setRows(
      (item.details || []).map((detail) => {
        const hasSavedBuckets =
          Number(detail.confirmedQuantity) > 0 ||
          Number(detail.goodQuantity) > 0 ||
          Number(detail.damagedQuantity) > 0 ||
          Number(detail.nearExpiryQuantity) > 0;
        const fallback = {
          goodQuantity: detail.sourceConditionType === "normal" ? Number(detail.requestQuantity) : 0,
          damagedQuantity: detail.sourceConditionType === "damaged" ? Number(detail.requestQuantity) : 0,
          nearExpiryQuantity: detail.sourceConditionType === "near_expiry" ? Number(detail.requestQuantity) : 0,
        };
        return {
          detailId: detail.id,
          productName: detail.productName,
          productCode: detail.productCode,
          requestQuantity: Number(detail.requestQuantity),
          sourceConditionType: detail.sourceConditionType,
          sourceSoldExpiryDate: detail.sourceSoldExpiryDate,
          goodQuantity: hasSavedBuckets ? Number(detail.goodQuantity) : fallback.goodQuantity,
          damagedQuantity: hasSavedBuckets ? Number(detail.damagedQuantity) : fallback.damagedQuantity,
          nearExpiryQuantity: hasSavedBuckets
            ? Number(detail.nearExpiryQuantity)
            : fallback.nearExpiryQuantity,
          nearExpiryDate:
            toMonth(detail.nearExpiryDate) ||
            (detail.sourceConditionType === "near_expiry"
              ? toMonth(detail.sourceSoldExpiryDate)
              : ""),
        };
      })
    );
  }, [item]);

  const updateRow = (index: number, field: keyof Row, value: string | number) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value } as Row;
        const total =
          Number(next.goodQuantity) +
          Number(next.damagedQuantity) +
          Number(next.nearExpiryQuantity);
        if (total > row.requestQuantity) return row;
        return next;
      })
    );
  };

  const submit = async (isDraft: boolean) => {
    try {
      await confirmStock.mutateAsync({
        id: returnId,
        data: {
          isDraft,
          note: note || undefined,
          details: rows.map((row) => ({
            detailId: row.detailId,
            confirmedQuantity:
              Number(row.goodQuantity) +
              Number(row.damagedQuantity) +
              Number(row.nearExpiryQuantity),
            goodQuantity: Number(row.goodQuantity),
            damagedQuantity: Number(row.damagedQuantity),
            nearExpiryQuantity: Number(row.nearExpiryQuantity),
            nearExpiryDate:
              Number(row.nearExpiryQuantity) > 0
                ? row.nearExpiryDate
                  ? `${row.nearExpiryDate}-01`
                  : null
                : null,
          })),
        },
      });
      onSuccess();
    } catch {
      // Hook displays the API error.
    }
  };

  const cancel = async () => {
    if (!confirm("Bạn có chắc muốn hủy phiếu trả này?")) return;
    try {
      await cancelReturn.mutateAsync(returnId);
      onSuccess();
    } catch {
      // Hook displays the API error.
    }
  };

  if (isLoading || !item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white px-8 py-6 text-sm text-gray-500">
          Đang tải phiếu trả...
        </div>
      </div>
    );
  }

  const canEdit =
    !readOnly &&
    (item.status === INTERNAL_USE_RETURN_STATUS.REQUEST ||
      item.status === INTERNAL_USE_RETURN_STATUS.STOCK_DRAFT);
  const isDraft = item.status === INTERNAL_USE_RETURN_STATUS.STOCK_DRAFT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Nhập lại kho - {item.code}</h2>
            <p className="text-xs text-gray-500">
              Phiếu xuất: {item.internalUse?.code || "-"} ·{" "}
              {INTERNAL_USE_RETURN_STATUS_LABELS[item.status] || "Không xác định"}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Sản phẩm</th>
                  <th className="px-3 py-2 text-right">SL yêu cầu</th>
                  <th className="px-3 py-2 text-center">Loại tồn gốc</th>
                  <th className="px-3 py-2 text-right">Hàng tốt</th>
                  <th className="px-3 py-2 text-right">Bục rách</th>
                  <th className="px-3 py-2 text-right">Cận date</th>
                  <th className="px-3 py-2 text-center">Lô NSX</th>
                  <th className="px-3 py-2 text-right">Thực nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, index) => {
                  const total =
                    Number(row.goodQuantity) +
                    Number(row.damagedQuantity) +
                    Number(row.nearExpiryQuantity);
                  return (
                    <tr key={row.detailId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.productName}</div>
                        <div className="text-xs text-gray-500">{row.productCode}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{row.requestQuantity}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.sourceConditionType === "damaged"
                          ? "Bục rách"
                          : row.sourceConditionType === "near_expiry"
                            ? `Cận date${
                                row.sourceSoldExpiryDate
                                  ? ` (${formatMonthYear(row.sourceSoldExpiryDate)})`
                                  : ""
                              }`
                            : "Bình thường"}
                      </td>
                      {(["goodQuantity", "damagedQuantity", "nearExpiryQuantity"] as const).map(
                        (field) => (
                          <td key={field} className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              disabled={!canEdit}
                              value={row[field] || ""}
                              onChange={(event) =>
                                updateRow(index, field, Number(event.target.value))
                              }
                              className="w-20 rounded border px-2 py-1 text-right disabled:bg-gray-50"
                            />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2 text-center">
                        {Number(row.nearExpiryQuantity) > 0 ? (
                          <input
                            type="month"
                            disabled={!canEdit}
                            value={row.nearExpiryDate}
                            onChange={(event) =>
                              updateRow(index, "nearExpiryDate", event.target.value)
                            }
                            className="rounded border px-2 py-1 text-xs disabled:bg-gray-50"
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">Ghi chú</label>
            <textarea
              disabled={!canEdit}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-between border-t bg-gray-50 p-4">
            <button
              onClick={cancel}
              disabled={cancelReturn.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              Hủy phiếu
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
                Đóng
              </button>
              <button
                disabled={confirmStock.isPending}
                onClick={() => submit(true)}
                className="rounded-lg border border-orange-400 px-4 py-2 text-sm text-orange-700 disabled:opacity-50">
                {isDraft ? "Lưu phiếu tạm" : "Lưu nhập tạm"}
              </button>
              <button
                disabled={confirmStock.isPending}
                onClick={() => submit(false)}
                className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">
                {confirmStock.isPending ? "Đang xử lý..." : "Xác nhận nhập kho"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
