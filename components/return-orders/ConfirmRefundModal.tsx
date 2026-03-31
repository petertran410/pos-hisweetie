"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { formatCurrency } from "@/lib/utils";

interface ConfirmRefundModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function ConfirmRefundModal({
  returnOrderId,
  onClose,
  onSubmit,
}: ConfirmRefundModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");

  const refundAmount = Number(returnOrder?.refundAmount || 0);

  const handleSubmit = () => {
    onSubmit({ note, method });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[700px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Xác nhận hoàn tiền - {returnOrder?.code}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Hóa đơn:</span>{" "}
                {returnOrder?.invoice?.code}
              </div>
              <div>
                <span className="text-gray-500">Khách hàng:</span>{" "}
                {returnOrder?.customer?.name || "Khách lẻ"}
              </div>
            </div>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-right">SL xác nhận</th>
                <th className="px-3 py-2 text-right">Giá nhập lại</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(returnOrder?.details || []).map((d: any) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{d.productName}</div>
                    <div className="text-xs text-gray-500">{d.productCode}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(d.confirmedQuantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(Number(d.returnPrice))}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(
                      Number(d.confirmedQuantity) * Number(d.returnPrice)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">
              Số tiền hoàn cho khách
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(refundAmount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Số tiền này sẽ được cấn trừ công nợ và tạo phiếu chi tương ứng
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phương thức hoàn tiền
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            Xác nhận hoàn tiền & Hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
}
