"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useTransfersInTransitByProduct } from "@/lib/hooks/useTransfers";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "../shared/CodeLink";

interface ProductInTransitModalProps {
  productId: number;
  productName?: string;
  productCode?: string;
  branchId?: number;
  branchName?: string;
  onClose: () => void;
  zIndex?: number;
}

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

/** Phiếu chuyển hàng Đang chuyển chứa sản phẩm — mở khi bấm số "Đang đi đường". */
export function ProductInTransitModal({
  productId,
  productName,
  productCode,
  branchId,
  branchName,
  onClose,
  zIndex = 50,
}: ProductInTransitModalProps) {
  // Ai có products:view đều xem được số liệu; chỉ người có quyền Chuyển hàng
  // mới bấm mã phiếu sang trang chuyển hàng.
  const canViewTransfers = usePermission("transfers", "view");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [onClose]);
  const { data, isLoading, isError, error } = useTransfersInTransitByProduct(
    productId,
    branchId,
  );

  const transfers = data?.data || [];
  const totalQty = data?.sumQuantity ?? 0;

  return createPortal(
    <div
      data-product-detail-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Phiếu chuyển hàng đang đi đường"
      style={{ zIndex }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              Phiếu chuyển hàng đang đi đường
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
                  • Chuyển tới: {branchName}
                </span>
              ) : null}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Đóng phiếu chuyển hàng đang đi đường"
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
                "Không thể tải danh sách phiếu chuyển hàng"}
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              Không có phiếu chuyển hàng nào đang đi đường cho sản phẩm này
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Mã phiếu
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Ngày chuyển
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Từ chi nhánh
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Tới chi nhánh
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    SL chuyển
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => (
                  <tr key={t.transferId} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                      {canViewTransfers ? (
                        <Link
                          href={`/san-pham/chuyen-hang?Code=${t.code}`}
                          target="_blank"
                          className="text-brand hover:underline">
                          {t.code}
                        </Link>
                      ) : (
                        <span className="text-gray-900">{t.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {formatDateTime(t.transferredDate || t.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {t.fromBranchName || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {t.toBranchName || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900 whitespace-nowrap">
                      {Number(t.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {t.statusLabel || "Đang chuyển"}
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
            {transfers.length > 0
              ? `${transfers.length} phiếu — Tổng SL đang đi đường: ${totalQty.toLocaleString()}`
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
    document.body,
  );
}
