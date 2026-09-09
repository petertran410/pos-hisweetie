"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePromisedSGDrilldownByProduct } from "@/lib/hooks/useTransfers";
import { formatWholeQuantity } from "@/lib/utils/transfer-planning-calc";
import { CodeLink } from "@/components/shared/CodeLink";

interface Props {
  productId: number;
  productName?: string;
  productSku?: string;
  onClose: () => void;
}

const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  5: "bg-blue-100 text-blue-700",
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN");

export function PromisedSGDrilldownModal({
  productId,
  productName,
  productSku,
  onClose,
}: Props) {
  const { data, isLoading, isError, error, refetch } =
    usePromisedSGDrilldownByProduct(productId);
  const records = data?.data ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">
              Chi tiết khách đặt SG
            </h3>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {productSku ? (
                <span className="text-brand font-medium">
                  <CodeLink entity="product" code={productSku} />
                </span>
              ) : null}
              {productSku && productName ? " — " : ""}
              {productName || ""}
              <span className="ml-2 text-gray-400">
                • Chi nhánh: Kho Sài Gòn
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ml-3 shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
              <div className="border-brand h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="text-sm text-red-500">
                {(error as Error | null)?.message ||
                  "Không thể tải danh sách đơn hàng"}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Thử lại
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Không có đơn Phiếu tạm hoặc Đã xác nhận tại Kho Sài Gòn.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
                    Mã đơn hàng
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
                    Thời gian tạo
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Khách hàng
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    Người tạo
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                    SL đặt
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                    Thành tiền
                  </th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.orderId} className="hover:bg-gray-50">
                    <td className="text-brand whitespace-nowrap px-4 py-2.5 font-medium">
                      <CodeLink entity="order" code={record.code} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                      {formatDateTime(record.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {record.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {record.creator?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-gray-900">
                      {formatWholeQuantity(record.quantity)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-gray-900">
                      {record.grandTotal.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[record.status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {record.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-gray-50 px-5 py-3 text-xs text-gray-600">
          <span>
            {records.length > 0
              ? `${data?.total ?? records.length} đơn — Tổng khách đặt SG: ${formatWholeQuantity(data?.sumQuantity ?? 0)}`
              : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
