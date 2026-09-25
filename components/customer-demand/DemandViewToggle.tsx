"use client";

export type DemandViewMode = "vouchers" | "summary" | "customerSummary";

export function DemandViewToggle({
  mode,
  onChange,
}: {
  mode: DemandViewMode;
  onChange: (mode: DemandViewMode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border bg-gray-50 p-0.5">
      {(
        [
          ["vouchers", "Phiếu"],
          ["summary", "Tổng cần đặt"],
          ["customerSummary", "Theo khách, theo tháng"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            mode === value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}
