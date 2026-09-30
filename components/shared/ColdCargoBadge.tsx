import { Snowflake } from "lucide-react";

interface ColdCargoProductLine {
  product?: {
    cargoType?: string | null;
  } | null;
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
