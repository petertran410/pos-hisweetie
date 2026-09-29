"use client";

import { ExternalLink, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CodeLink } from "@/components/shared/CodeLink";
import type { PackingItemType } from "@/lib/hooks/usePackingDetail";

interface PackingDetailContentProps {
  item: any;
  detail: any;
  isLoading?: boolean;
  onImageClick?: (url: string) => void;
  compact?: boolean;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right break-words">
        {String(value)}
      </span>
    </div>
  );
}

function typeLabel(type: PackingItemType) {
  if (type === "dong-hang") return "Đóng hàng";
  if (type === "loading") return "Loading";
  return "Giao hàng";
}

export function PackingDetailContent({
  item,
  detail,
  isLoading = false,
  onImageClick,
  compact = false,
}: PackingDetailContentProps) {
  const data = detail || item;
  const type = (data.type || item.type || "giao-hang") as PackingItemType;
  const invoices = data.invoices || [];
  const images = data.images || [];
  const expenseFiles = data.expenseFiles || [];
  const panelClass = compact
    ? "bg-gray-50 rounded-xl p-3"
    : "bg-white rounded-xl border border-gray-200 p-4";

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-brand" />
          Đang tải chi tiết...
        </div>
      )}

      <div className={`${panelClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2`}>
        <Row label="Loại" value={typeLabel(type)} />
        <Row label="Chi nhánh" value={data.branch?.name} />
        <Row label="Người tạo" value={data.creator?.name} />
        <Row
          label="Ngày tạo"
          value={
            data.createdAt
              ? new Date(data.createdAt).toLocaleString("vi-VN")
              : null
          }
        />
        <Row label="Số kiện" value={data.numberOfPackages} />
        {type === "loading" && (
          <Row label="Người loading" value={data.loadingBy?.name} />
        )}
        <div className="sm:col-span-2 lg:col-span-4">
          <Row label="Ghi chú" value={data.note} />
        </div>
      </div>

      {type === "giao-hang" && (
        <div className={panelClass}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Thanh toán & phí
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2">
            <Row
              label="Hình thức"
              value={
                data.paymentMethod === "cash"
                  ? `Tiền mặt - ${formatCurrency(data.cashAmount)} đ`
                  : data.paymentMethod === "transfer"
                    ? "Chuyển khoản"
                    : null
              }
            />
            {data.hasFeeGuiBen && (
              <Row label="Phí gửi bến" value={`${formatCurrency(data.feeGuiBen)} đ`} />
            )}
            {data.hasFeeGrab && (
              <Row label="Phí Grab" value={`${formatCurrency(data.feeGrab)} đ`} />
            )}
            {data.hasCuocGuiHang && (
              <Row label="Cước gửi hàng" value={`${formatCurrency(data.cuocGuiHang)} đ`} />
            )}
            {data.hasCuocNhanHang && (
              <Row label="Cước nhận hàng" value={`${formatCurrency(data.cuocNhanHang)} đ`} />
            )}
            <Row label="Người chi" value={data.expensePayer?.name} />
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div className={panelClass}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Hóa đơn / Ký gửi ({invoices.length})
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {invoices.map((entry: any, index: number) => {
              const document = entry.invoice || entry.consignment;
              if (!document) return null;
              return (
                <div
                  key={entry.id ?? index}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    {entry.consignment ? (
                      <CodeLink entity="consignment" code={document.code} />
                    ) : (
                      <CodeLink entity="invoice" code={document.code} />
                    )}
                    <p className="text-xs text-gray-500 truncate">
                      {document.customer?.name || "-"}
                    </p>
                  </div>
                  {document.grandTotal != null && (
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatCurrency(document.grandTotal)} đ
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(images.length > 0 || expenseFiles.length > 0) && (
        <div className={`${panelClass} grid grid-cols-1 lg:grid-cols-2 gap-4`}>
          {images.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Hình ảnh ({images.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((image: any) => (
                  <button
                    type="button"
                    key={image.id ?? image.imageUrl}
                    onClick={() =>
                      onImageClick
                        ? onImageClick(image.imageUrl)
                        : window.open(image.imageUrl, "_blank", "noopener,noreferrer")
                    }
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={image.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {expenseFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Chứng từ chi phí ({expenseFiles.length})
              </p>
              <div className="space-y-2">
                {expenseFiles.map((file: any) => (
                  <a
                    key={file.id ?? file.fileUrl}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-brand hover:bg-brand-soft">
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
    </div>
  );
}
