"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { formatCurrency } from "@/lib/utils";

interface ConfirmStockModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ConfirmItem {
  detailId: number;
  productCode: string;
  productName: string;
  requestQuantity: number;
  confirmedQuantity: number;
  returnPrice: number;
}

export function ConfirmStockModal({
  returnOrderId,
  onClose,
  onSubmit,
}: ConfirmStockModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const [confirmItems, setConfirmItems] = useState<ConfirmItem[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (returnOrder?.details) {
      setConfirmItems(
        returnOrder.details.map((d: any) => ({
          detailId: d.id,
          productCode: d.productCode,
          productName: d.productName,
          requestQuantity: Number(d.requestQuantity),
          confirmedQuantity: Number(d.requestQuantity),
          returnPrice: Number(d.returnPrice),
        }))
      );
      setNote(returnOrder.note || "");
    }
  }, [returnOrder]);

  const updateConfirmedQuantity = (index: number, value: number) => {
    setConfirmItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          confirmedQuantity: Math.min(Math.max(0, value), item.requestQuantity),
        };
      })
    );
  };

  const totalRefund = confirmItems.reduce(
    (sum, item) => sum + item.confirmedQuantity * item.returnPrice,
    0
  );

  const handleSubmit = () => {
    onSubmit({
      details: confirmItems.map((item) => ({
        detailId: item.detailId,
        confirmedQuantity: item.confirmedQuantity,
      })),
      note,
    });
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
      <div className="bg-white rounded-xl w-[950px] min-h-[70vh] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            Nhập hàng trả - {returnOrder?.code}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-gray-500">Hóa đơn:</span>{" "}
                {returnOrder?.invoice?.code}
              </div>
              <div>
                <span className="text-gray-500">Khách hàng:</span>{" "}
                {returnOrder?.customer?.name || "Khách lẻ"}
              </div>
              <div>
                <span className="text-gray-500">Người tạo:</span>{" "}
                {returnOrder?.createdByName}
              </div>
            </div>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-right w-28">SL yêu cầu</th>
                <th className="px-3 py-2 text-right w-28">SL thực nhận</th>
                <th className="px-3 py-2 text-right w-28">Giá nhập lại</th>
                <th className="px-3 py-2 text-right w-32">Thành tiền</th>
                <th className="px-3 py-2 text-center w-20">So sánh</th>
              </tr>
            </thead>
            <tbody>
              {confirmItems.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-gray-500">
                      {item.productCode}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.requestQuantity}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={item.requestQuantity}
                      value={item.confirmedQuantity}
                      onChange={(e) =>
                        updateConfirmedQuantity(idx, Number(e.target.value))
                      }
                      className="w-20 px-2 py-1 border rounded text-right text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(item.returnPrice)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(item.confirmedQuantity * item.returnPrice)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.confirmedQuantity !== item.requestQuantity ? (
                      <span className="text-red-600 font-medium">
                        {item.confirmedQuantity}/{item.requestQuantity}
                      </span>
                    ) : (
                      <span className="text-green-600">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t shrink-0">
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
          <div className="text-sm">
            <span className="text-gray-500">Tổng hoàn tiền: </span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(totalRefund)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">
              Xác nhận nhập hàng trả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
