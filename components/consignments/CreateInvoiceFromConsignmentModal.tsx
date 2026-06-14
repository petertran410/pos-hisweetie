"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Consignment } from "@/lib/types/consignment";
import { useCreateInvoiceFromConsignment } from "@/lib/hooks/useConsignments";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CreateInvoiceFromConsignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment;
  onSuccess?: () => void;
}

/**
 * B3 — xuất hóa đơn từ phiếu ký gửi. Cho phép xuất từng phần:
 * số còn lại = SL ký gửi − SL đã xuất hóa đơn (derive từ invoices con).
 */
export function CreateInvoiceFromConsignmentModal({
  isOpen,
  onClose,
  consignment,
  onSuccess,
}: CreateInvoiceFromConsignmentModalProps) {
  const createInvoice = useCreateInvoiceFromConsignment();

  // Số đã xuất hóa đơn theo product (derive từ invoices con).
  const invoicedMap = useMemo(() => {
    const map: Record<number, number> = {};
    (consignment.invoices || []).forEach((inv) => {
      if (inv.status === 2) return; // bỏ hóa đơn đã hủy
      (inv.details || []).forEach((d) => {
        map[d.productId] = (map[d.productId] || 0) + Number(d.quantity);
      });
    });
    return map;
  }, [consignment.invoices]);

  const remainingItems = useMemo(
    () =>
      (consignment.items || [])
        .map((item) => {
          const invoiced = invoicedMap[item.productId] || 0;
          return {
            ...item,
            remainingQuantity: Number(item.quantity) - invoiced,
          };
        })
        .filter((item) => item.remainingQuantity > 0),
    [consignment.items, invoicedMap]
  );

  // Số lượng muốn xuất cho từng product (mặc định = toàn bộ phần còn lại).
  const [qtyMap, setQtyMap] = useState<Record<number, number>>(() =>
    remainingItems.reduce(
      (acc, item) => ({ ...acc, [item.productId]: item.remainingQuantity }),
      {} as Record<number, number>
    )
  );

  if (!isOpen) return null;

  const selectedTotal = remainingItems.reduce((sum, item) => {
    const qty = qtyMap[item.productId] ?? 0;
    return sum + (Number(item.price) - Number(item.discount)) * qty;
  }, 0);

  const handleConfirm = async () => {
    const items = remainingItems
      .map((item) => {
        const quantity = qtyMap[item.productId] ?? 0;
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity,
          price: Number(item.price),
          discount: Number(item.discount),
          discountRatio: Number(item.discountRatio),
          totalPrice:
            (Number(item.price) - Number(item.discount)) * quantity,
          note: item.note || undefined,
        };
      })
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      toast.error("Vui lòng nhập số lượng xuất hóa đơn");
      return;
    }
    if (
      items.some((i) => {
        const ri = remainingItems.find((r) => r.productId === i.productId);
        return ri && i.quantity > ri.remainingQuantity;
      })
    ) {
      toast.error("Số lượng xuất vượt quá số còn lại");
      return;
    }

    try {
      await createInvoice.mutateAsync({
        consignmentId: consignment.id,
        data: { items },
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Xuất hóa đơn thất bại");
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">
            Xuất hóa đơn từ phiếu ký gửi {consignment.code}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {remainingItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Tất cả sản phẩm đã được xuất hóa đơn.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Sản phẩm
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                    Còn lại
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-32">
                    SL xuất
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-32">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {remainingItems.map((item) => {
                  const qty = qtyMap[item.productId] ?? 0;
                  return (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.remainingQuantity}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={item.remainingQuantity}
                          value={qty}
                          onChange={(e) =>
                            setQtyMap((prev) => ({
                              ...prev,
                              [item.productId]: Math.max(
                                0,
                                Math.min(
                                  item.remainingQuantity,
                                  parseFloat(e.target.value) || 0
                                )
                              ),
                            }))
                          }
                          className="w-full border rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(
                          (Number(item.price) - Number(item.discount)) * qty
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t bg-gray-50">
          <div className="text-sm">
            <span className="text-gray-500">Tổng tiền hóa đơn: </span>
            <span className="font-semibold text-brand">
              {formatCurrency(selectedTotal)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={handleConfirm}
              disabled={remainingItems.length === 0 || createInvoice.isPending}
              className="px-4 py-2 text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
              Xuất hóa đơn
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
