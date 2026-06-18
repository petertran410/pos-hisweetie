"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useInvoice } from "@/lib/hooks/useInvoices";
import { useOrder } from "@/lib/hooks/useOrders";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { useConsignment } from "@/lib/hooks/useConsignments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildCodeHref, type CodeEntity } from "@/components/shared/CodeLink";

type DocType = "invoice" | "order" | "return-order" | "consignment";

interface DocumentPreviewModalProps {
  type: DocType;
  id: number;
  code: string;
  onClose: () => void;
}

const TITLE: Record<DocType, string> = {
  invoice: "Hóa đơn",
  order: "Đặt hàng",
  "return-order": "Phiếu trả hàng",
  consignment: "Phiếu ký gửi",
};

/**
 * Popup xem nhanh chi tiết hóa đơn / đặt hàng / phiếu trả hàng (giống KiotViet).
 * Read-only. Nút "Mở phiếu" mở trang chi tiết đầy đủ ở tab mới.
 */
export function DocumentPreviewModal({
  type,
  id,
  code,
  onClose,
}: DocumentPreviewModalProps) {
  const invoiceQuery = useInvoice(type === "invoice" ? id : 0);
  const orderQuery = useOrder(type === "order" ? id : 0);
  const returnQuery = useReturnOrder(type === "return-order" ? id : 0);
  const consignmentQuery = useConsignment(type === "consignment" ? id : 0);

  const query =
    type === "invoice"
      ? invoiceQuery
      : type === "order"
        ? orderQuery
        : type === "return-order"
          ? returnQuery
          : consignmentQuery;

  const doc: any = query.data;
  const isLoading = query.isLoading;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleOpen = () => {
    window.open(buildCodeHref(type as CodeEntity, code), "_blank");
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-[1000px] max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {TITLE[type]}
            </h2>
            <span className="text-base font-medium text-brand">{code}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
              <span className="text-gray-600">Đang tải thông tin...</span>
            </div>
          ) : !doc ? (
            <div className="py-12 text-center text-red-600">
              Không tìm thấy thông tin phiếu
            </div>
          ) : type === "return-order" ? (
            <ReturnContent doc={doc} />
          ) : (
            <SaleContent type={type} doc={doc} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t shrink-0">
          <button
            onClick={handleOpen}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors flex items-center gap-1.5 shadow-sm">
            <ExternalLink className="w-4 h-4" />
            Mở phiếu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Nội dung cho hóa đơn / đặt hàng / ký gửi (cùng shape field). */
function SaleContent({ type, doc }: { type: DocType; doc: any }) {
  const dateValue =
    type === "invoice"
      ? doc.purchaseDate
      : type === "consignment"
        ? doc.consignDate
        : doc.orderDate;
  const details: any[] =
    (type === "order" || type === "consignment" ? doc.items : doc.details) ||
    [];

  const dateLabel =
    type === "invoice"
      ? "Ngày bán"
      : type === "consignment"
        ? "Ngày ký gửi"
        : "Ngày đặt";

  return (
    <div className="space-y-4">
      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
        <InfoItem label="Khách hàng" value={doc.customer?.name || "Khách lẻ"} />
        <InfoItem label="Người tạo" value={doc.creator?.name || "-"} />
        <InfoItem
          label="Người bán"
          value={doc.soldBy?.name || doc.creator?.name || "-"}
        />
        <InfoItem
          label={dateLabel}
          value={dateValue ? formatDate(dateValue) : "-"}
        />
        <InfoItem
          label="Bảng giá"
          value={doc.priceBookName || "Bảng giá chung"}
        />
        <InfoItem label="Chi nhánh" value={doc.branch?.name || "-"} />
      </div>

      {/* Products */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-700">
              <th className="px-2 py-2 text-center">STT</th>
              <th className="px-2 py-2 text-left">Mã hàng</th>
              <th className="px-2 py-2 text-left">Tên hàng</th>
              <th className="px-2 py-2 text-center">Số lượng</th>
              <th className="px-2 py-2 text-right">Đơn giá</th>
              <th className="px-2 py-2 text-right">Giảm giá</th>
              <th className="px-2 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {details.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-center text-sm">{index + 1}</td>
                <td className="px-2 py-2 text-sm text-brand font-medium">
                  {item.product?.code || item.productCode || "-"}
                </td>
                <td className="px-2 py-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {item.product?.name || item.productName}
                  </p>
                  {item.note && (
                    <p className="text-xs text-gray-500 italic mt-0.5">
                      {item.note}
                    </p>
                  )}
                </td>
                <td className="px-2 py-2 text-center text-sm">
                  {item.quantity}
                </td>
                <td className="px-2 py-2 text-right text-sm">
                  {formatCurrency(Number(item.price))}
                </td>
                <td className="px-2 py-2 text-right text-sm">
                  {item.discount ? formatCurrency(Number(item.discount)) : "-"}
                </td>
                <td className="px-2 py-2 text-right text-sm font-semibold text-brand">
                  {formatCurrency(Number(item.totalPrice))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-full md:w-96 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              Tổng tiền hàng ({details.length}):
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(Number(doc.totalAmount))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Giảm giá:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(Number(doc.discount))}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600">Tổng cộng:</span>
            <span className="font-bold text-brand">
              {formatCurrency(Number(doc.grandTotal))}
            </span>
          </div>
          {type === "invoice" && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Khách đã trả:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(Number(doc.paidAmount))}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-red-200">
                <span className="font-bold text-gray-900">Khách còn nợ:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(Number(doc.debtAmount))}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {doc.description && (
        <div className="text-sm">
          <span className="text-gray-500">Ghi chú: </span>
          <span className="text-gray-900">{doc.description}</span>
        </div>
      )}
    </div>
  );
}

/** Nội dung cho phiếu trả hàng. */
function ReturnContent({ doc }: { doc: any }) {
  const details: any[] = doc.details || [];
  const refundAmount = Number(doc.refundAmount || doc.totalReturnAmount || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
        <InfoItem label="Khách hàng" value={doc.customer?.name || "Khách lẻ"} />
        <InfoItem
          label="Hóa đơn"
          value={
            doc.invoice?.code ||
            [
              ...new Set(details.map((d) => d.invoiceCode).filter(Boolean)),
            ].join(", ") ||
            "-"
          }
        />
        <InfoItem
          label="Ngày trả"
          value={doc.createdAt ? formatDate(doc.createdAt) : "-"}
        />
        <InfoItem label="Chi nhánh" value={doc.branch?.name || "-"} />
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-700">
              <th className="px-2 py-2 text-left">Sản phẩm</th>
              <th className="px-2 py-2 text-right">Số lượng</th>
              <th className="px-2 py-2 text-right">Giá nhập lại</th>
              <th className="px-2 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {details.map((d, index) => (
              <tr key={d.id ?? index} className="hover:bg-gray-50">
                <td className="px-2 py-2 text-sm">
                  <p className="font-medium text-gray-900">{d.productName}</p>
                  <p className="text-xs text-gray-500">{d.productCode}</p>
                </td>
                <td className="px-2 py-2 text-right text-sm">
                  {d.quantity ?? d.returnQuantity ?? "-"}
                </td>
                <td className="px-2 py-2 text-right text-sm">
                  {formatCurrency(Number(d.price || 0))}
                </td>
                <td className="px-2 py-2 text-right text-sm font-semibold text-brand">
                  {formatCurrency(
                    Number(
                      d.totalPrice ??
                        Number(d.price || 0) * Number(d.quantity || 0)
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full md:w-96 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between pt-1">
            <span className="font-bold text-gray-900">Tổng tiền hoàn trả:</span>
            <span className="font-bold text-green-600">
              {formatCurrency(refundAmount)}
            </span>
          </div>
        </div>
      </div>

      {doc.note && (
        <div className="text-sm">
          <span className="text-gray-500">Ghi chú: </span>
          <span className="text-gray-900">{doc.note}</span>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-1">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
