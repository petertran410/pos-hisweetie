"use client";

import { PackageX, Snowflake, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceListWarnings } from "@/lib/types/invoice";
import { InvoiceWarningIcon } from "./InvoiceWarningIcon";

/**
 * Các cờ backend gắn theo trang — dùng chung cho Hóa đơn, Hóa đơn VAT (attachPriceBookWarnings)
 * và Đặt hàng (orders findAll: chỉ có lệch giá, phí ship, hàng lạnh). Cờ nào không có thì không hiện icon.
 */
interface InvoiceAlertSource {
  code: string;
  shippingFee?: number | string | null;
  hasPriceBookWarning?: boolean;
  hasOrphanedPacking?: boolean;
  hasShippingFee?: boolean;
  hasColdItems?: boolean;
  warnings?: InvoiceListWarnings | null;
}

/**
 * Cột icon "Cảnh báo hóa đơn" trên bảng danh sách — cùng icon/màu với nhóm lọc ở
 * InvoicesSidebar: ⚠ lệch giá, hộp lệch SL (bấm xem chi tiết), PackageX hủy còn
 * giao hàng, Truck có phí ship, Snowflake hàng lạnh (rê chuột xem lý do).
 */
export function InvoiceAlertIcons({
  invoice,
  documentLabel,
}: {
  invoice: InvoiceAlertSource;
  /** Loại chứng từ ở tiêu đề hộp thoại lệch giá (mặc định "hóa đơn"). */
  documentLabel?: string;
}) {
  const fee = Number(invoice.shippingFee ?? 0);

  return (
    <div className="flex items-center justify-center gap-0.5">
      <InvoiceWarningIcon
        invoiceCode={invoice.code}
        documentLabel={documentLabel}
        warnings={invoice.warnings}
        hasPriceBookWarning={invoice.hasPriceBookWarning}
      />
      {invoice.hasOrphanedPacking && (
        <AlertIcon label="Hóa đơn đã hủy nhưng còn phiếu giao hàng">
          <PackageX className="h-4 w-4 text-red-500" aria-hidden />
        </AlertIcon>
      )}
      {invoice.hasShippingFee && (
        <AlertIcon label={fee > 0 ? `Có phí ship: ${formatCurrency(fee)}` : "Có phí ship"}>
          <Truck className="h-4 w-4 text-red-500" aria-hidden />
        </AlertIcon>
      )}
      {invoice.hasColdItems && (
        <AlertIcon label="Có sản phẩm hàng lạnh">
          <Snowflake className="h-4 w-4 text-red-500" aria-hidden />
        </AlertIcon>
      )}
    </div>
  );
}

function AlertIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span role="img" title={label} aria-label={label} className="inline-flex p-0.5">
      {children}
    </span>
  );
}
