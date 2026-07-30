"use client";

import { useMemo, useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  useUpdateStockConditionTransfer,
  useStockConditionTransferEditImpact,
} from "@/lib/hooks/useStockConditionTransfers";
import {
  BUCKET_LABELS,
  type StockConditionTransfer,
  type UpdateStockConditionTransferItem,
} from "@/lib/api/stock-condition-transfers";
import { toast } from "sonner";

interface Props {
  transfer: StockConditionTransfer;
  onClose: () => void;
}

/** Chuẩn hóa về YYYY-MM-DD để so sánh và đưa vào DatePickerInput. */
const toDateKey = (v?: string | null): string =>
  v ? String(v).slice(0, 10) : "";

interface RowState {
  detailId: number;
  /** Số lượng đúng sau khi sửa; rỗng = giữ nguyên số đã ghi. */
  reduceQuantity: string;
  expiryDate: string;
  note: string;
}

/**
 * SỬA PHIẾU CHUYỂN LOẠI TỒN — dùng được cả khi phiếu ĐÃ DUYỆT.
 *
 * Chỉ cho sửa 3 thứ: NSX, số lượng, ghi chú. Không đổi sản phẩm / loại tồn /
 * chiều vì đổi những thứ đó tương đương một phiếu khác (phải hủy rồi tạo lại).
 *
 * NSX chỉ chọn THÁNG/NĂM (monthOnly) — backend neo về ngày 01 nên hai lần nhập
 * cùng tháng luôn vào cùng một lô.
 *
 * Khi lô cận date đã phát sinh bán, backend CHẶN lần lưu đầu và trả về danh sách
 * hóa đơn ảnh hưởng. Form hiển thị hộp xác nhận rồi gửi lại kèm cascadeInvoices
 * để cập nhật luôn soldExpiryDate của các hóa đơn đó.
 */
export function StockConditionTransferEditForm({ transfer, onClose }: Props) {
  const updateTransfer = useUpdateStockConditionTransfer();
  const { data: impact } = useStockConditionTransferEditImpact(transfer.id);

  const [note, setNote] = useState(transfer.note || "");
  const [rows, setRows] = useState<RowState[]>(() =>
    transfer.details.map((d) => ({
      detailId: d.id,
      reduceQuantity: "",
      expiryDate: toDateKey(d.expiryDate),
      note: d.note || "",
    }))
  );
  // Danh sách hóa đơn cần xác nhận (lấy từ message lỗi của backend).
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const detailMap = useMemo(
    () => new Map(transfer.details.map((d) => [d.id, d])),
    [transfer.details]
  );

  // Tra số đã bán theo từng dòng để cảnh báo trước khi sửa NSX.
  const impactMap = useMemo(() => {
    const m = new Map<
      number,
      { soldQuantity: number; invoices: { invoiceCode: string; quantity: number }[] }
    >();
    impact?.details.forEach((d) => {
      if (d.soldQuantity > 0) {
        m.set(d.detailId, {
          soldQuantity: d.soldQuantity,
          invoices: d.invoices,
        });
      }
    });
    return m;
  }, [impact]);

  const updateRow = (
    detailId: number,
    field: keyof Omit<RowState, "detailId">,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.detailId === detailId ? { ...r, [field]: value } : r))
    );
  };

  // Chỉ gửi những dòng THỰC SỰ thay đổi so với dữ liệu gốc.
  const buildChangedItems = (): UpdateStockConditionTransferItem[] => {
    const out: UpdateStockConditionTransferItem[] = [];
    for (const r of rows) {
      const d = detailMap.get(r.detailId);
      if (!d) continue;
      const item: UpdateStockConditionTransferItem = { detailId: r.detailId };
      let changed = false;

      const correctedQty = parseInt(r.reduceQuantity);
      if (!Number.isNaN(correctedQty)) {
        item.quantity = correctedQty;
        changed = true;
      }
      if (r.expiryDate !== toDateKey(d.expiryDate)) {
        item.expiryDate = r.expiryDate || null;
        changed = true;
      }
      if (r.note !== (d.note || "")) {
        item.note = r.note || null;
        changed = true;
      }
      if (changed) out.push(item);
    }
    return out;
  };

  const submit = (cascadeInvoices: boolean) => {
    const items = buildChangedItems();
    const noteChanged = note !== (transfer.note || "");

    if (items.length === 0 && !noteChanged) {
      toast.info("Chưa có thay đổi nào");
      return;
    }

    for (const r of rows) {
      const d = detailMap.get(r.detailId);
      if (!d) continue;
      if (r.reduceQuantity === "") continue;
      const correctedQty = parseInt(r.reduceQuantity);
      if (
        Number.isNaN(correctedQty) ||
        correctedQty < 0 ||
        correctedQty > Number(d.quantity)
      ) {
        toast.error(
          `${d.productName}: Số đúng phải từ 0 đến số đã ghi (${Number(d.quantity)})`
        );
        return;
      }
    }

    updateTransfer.mutate(
      {
        id: transfer.id,
        data: {
          note: noteChanged ? note : undefined,
          items: items.length > 0 ? items : undefined,
          cascadeInvoices: cascadeInvoices || undefined,
        },
      },
      {
        onSuccess: () => {
          setPendingConfirm(null);
          onClose();
        },
        onError: (error: any) => {
          const msg = error?.message || "Cập nhật phiếu thất bại";
          // Backend chặn lần đầu khi lô đã bán → hỏi xác nhận cascade.
          if (msg.includes("Xác nhận cập nhật cả hóa đơn")) {
            setPendingConfirm(msg);
            return;
          }
          toast.error(msg);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-base font-semibold">
              Sửa phiếu {transfer.code}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {transfer.branchName} · Chỉ sửa được NSX, số lượng và ghi chú
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Nhập số lượng thực tế đúng vào cột <strong>Sửa còn</strong>. Ví dụ
            phiếu đã ghi 25 nhưng thực tế chỉ có 20 thì nhập 20. Hệ thống sẽ
            sửa lại giao dịch tại đúng ngày của phiếu và tính lại tồn cuối của
            các giao dịch về sau. Nhập 0 nếu toàn bộ dòng đã ghi dư.
          </div>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Mã hàng</th>
                  <th className="px-3 py-2 text-left">Tên hàng</th>
                  <th className="px-3 py-2 text-center">Loại tồn</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">
                    Số đã ghi
                  </th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">
                    Sửa còn
                  </th>
                  <th className="px-3 py-2 text-center">NSX (tháng/năm)</th>
                  <th className="px-3 py-2 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = detailMap.get(r.detailId);
                  if (!d) return null;
                  const isNearExpiry = d.toBucket === "NEAR_EXPIRY";
                  const sold = impactMap.get(r.detailId);
                  const currentQty = Number(d.quantity);
                  const parsedCorrectedQty = parseInt(r.reduceQuantity);
                  const invalidReduction =
                    r.reduceQuantity !== "" &&
                    (Number.isNaN(parsedCorrectedQty) ||
                      parsedCorrectedQty < 0 ||
                      parsedCorrectedQty > currentQty);
                  const expiryChanged =
                    r.expiryDate !== toDateKey(d.expiryDate);
                  return (
                    <tr key={r.detailId} className="border-t align-top">
                      <td className="px-3 py-2 text-xs">{d.productCode}</td>
                      <td className="px-3 py-2">
                        {d.productName}
                        {d.direction === "OUT" && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Điều chỉnh giảm
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 whitespace-nowrap">
                          {BUCKET_LABELS[d.toBucket] || d.toBucket}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-medium tabular-nums">
                          {currentQty.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={currentQty}
                          value={r.reduceQuantity}
                          placeholder={String(currentQty)}
                          onChange={(e) =>
                            updateRow(
                              r.detailId,
                              "reduceQuantity",
                              e.target.value.replace(/[^\d]/g, "")
                            )
                          }
                          className={`w-20 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 ${
                            invalidReduction
                              ? "border-red-400 focus:ring-red-300"
                              : "focus:ring-brand"
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center w-40">
                        {!isNearExpiry ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          <>
                            <DatePickerInput
                              monthOnly
                              value={r.expiryDate}
                              onChange={(v) =>
                                updateRow(r.detailId, "expiryDate", v)
                              }
                            />
                            {sold && (
                              <div
                                className={`mt-1 text-[10px] flex items-start gap-1 ${
                                  expiryChanged
                                    ? "text-red-600"
                                    : "text-amber-600"
                                }`}>
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span className="text-left">
                                  Lô này đã bán {sold.soldQuantity}
                                  {expiryChanged
                                    ? " — đổi NSX sẽ cập nhật cả hóa đơn"
                                    : ""}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.note}
                          onChange={(e) =>
                            updateRow(r.detailId, "note", e.target.value)
                          }
                          placeholder="..."
                          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú phiếu
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full border rounded px-3 py-2 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-end gap-2 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
            Đóng
          </button>
          <button
            onClick={() => submit(false)}
            disabled={updateTransfer.isPending}
            className="px-4 py-2 text-sm bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2">
            {updateTransfer.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Hộp xác nhận: lô đã bán, cần đồng ý cập nhật cả hóa đơn */}
      {pendingConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">
                  Lô đang sửa đã phát sinh bán
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  {pendingConfirm}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Tiếp tục sẽ cập nhật NSX trên các hóa đơn đã bán từ lô cũ sang
                  lô mới. Việc này sửa dữ liệu hóa đơn đã chốt.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                Để sau
              </button>
              <button
                onClick={() => submit(true)}
                disabled={updateTransfer.isPending}
                className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2">
                {updateTransfer.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Cập nhật cả hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
