"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Link from "next/link";
import { useConsignmentByProduct } from "@/lib/hooks/useConsignments";
import { CONSIGNMENT_STATUS_COLOR } from "@/lib/types/consignment";
import { CodeLink } from "../shared/CodeLink";

interface ProductConsignmentsModalProps {
  productId: number;
  productName?: string;
  productCode?: string;
  branchId?: number;
  branchName?: string;
  onClose: () => void;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function ProductConsignmentsModal({
  productId,
  productName,
  productCode,
  branchId,
  branchName,
  onClose,
}: ProductConsignmentsModalProps) {
  const { data, isLoading, isError, error } = useConsignmentByProduct(
    productId,
    branchId
  );

  const rows = data || [];
  const totalQty = rows.reduce((sum, o) => sum + Number(o.quantity || 0), 0);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              Đang ký gửi tại khách
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {productCode ? (
                <span className="font-medium text-brand">
                  <CodeLink entity="product" code={productCode} />
                </span>
              ) : null}
              {productCode && productName ? " — " : ""}
              {productName || ""}
              {branchName ? (
                <span className="ml-2 text-gray-400">
                  • Chi nhánh: {branchName}
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-red-500">
              {(error as Error | null)?.message ||
                "Không thể tải danh sách phiếu ký gửi"}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Sản phẩm này hiện không ký gửi tại khách nào
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Mã phiếu
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Thời gian tạo
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Khách hàng
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Người tạo
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    SL còn ký gửi
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((o) => (
                  <tr key={o.consignmentId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-brand whitespace-nowrap">
                      <Link
                        href={`/don-hang/ky-gui?Code=${o.code}`}
                        target="_blank">
                        {o.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {o.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {o.creator?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900 whitespace-nowrap">
                      {Number(o.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          CONSIGNMENT_STATUS_COLOR[o.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}>
                        {o.statusValue || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-600">
          <span>
            {rows.length > 0
              ? `${rows.length} phiếu — Tổng SL đang ký gửi: ${totalQty.toLocaleString()}`
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
