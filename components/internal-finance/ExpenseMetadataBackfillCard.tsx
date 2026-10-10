"use client";

import { ListChecks, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ExpenseMetadataBackfillReport } from "@/lib/api/internal-finance";
import { useBackfillExpenseMetadata } from "@/lib/hooks/useInternalFinance";

export function ExpenseMetadataBackfillCard() {
  const backfill = useBackfillExpenseMetadata();
  const [report, setReport] = useState<ExpenseMetadataBackfillReport | null>(
    null,
  );

  const run = (dryRun: boolean) =>
    backfill.mutate(dryRun, {
      onSuccess: (result) => {
        setReport(result);
        if (!result.dryRun) toast.success("Đã bổ sung dữ liệu phiếu chi");
      },
    });

  const pendingChanges = report
    ? report.payerFromPackingSlip +
      report.payerFromCreator +
      report.expenseItemDefaults +
      report.vehicleLinked +
      report.serviceTypesFilled
    : 0;
  const rows: Array<[string, number]> = report
    ? [
        ["Người chi lấy từ báo đơn", report.payerFromPackingSlip],
        ["Người chi = người tạo phiếu", report.payerFromCreator],
        ["Khoản mục mặc định", report.expenseItemDefaults],
        ["Phiếu xe gắn vào danh sách xe", report.vehicleLinked],
        ["Loại dịch vụ tách từ chữ", report.serviceTypesFilled],
      ]
    : [];

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
            <ListChecks className="h-6 w-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Bổ sung người chi, khoản mục, xe cho phiếu chi cũ
            </h2>
            <p className="max-w-2xl text-sm text-gray-500">
              Điền các cột mới cho phiếu chi đã có. Không đổi số tiền hay trạng
              thái. Chạy sau khi đã tạo danh sách xe ở trang Xe cộ.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => run(true)}
            disabled={backfill.isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {backfill.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kiểm tra
          </button>
          {report?.dryRun && pendingChanges > 0 && (
            <button
              type="button"
              onClick={() => run(false)}
              disabled={backfill.isPending}
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">
              Bổ sung
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {rows.map(([label, count]) => (
              <div key={label} className="rounded-lg border px-3 py-2">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-base font-semibold text-gray-900">
                  {count}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {report.dryRun
              ? "Kết quả kiểm tra, chưa ghi gì vào dữ liệu."
              : "Đã ghi các thay đổi trên."}
          </p>
          {report.unmatchedVehicles.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              <div className="font-medium">
                Tên xe chưa có trong danh sách xe (chi nhánh | tên xe: số phiếu)
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {report.unmatchedVehicles.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.duplicateVehicleExpenses.count > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              <div className="font-medium">
                {report.duplicateVehicleExpenses.count} cặp phiếu xe có thể đang
                bị nhập đôi (dòng phiếu chi Lark trùng một phiếu xe cùng chi
                nhánh, ngày và số tiền). Công cụ này không tự hủy bản nào.
              </div>
              <ul className="mt-1 max-h-40 list-disc overflow-auto pl-5 text-xs">
                {report.duplicateVehicleExpenses.sample.map((pair) => (
                  <li key={String(pair.expenseId)}>
                    {String(pair.date)} · {String(pair.expenseCode)} ↔{" "}
                    {String(pair.vehicleEntryCode)} ·{" "}
                    {Number(pair.amount).toLocaleString("en-US")} đ
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
