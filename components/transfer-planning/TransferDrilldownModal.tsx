"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTransferDrilldownByProduct } from "@/lib/hooks/useTransfers";
import { CodeLink } from "../shared/CodeLink";

export type TransferDrilldownVariant = "in-transit" | "pending";

interface TransferDrilldownModalProps {
  variant: TransferDrilldownVariant;
  productId: number;
  productName?: string;
  productSku?: string;
  onClose: () => void;
}

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const STATUS_BADGE_CLASS: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
};

const VARIANT_CONFIG = {
  "in-transit": {
    status: 2 as const,
    title: "Chi tiết hàng đang chuyển",
    timeLabel: "Thời gian chuyển",
    emptyMessage:
      "Không còn phiếu chuyển kho đang vận chuyển cho sản phẩm này.",
    footerLabel: "Tổng đang chuyển",
  },
  pending: {
    status: 1 as const,
    title: "Chi tiết phiếu tạm",
    timeLabel: "Ngày tạo",
    emptyMessage: "Không có phiếu tạm nào cho sản phẩm này.",
    footerLabel: "Tổng phiếu tạm",
  },
} as const;

export function TransferDrilldownModal({
  variant,
  productId,
  productName,
  productSku,
  onClose,
}: TransferDrilldownModalProps) {
  const config = VARIANT_CONFIG[variant];
  const isInTransit = variant === "in-transit";

  const { data, isLoading, isError, error } = useTransferDrilldownByProduct(
    productId,
    config.status
  );

  const records = data?.data || [];
  const sumQuantity = data?.sumQuantity ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {config.title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {productSku ? (
                <span className="font-medium text-brand">
                  <CodeLink entity="product" code={productSku} />
                </span>
              ) : null}
              {productSku && productName ? " — " : ""}
              {productName || ""}
              <span className="ml-2 text-gray-400">
                • Kho nhận: Kho Sài Gòn
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : isError ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <p className="text-sm text-red-500">
                {(error as Error | null)?.message ||
                  "Không thể tải danh sách phiếu chuyển"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Thử lại
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {config.emptyMessage}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Mã phiếu
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Kho đi
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Kho đến
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    {config.timeLabel}
                  </th>
                  {isInTransit && (
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                      SL chuyển
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    {isInTransit ? "Đang chuyển" : "SL phiếu tạm"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.transferId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-brand whitespace-nowrap">
                      <CodeLink entity="transfer" code={r.code} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {r.fromBranchName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {r.toBranchName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {isInTransit
                        ? formatDateTime(r.transferredDate)
                        : formatDateTime(r.createdAt)}
                    </td>
                    {isInTransit && (
                      <td className="px-4 py-2.5 text-right text-gray-900 whitespace-nowrap">
                        {Number(r.sendQuantity).toLocaleString()}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right text-gray-900 font-medium whitespace-nowrap">
                      {Number(r.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGE_CLASS[r.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}>
                        {r.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <span>
            {records.length > 0
              ? `${records.length} phiếu — ${config.footerLabel}: ${sumQuantity.toLocaleString()}`
              : ""}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm">
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}