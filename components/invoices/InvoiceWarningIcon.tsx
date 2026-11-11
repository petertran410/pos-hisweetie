"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { useEscapeClose } from "@/lib/hooks/useEscapeClose";
import type { InvoiceListWarnings } from "@/lib/types/invoice";

const num = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
const signed = (n: number) => (n > 0 ? `+${num(n)}` : num(n));

interface Props {
  invoiceCode: string;
  warnings?: InvoiceListWarnings | null;
  /** Dữ liệu cũ chỉ có cờ, chưa có chi tiết. */
  hasPriceBookWarning?: boolean;
}

/** Icon ⚠ trên danh sách hóa đơn; bấm mở hộp thoại liệt kê lý do (lệch giá bảng giá, lệch SL so với đơn đặt). */
export function InvoiceWarningIcon({ invoiceCode, warnings, hasPriceBookWarning }: Props) {
  const [open, setOpen] = useState(false);
  const price = warnings?.price ?? [];
  const quantity = warnings?.quantity ?? [];
  const hasPrice = price.length > 0 || !!hasPriceBookWarning;
  if (!hasPrice && quantity.length === 0) return null;

  const reasons = [hasPrice ? "bán thấp hơn giá bảng giá" : null, quantity.length > 0 ? "số lượng khác đơn đặt hàng" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Xem lý do cảnh báo"
        aria-label={`Cảnh báo: ${reasons}. Xem chi tiết`}
        aria-haspopup="dialog"
        className="inline-flex rounded p-0.5 hover:bg-yellow-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <AlertTriangle className="h-4 w-4 text-yellow-500 fill-yellow-100" aria-hidden />
      </button>
      {open &&
        createPortal(
          <WarningModal
            invoiceCode={invoiceCode}
            warnings={warnings}
            hasPrice={hasPrice}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
    </>
  );
}

function WarningModal({
  invoiceCode,
  warnings,
  hasPrice,
  onClose,
}: {
  invoiceCode: string;
  warnings?: InvoiceListWarnings | null;
  hasPrice: boolean;
  onClose: () => void;
}) {
  useEscapeClose(onClose);
  const price = warnings?.price ?? [];
  const quantity = warnings?.quantity ?? [];
  // Dữ liệu cũ (trước khi có đơn tách giao) không có field này
  const previousCodes = warnings?.previousInvoiceCodes ?? [];
  const split = previousCodes.length > 0;
  const titleId = `invoice-warning-${invoiceCode}`;

  return (
    // Portal vẫn nổi bọt sự kiện React lên dòng bảng → chặn để không mở/đóng chi tiết hóa đơn
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-yellow-500 fill-yellow-100" aria-hidden />
            Cảnh báo hóa đơn {invoiceCode}
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
          {hasPrice && (
            <section>
              <h3 className="mb-2 font-semibold text-gray-800">
                Bán thấp hơn giá bảng giá
                {price.length > 0 && <span className="ml-1 font-normal text-gray-500">({price.length} sản phẩm)</span>}
              </h3>
              {price.length === 0 ? (
                <p className="text-gray-500">Có sản phẩm bán thấp hơn giá niêm yết của bảng giá.</p>
              ) : (
                <WarningTable
                  headers={["Giá bán", "Giá bảng giá", "Chênh lệch"]}
                  rows={price.map((p) => ({
                    code: p.productCode,
                    name: p.productName,
                    cells: [
                      <span key="a" className="text-red-600">{num(p.price)}</span>,
                      <span key="b">{num(p.listPrice)}</span>,
                      <span key="c" className="font-semibold text-red-600">{signed(p.price - p.listPrice)}</span>,
                    ],
                  }))}
                />
              )}
            </section>
          )}

          {quantity.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold text-gray-800">
                Số lượng khác đơn đặt hàng{warnings?.orderCode ? ` ${warnings.orderCode}` : ""}
                <span className="ml-1 font-normal text-gray-500">({quantity.length} sản phẩm)</span>
              </h3>
              {split && (
                <p className="mb-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  Đơn tách giao: so với SL đặt còn lại = SL đặt − SL đã xuất ở {previousCodes.join(", ")}.
                </p>
              )}
              <WarningTable
                headers={["SL hoá đơn", split ? "SL đặt còn lại" : "SL đặt hàng", "Chênh lệch"]}
                rows={quantity.map((q) => {
                  const diff = q.invoiceQuantity - q.expectedQuantity;
                  const unit = q.unit ? <span className="ml-1 text-xs text-gray-400">{q.unit}</span> : null;
                  return {
                    code: q.productCode,
                    name: q.productName,
                    cells: [
                      <span key="a">{num(q.invoiceQuantity)}{unit}</span>,
                      <span
                        key="b"
                        title={split ? `Đặt ${num(q.orderQuantity)} − đã xuất ${num(q.previousQuantity)}` : undefined}>
                        {num(q.expectedQuantity)}
                        {unit}
                      </span>,
                      <span
                        key="c"
                        title={diff < 0 ? "Hóa đơn ít hơn cần giao" : "Hóa đơn nhiều hơn cần giao"}
                        className={`font-semibold ${diff < 0 ? "text-red-600" : "text-orange-600"}`}>
                        {signed(diff)}
                      </span>,
                    ],
                  };
                })}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Chênh lệch = SL hoá đơn − {split ? "SL đặt còn lại" : "SL đặt hàng"}:{" "}
                <span className="text-red-600">đỏ</span> là hóa đơn thiếu, <span className="text-orange-600">cam</span> là
                hóa đơn dư.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function WarningTable({
  headers,
  rows,
}: {
  headers: [string, string, string];
  rows: { code: string; name: string; cells: React.ReactNode[] }[];
}) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-28" />
          <col />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-24" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-semibold text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Mã SP</th>
            <th className="px-3 py-2 text-left">Tên sản phẩm</th>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={`${r.code}-${i}`} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-700">{r.code}</td>
              <td className="truncate px-3 py-2 text-gray-700" title={r.name}>
                {r.name}
              </td>
              {r.cells.map((c, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
