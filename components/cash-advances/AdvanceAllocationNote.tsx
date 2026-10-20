import Link from "next/link";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";

/**
 * Phiếu chi kho đã chi từ tạm ứng: ghi rõ tạm ứng nào và phần còn lại (nếu
 * có) mới trừ quỹ.
 */
export function AdvanceAllocationNote({ row }: { row: InternalFinanceEntry }) {
  const allocations = row.advanceAllocations || [];
  if (!allocations.length) return null;
  const covered = allocations.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const fromFund = Number(row.amount || 0) - covered;
  return (
    <div className="mt-0.5 max-w-[170px] text-xs text-amber-700">
      Chi từ tạm ứng{" "}
      {allocations.map((item, index) => (
        <span key={item.id}>
          {index > 0 && ", "}
          <Link
            href={`/tai-chinh/tam-ung?Code=${encodeURIComponent(item.advance.code)}`}
            className="font-mono hover:underline">
            {item.advance.code}
          </Link>
        </span>
      ))}
      {fromFund > 0 && (
        <span className="text-gray-500">
          {" "}
          · {formatCurrency(covered)} từ tạm ứng, {formatCurrency(fromFund)} từ
          quỹ
        </span>
      )}
    </div>
  );
}
