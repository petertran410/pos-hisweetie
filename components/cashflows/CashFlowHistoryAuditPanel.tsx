"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import type {
  CashFlowHistoryAuditRow,
  CashFlowHistoryImportResult,
} from "@/lib/api/cashflow-history-audit";
import {
  useCashFlowHistoryAudit,
  useImportCashFlowHistory,
} from "@/lib/hooks/useCashFlowHistoryAudit";
import { useCan } from "@/lib/hooks/useCan";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

const getImportBlockReason = (row: CashFlowHistoryAuditRow) => {
  const candidateCount = row.candidates?.length ?? 0;
  if (!row.sourceRecordId) return "Thiếu record Lark";
  if (row.canceled) return "Đã hủy";
  if (row.branchId == null) return "Chưa map chi nhánh";
  if (!row.transDate) return "Thiếu ngày giao dịch";
  if (row.amount <= 0) return "Số tiền không hợp lệ";
  if (candidateCount > 0) return `${candidateCount} ứng viên POS`;
  return "Có thể import";
};

const isImportable = (row: CashFlowHistoryAuditRow) =>
  getImportBlockReason(row) === "Có thể import";

const SKIP_REASON_LABELS: Record<string, string> = {
  CANCELED: "đã hủy",
  UNKNOWN_BRANCH: "chưa map chi nhánh",
  INVALID_AMOUNT_OR_DATE: "thiếu ngày hoặc số tiền",
  POSSIBLE_DUPLICATE: "có ứng viên trùng",
  ALREADY_IMPORTED: "đã import trước đó",
};

function ImportResultSummary({
  result,
}: {
  result: CashFlowHistoryImportResult;
}) {
  const skippedCounts = result.skipped.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    },
    {},
  );
  const skippedText = Object.entries(skippedCounts)
    .map(
      ([reason, count]) =>
        `${SKIP_REASON_LABELS[reason] || reason}: ${count}`,
    )
    .join(", ");

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-green-50 px-4 py-2 text-xs">
      <span className="font-medium text-green-800">
        Kết quả import: {result.created.length} dòng được tạo
      </span>
      {result.skipped.length > 0 && (
        <span className="text-amber-800">
          Bỏ qua {result.skipped.length} dòng ({skippedText})
        </span>
      )}
    </div>
  );
}

export function CashFlowHistoryAuditPanel() {
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [importResult, setImportResult] =
    useState<CashFlowHistoryImportResult | null>(null);
  const query = useCashFlowHistoryAudit(pageToken);
  const importHistory = useImportCashFlowHistory();
  const canCreate = useCan("cash_flows", "create");
  const rows = query.data?.data ?? [];
  const selectableRows = useMemo(
    () =>
      rows.filter(
        (row): row is CashFlowHistoryAuditRow =>
          Boolean(row.sourceRecordId) && isImportable(row),
      ),
    [rows],
  );
  const selectableIds = useMemo(
    () =>
      selectableRows
        .map((row) => row.sourceRecordId)
        .filter((recordId): recordId is string => Boolean(recordId)),
    [selectableRows],
  );
  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((recordId) => selectedRecordIds.has(recordId));

  useEffect(() => {
    setSelectedRecordIds(new Set());
    setImportResult(null);
  }, [pageToken]);

  const toggleRecord = (recordId: string) => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (allSelectableSelected) {
        selectableIds.forEach((recordId) => next.delete(recordId));
      } else {
        selectableIds.forEach((recordId) => next.add(recordId));
      }
      return next;
    });
  };

  const handleImport = async () => {
    const recordIds = selectableIds.filter((recordId) =>
      selectedRecordIds.has(recordId),
    );
    if (recordIds.length === 0) {
      toast.error("Hãy chọn ít nhất một dòng đủ điều kiện để import");
      return;
    }

    const confirmation = await Swal.fire({
      title: "Xác nhận import lịch sử?",
      text: `Sẽ tạo ${recordIds.length} CashFlow mới trong sổ quỹ POS.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Import",
      cancelButtonText: "Hủy",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const result = await importHistory.mutateAsync({
        recordIds,
        confirm: true,
      });
      setImportResult(result);
      setSelectedRecordIds(new Set());
    } catch {
      // Hook đã hiển thị lỗi cho người dùng.
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Đối chiếu lịch sử Lark
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Chỉ đọc dữ liệu Lark và tìm CashFlow ứng viên, chưa import vào POS.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selectedRecordIds.size > 0 && (
            <span className="text-xs text-gray-500">
              Đã chọn {selectedRecordIds.size}
            </span>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={handleImport}
              disabled={
                selectedRecordIds.size === 0 || importHistory.isPending
              }
              title="Import các dòng đã chọn vào sổ quỹ"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              {importHistory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Import vào sổ quỹ
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedRecordIds(new Set());
              setImportResult(null);
              void query.refetch();
            }}
            disabled={query.isFetching || importHistory.isPending}
            title="Tải lại lịch sử"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {query.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Tải lại
          </button>
        </div>
      </div>

      {importResult && <ImportResultSummary result={importResult} />}

      <div className="min-h-0 flex-1 overflow-auto">
        {query.isLoading || (query.isFetching && rows.length === 0) ? (
          <div className="py-12 text-center text-gray-400">
            <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
            Đang đọc lịch sử Lark...
          </div>
        ) : query.isError ? (
          <div className="py-12 text-center text-red-600">
            Không đọc được lịch sử Lark
          </div>
        ) : (
          <table className="w-full min-w-[920px] text-sm">
            <thead className="sticky top-0 z-10 border-b bg-[var(--dt-bg-soft)]">
              <tr>
                <th className="w-10 px-3 py-2.5 text-left font-medium text-gray-500">
                  <input
                    type="checkbox"
                    checked={canCreate && allSelectableSelected}
                    onChange={toggleAll}
                    disabled={
                      !canCreate ||
                      selectableIds.length === 0 ||
                      importHistory.isPending
                    }
                    aria-label="Chọn các dòng đủ điều kiện"
                    className="h-4 w-4 accent-[var(--dt-brand)]"
                  />
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                  Mã Lark
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                  Chi nhánh
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                  Ngày
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500">
                  Số tiền
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                  Nguồn
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">
                  Ứng viên POS
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Không có dữ liệu trong trang hiện tại
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const recordId = row.sourceRecordId;
                  const canImportRow = isImportable(row);
                  const candidateCount = row.candidates?.length ?? 0;
                  return (
                  <tr
                    key={recordId || `${row.code}-${row.transDate}`}
                    className="border-b">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          recordId && selectedRecordIds.has(recordId),
                        )}
                        onChange={() => recordId && toggleRecord(recordId)}
                        disabled={
                          !canCreate ||
                          !recordId ||
                          !canImportRow ||
                          importHistory.isPending
                        }
                        aria-label={`Chọn ${row.code || recordId || "bản ghi Lark"}`}
                        className="h-4 w-4 accent-[var(--dt-brand)]"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {row.code || row.sourceRecordId || "-"}
                      {row.canceled && (
                        <span className="ml-2 text-xs text-red-600">Hủy</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.branchId ? (
                        `${row.branchName} (#${row.branchId})`
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {row.branchName || "Chưa map"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {formatDate(row.transDate)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${row.isReceipt ? "text-green-700" : "text-red-700"}`}>
                      {row.isReceipt ? "+" : "-"}
                      {row.amount.toLocaleString("vi-VN")}
                    </td>
                    <td className="max-w-64 px-3 py-2.5">
                      <div className="truncate" title={row.description || undefined}>
                        {row.description || row.type || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {canImportRow ? (
                        <span className="text-green-700">Có thể import</span>
                      ) : row.canceled ? (
                        <span className="text-red-700">Đã hủy</span>
                      ) : row.branchId == null ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Chưa map chi nhánh
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          {getImportBlockReason(row)}
                          {candidateCount > 0 && (
                            <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-gray-500">
          {query.data?.hasMore ? "Còn trang tiếp theo" : "Đã hết trang"}
        </span>
        <button
          type="button"
          onClick={() => setPageToken(query.data?.nextPageToken || undefined)}
          disabled={!query.data?.hasMore || query.isFetching}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          Trang tiếp
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
