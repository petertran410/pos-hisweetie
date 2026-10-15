import { formatCurrency } from "@/lib/utils";

/**
 * Ô tổng của cột Số tiền khi bảng có cả thu lẫn chi: tổng thu (+, xanh) và
 * tổng chi (-, đỏ) của toàn bộ dòng khớp bộ lọc, chỉ hiện phần khác 0.
 */
export function AmountTotal({
  receipt,
  expense,
}: {
  receipt: number;
  expense: number;
}) {
  if (!receipt && !expense)
    return <span className="font-semibold text-gray-400">0</span>;
  return (
    <div className="flex flex-col items-end leading-tight">
      {receipt > 0 && (
        <span className="font-semibold text-green-700" title="Tổng thu">
          +{formatCurrency(receipt)}
        </span>
      )}
      {expense > 0 && (
        <span className="font-semibold text-red-600" title="Tổng chi">
          -{formatCurrency(expense)}
        </span>
      )}
    </div>
  );
}
