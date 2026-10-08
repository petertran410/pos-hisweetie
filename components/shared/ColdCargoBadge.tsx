import { Snowflake } from "lucide-react";
import type { ColdCargoItem } from "@/lib/types/cold-cargo-warning";

interface ColdCargoProductLine {
  product?: {
    cargoType?: string | null;
  } | null;
}

interface ColdCargoInvoiceSelection {
  id: number;
  code: string;
  hasColdItems?: boolean;
  coldItemCount?: number;
  coldItems?: ColdCargoItem[];
}

export function ColdCargoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600 ${className}`}
      title="Hàng lạnh">
      <Snowflake className="h-3 w-3 shrink-0" aria-hidden="true" />
      Hàng lạnh
    </span>
  );
}

export function ColdCargoSummary({
  items,
  className = "",
}: {
  items: ColdCargoProductLine[];
  className?: string;
}) {
  const coldItemCount = items.filter(
    (item) => item.product?.cargoType === "COLD"
  ).length;

  if (coldItemCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ${className}`}>
      <Snowflake className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Đơn có hàng lạnh</span>
      <span className="ml-auto text-xs font-medium text-red-600">
        {coldItemCount} mặt hàng
      </span>
    </div>
  );
}

export function ColdCargoSelectionWarning({
  invoices,
  fallbackItems = [],
}: {
  invoices: ColdCargoInvoiceSelection[];
  fallbackItems?: ColdCargoItem[];
}) {
  const invoiceItems = invoices.flatMap((invoice) => invoice.coldItems || []);
  const coldItems = [...fallbackItems, ...invoiceItems].filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.invoiceId === item.invoiceId &&
          candidate.productId === item.productId &&
          candidate.productCode === item.productCode
      ) === index
  );
  const coldInvoices = invoices.filter(
    (invoice) =>
      invoice.hasColdItems ||
      Number(invoice.coldItemCount) > 0 ||
      (invoice.coldItems?.length || 0) > 0
  );

  if (coldInvoices.length === 0 && coldItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-red-700">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Snowflake className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Hàng lạnh cần lưu ý</span>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        {coldItems.length > 0
          ? coldItems.map((item, index) => (
              <div key={`${item.invoiceId}-${item.productId ?? index}`}>
                <span className="font-medium">
                  {item.invoiceCode || "Hóa đơn"}
                </span>
                <span>: {item.productCode || item.productName || "Sản phẩm lạnh"}</span>
              </div>
            ))
          : coldInvoices.map((invoice) => (
              <div key={invoice.id}>{invoice.code}: có hàng lạnh</div>
            ))}
      </div>
    </div>
  );
}
