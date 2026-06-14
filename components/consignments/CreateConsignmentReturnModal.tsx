"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Consignment } from "@/lib/types/consignment";
import {
  useReturnableByConsignment,
  useCreateConsignmentReturn,
} from "@/lib/hooks/useConsignmentReturns";
import { toast } from "sonner";

interface CreateConsignmentReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment;
  onSuccess?: () => void;
}

interface BucketRow {
  good: number;
  damaged: number;
  nearExpiry: number;
}

/**
 * Hoàn hàng ký gửi — khách trả lại hàng đã ký gửi (chưa xuất hóa đơn).
 * Mỗi dòng nhập 3 ô: Hàng tốt / Loại B / Cận date. SL hoàn = tổng 3 ô,
 * cap ở số còn lại (consigned − invoiced − đã hoàn) lấy từ API returnable.
 */
export function CreateConsignmentReturnModal({
  isOpen,
  onClose,
  consignment,
  onSuccess,
}: CreateConsignmentReturnModalProps) {
  const { data: returnable = {}, isLoading } = useReturnableByConsignment(
    isOpen ? consignment.id : 0
  );
  const createReturn = useCreateConsignmentReturn();

  const [buckets, setBuckets] = useState<Record<number, BucketRow>>({});
  const [note, setNote] = useState("");

  // Các dòng có thể hoàn (remaining > 0).
  const rows = useMemo(
    () =>
      (consignment.items || [])
        .map((item) => ({
          ...item,
          remaining: Number(returnable[item.productId] ?? 0),
        }))
        .filter((item) => item.remaining > 0),
    [consignment.items, returnable]
  );

  if (!isOpen) return null;

  const getBucket = (productId: number): BucketRow =>
    buckets[productId] || { good: 0, damaged: 0, nearExpiry: 0 };

  const rowReturn = (productId: number) => {
    const b = getBucket(productId);
    return b.good + b.damaged + b.nearExpiry;
  };

  const updateBucket = (
    productId: number,
    field: keyof BucketRow,
    value: number,
    max: number
  ) => {
    setBuckets((prev) => {
      const cur = prev[productId] || { good: 0, damaged: 0, nearExpiry: 0 };
      const next = { ...cur, [field]: Math.max(0, value) };
      const sum = next.good + next.damaged + next.nearExpiry;
      if (sum > max) return prev; // chặn vượt còn lại
      return { ...prev, [productId]: next };
    });
  };

  const totalReturn = rows.reduce(
    (sum, item) => sum + rowReturn(item.productId),
    0
  );

  const handleConfirm = async () => {
    const details = rows
      .map((item) => {
        const b = getBucket(item.productId);
        const returnQuantity = b.good + b.damaged + b.nearExpiry;
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          returnQuantity,
          goodQuantity: b.good,
          damagedQuantity: b.damaged,
          nearExpiryQuantity: b.nearExpiry,
        };
      })
      .filter((d) => d.returnQuantity > 0);

    if (details.length === 0) {
      toast.error("Vui lòng nhập số lượng hoàn");
      return;
    }

    try {
      await createReturn.mutateAsync({
        consignmentId: consignment.id,
        note: note || undefined,
        details,
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Tạo phiếu hoàn ký gửi thất bại");
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold">
            Hoàn hàng ký gửi {consignment.code}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Đang tải...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Không còn hàng ký gửi để hoàn.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Sản phẩm
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">
                    Còn lại
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                    Hàng tốt
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                    Loại B
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-24">
                    Cận date
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">
                    SL hoàn
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((item) => {
                  const b = getBucket(item.productId);
                  const max = item.remaining;
                  const mkInput = (
                    field: keyof BucketRow,
                    val: number
                  ) => (
                    <input
                      type="number"
                      min={0}
                      max={max}
                      value={val}
                      onChange={(e) =>
                        updateBucket(
                          item.productId,
                          field,
                          parseFloat(e.target.value) || 0,
                          max
                        )
                      }
                      className="w-full border rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  );
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
                      <td className="px-3 py-2 text-center">{max}</td>
                      <td className="px-3 py-2">{mkInput("good", b.good)}</td>
                      <td className="px-3 py-2">
                        {mkInput("damaged", b.damaged)}
                      </td>
                      <td className="px-3 py-2">
                        {mkInput("nearExpiry", b.nearExpiry)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {rowReturn(item.productId)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Lý do hoàn hàng..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t bg-gray-50">
          <div className="text-sm">
            <span className="text-gray-500">Tổng SL hoàn: </span>
            <span className="font-semibold text-brand">{totalReturn}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                rows.length === 0 ||
                totalReturn <= 0 ||
                createReturn.isPending
              }
              className="px-4 py-2 text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
              Tạo phiếu hoàn
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
