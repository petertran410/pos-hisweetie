"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, RefreshCw, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import type {
  LarkImportJobPhase,
  LarkImportJobStatus,
} from "@/lib/api/internal-finance";
import {
  invalidateInternalFinance,
  useLarkImportStatus,
  useStartLarkImport,
} from "@/lib/hooks/useInternalFinance";

const IMPORT_SOURCES = [
  "FUEL",
  "VEHICLE_CARE",
  "EXPENSE_HN",
  "EXPENSE_SG",
  "EXPENSE_VP",
];

const SOURCE_LABELS: Record<string, string> = {
  EXPENSE_HN: "Chi Kho Hà Nội",
  EXPENSE_SG: "Chi Kho Sài Gòn",
  EXPENSE_VP: "Chi văn phòng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
};

const PHASE_LABELS: Record<LarkImportJobPhase, string> = {
  IDLE: "",
  QUEUED: "Đang chuẩn bị...",
  DATA: "Đang đọc dữ liệu Lark...",
  TRANSACTIONS: "Đang ghi sổ quỹ...",
  ATTACHMENTS: "Đang tải chứng từ...",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
};

function progressText(status: LarkImportJobStatus) {
  const label = PHASE_LABELS[status.phase];
  if (status.phase === "ATTACHMENTS" && status.attachmentsTotal > 0) {
    return `${label} ${status.attachmentsDownloaded}/${status.attachmentsTotal}`;
  }
  return label;
}

export function LarkFinanceSyncCard() {
  const queryClient = useQueryClient();
  const status = useLarkImportStatus();
  const start = useStartLarkImport();
  const handledRunId = useRef<string | null>(
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem("lark-finance-sync-handled-run"),
  );
  const data = status.data;
  const running = Boolean(data?.running) || start.isPending;

  useEffect(() => {
    if (!data || data.running || !data.runId) return;
    if (data.dryRun) return;
    if (handledRunId.current === data.runId) return;
    handledRunId.current = data.runId;
    window.sessionStorage.setItem("lark-finance-sync-handled-run", data.runId);
    if (data.phase !== "COMPLETED") return;
    invalidateInternalFinance(queryClient);
    void Swal.fire({
      title: "Đã đồng bộ dữ liệu Lark",
      html: `<div style="text-align:left;font-size:14px;line-height:1.7">
        <div><span style="color:#64748b">Tạo mới:</span> <strong>${data.created}</strong></div>
        <div><span style="color:#64748b">Cập nhật:</span> <strong>${data.updated}</strong></div>
        <div><span style="color:#64748b">Giao dịch quỹ:</span> <strong>${data.fundTransactions}</strong></div>
        <div><span style="color:#64748b">Chứng từ:</span> <strong>${data.attachmentsDownloaded}/${data.attachmentsTotal}</strong></div>
        ${
          data.attachmentsFailed
            ? `<div style="color:#b91c1c">Chứng từ lỗi: <strong>${data.attachmentsFailed}</strong></div>`
            : ""
        }
      </div>`,
      icon: "success",
      confirmButtonColor: "#0f766e",
    });
  }, [data, queryClient]);

  const handlePreview = () => {
    start.mutate({ dryRun: true, sources: IMPORT_SOURCES });
  };

  const handleCommit = () => {
    start.mutate({ dryRun: false, sources: IMPORT_SOURCES });
  };

  const dryRunResult = data?.dryRun ? data.result : null;
  const canCommit =
    Boolean(dryRunResult) && !running && data?.phase === "COMPLETED";

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
            <Landmark className="h-6 w-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Nhập lịch sử Tài chính nội bộ
            </h2>
            <p className="max-w-2xl text-sm text-gray-500">
              Kiểm tra trước phiếu chi và xe cộ từ Lark. Dòng đã tick Đã chi được
              ghi sổ quỹ nội bộ, không tạo CashFlow. Chứng từ được tải nền sau khi
              nhập nên không phụ thuộc thời gian chờ của trình duyệt.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Kiểm tra dữ liệu
          </button>
          {canCommit && (
            <button
              type="button"
              onClick={handleCommit}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" />
              Nhập vào POS
            </button>
          )}
        </div>
      </div>

      {running && data ? (
        <p className="mt-3 text-sm text-gray-500">{progressText(data)}</p>
      ) : null}

      {dryRunResult?.tables?.length ? (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Nguồn</th>
                <th className="px-3 py-2 text-right">Đọc</th>
                <th className="px-3 py-2 text-right">Tạo</th>
                <th className="px-3 py-2 text-right">Cập nhật</th>
                <th className="px-3 py-2 text-right">Bỏ qua</th>
                <th className="px-3 py-2 text-right">Chứng từ chờ</th>
                <th className="px-3 py-2">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dryRunResult.tables.map((table) => (
                <tr key={`${table.source}-${table.tableName}`}>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {SOURCE_LABELS[table.source] || table.source}
                  </td>
                  <td className="px-3 py-2 text-right">{table.fetched}</td>
                  <td className="px-3 py-2 text-right">{table.created}</td>
                  <td className="px-3 py-2 text-right">{table.updated}</td>
                  <td className="px-3 py-2 text-right">{table.skipped}</td>
                  <td className="px-3 py-2 text-right">
                    {table.pendingAttachments}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {table.error ||
                      (table.unmatchedInvoices.length
                        ? `Chưa khớp hóa đơn: ${table.unmatchedInvoices
                            .slice(0, 3)
                            .join(", ")}`
                        : "Đã kiểm tra")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data?.phase === "FAILED" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            {data.error || "Không thể đồng bộ dữ liệu Lark."}
          </p>
        </div>
      )}
    </div>
  );
}
