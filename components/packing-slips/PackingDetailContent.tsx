"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, Image as ImageIcon, Loader2, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";
import type { PackingItemType } from "@/lib/hooks/usePackingDetail";

interface PackingDetailContentProps {
  item: any;
  detail: any;
  isLoading?: boolean;
  onImageClick?: (url: string) => void;
  compact?: boolean;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 mb-2 min-w-0 border-b border-gray-200 pb-1 ${className}`}>
      <label className="block text-sm text-gray-500">{label}</label>
      <div className="block text-sm text-gray-900 break-words">{children}</div>
    </div>
  );
}

function textOrDash(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function feeText(enabled: boolean, amount: unknown) {
  if (!enabled) return "-";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "-";
  return `${formatCurrency(num)} đ`;
}

function paymentText(data: any) {
  if (data.paymentMethod === "cash") {
    return data.cashAmount != null
      ? `Tiền mặt · ${formatCurrency(data.cashAmount)} đ`
      : "Tiền mặt";
  }
  if (data.paymentMethod === "transfer") return "Chuyển khoản";
  return "-";
}

export function PackingDetailContent({
  item,
  detail,
  isLoading = false,
  onImageClick,
  compact = false,
}: PackingDetailContentProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const data = detail || item;
  const type = (data.type || item.type || "giao-hang") as PackingItemType;
  const invoices = data.invoices || [];
  const images = (data.images || []).filter((image: any) => image?.imageUrl);
  const expenseFiles = (data.expenseFiles || []).filter(
    (file: any) => file?.fileUrl
  );
  const imageCount = Number(data.imageCount ?? item?.imageCount ?? images.length) || 0;
  const showImageLoading = isLoading && images.length === 0 && imageCount > 0;
  const gridClass = compact
    ? "grid grid-cols-1 gap-x-6"
    : "grid grid-cols-3 gap-x-8";

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
          Đang tải chi tiết...
        </div>
      )}

      <div className={gridClass}>
        <Field label="Người tạo:">{textOrDash(data.creator?.name)}</Field>
        <Field label="Ngày tạo:">
          {data.createdAt ? formatDate(data.createdAt) : "-"}
        </Field>
        <Field label="Số kiện:">{textOrDash(data.numberOfPackages)}</Field>
        <Field label="Chi nhánh:">{textOrDash(data.branch?.name)}</Field>
        {type === "loading" ? (
          <Field label="Người loading:">
            {textOrDash(data.loadingBy?.name)}
          </Field>
        ) : null}
        <Field
          label="Ghi chú:"
          className={type === "loading" || compact ? "" : "col-span-2"}>
          {textOrDash(data.note)}
        </Field>
      </div>

      {type === "giao-hang" && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Thanh toán & phí
          </h4>
          <div className={gridClass}>
            <Field label="Hình thức:">{paymentText(data)}</Field>
            <Field label="Phí gửi bến:">
              {feeText(!!data.hasFeeGuiBen, data.feeGuiBen)}
            </Field>
            <Field label="Phí Grab:">
              {feeText(!!data.hasFeeGrab, data.feeGrab)}
            </Field>
            <Field label="Cước gửi hàng:">
              {feeText(!!data.hasCuocGuiHang, data.cuocGuiHang)}
            </Field>
            <Field label="Cước nhận hàng:">
              {feeText(!!data.hasCuocNhanHang, data.cuocNhanHang)}
            </Field>
            <Field label="Người chi:">{textOrDash(data.expensePayer?.name)}</Field>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Hóa đơn / Ký gửi ({invoices.length})
        </h4>
        {invoices.length === 0 ? (
          <p className="text-sm text-gray-500 border-b border-gray-200 pb-2">
            Không có hóa đơn hoặc ký gửi
          </p>
        ) : compact ? (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
            {invoices.map((entry: any, index: number) => {
              const document = entry.invoice || entry.consignment;
              if (!document) return null;
              return (
                <div
                  key={entry.id ?? index}
                  className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <CodeLink
                      entity={entry.consignment ? "consignment" : "invoice"}
                      code={document.code}
                    />
                    <p className="text-xs text-gray-500 truncate">
                      {document.customer?.name || "-"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {document.grandTotal != null
                      ? `${formatCurrency(document.grandTotal)} đ`
                      : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 w-14">
                    STT
                  </th>
                  <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700">
                    Mã
                  </th>
                  <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700">
                    Khách hàng
                  </th>
                  <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((entry: any, index: number) => {
                  const document = entry.invoice || entry.consignment;
                  return (
                    <tr key={entry.id ?? index} className="hover:bg-gray-50">
                      <td className="px-[10px] py-2 text-center text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-[10px] py-2 text-sm">
                        {document?.code ? (
                          <CodeLink
                            entity={entry.consignment ? "consignment" : "invoice"}
                            code={document.code}
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {document?.customer?.name || "-"}
                      </td>
                      <td className="px-[10px] py-2 text-right text-sm font-medium text-gray-900">
                        {document?.grandTotal != null
                          ? `${formatCurrency(document.grandTotal)} đ`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(images.length > 0 || expenseFiles.length > 0 || showImageLoading) && (
        <div className="space-y-4">
          {(images.length > 0 || showImageLoading) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Hình ảnh ({images.length || imageCount})
              </h4>
              {showImageLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  Đang tải hình ảnh...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {images.map((image: any, index: number) => (
                    <button
                      type="button"
                      key={image.id ?? image.imageUrl}
                      onClick={() =>
                        onImageClick
                          ? onImageClick(image.imageUrl)
                          : setViewingImage(image.imageUrl)
                      }
                      className="w-24 h-24 overflow-hidden border border-gray-200 bg-gray-50 hover:border-brand">
                      <img
                        src={image.imageUrl}
                        alt={`Hình ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {expenseFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Chứng từ chi phí ({expenseFiles.length})
              </h4>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {expenseFiles.map((file: any) => (
                  <a
                    key={file.id ?? file.fileUrl}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-gray-50">
                    {file.fileType?.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {file.fileName || file.fileUrl.split("/").pop() || "File"}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewingImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <img
              src={viewingImage}
              alt=""
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
