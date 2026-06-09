"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProductInventoryLogs } from "@/lib/hooks/useProducts";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CodeLink, type CodeEntity } from "../shared/CodeLink";

interface Props {
  productId: number;
  branchId?: number;
}

const PAGE_SIZE = 5;

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Nhập hàng",
  SALE: "Bán hàng",
  TRANSFER_OUT: "Chuyển hàng",
  TRANSFER_IN: "Chuyển hàng",
  PRODUCTION_OUT: "Sản xuất",
  PRODUCTION_IN: "Sản xuất",
  DESTRUCTION: "Xuất hủy",
  RETURN: "Trả hàng",
  STOCK_AUDIT: "Kiểm hàng",
  STOCK_AUDIT_CANCEL: "Hủy kiểm hàng",
};

// Map loại giao dịch → trang đích cho mã liên quan
const TRANSACTION_TYPE_ENTITY: Record<string, CodeEntity> = {
  PURCHASE: "purchase-order",
  SALE: "invoice",
  TRANSFER_OUT: "transfer",
  TRANSFER_IN: "transfer",
  PRODUCTION_OUT: "production",
  PRODUCTION_IN: "production",
  DESTRUCTION: "destruction",
  RETURN: "return-order",
  STOCK_AUDIT: "stock-audit",
  STOCK_AUDIT_CANCEL: "stock-audit",
};

const formatMoney = (v: number | null | undefined) => {
  if (!v && v !== 0) return "-";
  return new Intl.NumberFormat("en-US").format(v);
};

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Tính sliding window: tối đa 5 nút, căn giữa quanh currentPage
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function ProductInventoryLogTab({ productId, branchId }: Props) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset về trang 1 khi đổi sản phẩm hoặc chi nhánh
  useEffect(() => {
    setCurrentPage(1);
  }, [productId, branchId]);

  const { data, isLoading } = useProductInventoryLogs(
    productId,
    branchId,
    currentPage,
    PAGE_SIZE
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (total === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Chưa có dữ liệu thẻ kho
      </div>
    );
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const startRow = (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="border rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Mã liên quan
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Thời gian
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Loại giao dịch
            </th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">
              Đối tác
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Giá GD
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Giá vốn
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Số lượng
            </th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">
              Tồn cuối
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">
                {log.refCode &&
                TRANSACTION_TYPE_ENTITY[log.transactionType] ? (
                  <CodeLink
                    entity={TRANSACTION_TYPE_ENTITY[log.transactionType]}
                    code={log.refCode}
                  />
                ) : (
                  <span className="font-medium text-brand">
                    {log.refCode || "-"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {formatDateTime(log.transactionDate || log.createdAt)}
              </td>
              <td className="px-4 py-3">
                {TRANSACTION_TYPE_LABELS[log.transactionType] ||
                  log.transactionType}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {log.partnerName || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                {log.transactionPrice != null
                  ? formatMoney(log.transactionPrice)
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                {formatMoney(log.costPrice)}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">
                {log.tonCuoi != null ? formatMoney(log.tonCuoi) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-xs text-gray-500">
            {startRow}–{endRow} / {total} dòng
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => setCurrentPage(1)}
                  className="w-7 h-7 rounded text-xs font-medium hover:bg-gray-200 text-gray-700">
                  1
                </button>
                {pageNumbers[0] > 2 && (
                  <span className="text-xs text-gray-400 px-1">…</span>
                )}
              </>
            )}

            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  page === currentPage
                    ? "bg-brand text-white"
                    : "hover:bg-gray-200 text-gray-700"
                }`}>
                {page}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-xs text-gray-400 px-1">…</span>
                )}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-7 h-7 rounded text-xs font-medium hover:bg-gray-200 text-gray-700">
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
