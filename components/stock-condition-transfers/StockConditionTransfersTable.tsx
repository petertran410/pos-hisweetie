"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import {
  useStockConditionTransfers,
  useExportStockConditionTransfers,
} from "@/lib/hooks/useStockConditionTransfers";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Loader2,
} from "lucide-react";
import { StockConditionTransferDetailRow } from "./StockConditionTransferDetailRow";
import { StockConditionTransferForm } from "./StockConditionTransferForm";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "@/components/shared/CodeLink";
import { BUCKET_LABELS } from "@/lib/api/stock-condition-transfers";

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

function StatusBadge({ status }: { status: number }) {
  const cfg =
    status === 3
      ? { cls: "bg-red-100 text-red-700", label: "Đã hủy" }
      : status === 2
        ? { cls: "bg-green-100 text-green-700", label: "Đã duyệt" }
        : { cls: "bg-amber-100 text-amber-700", label: "Chờ duyệt" };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function StockConditionTransfersTable({ filters }: { filters?: any }) {
  const { selectedBranch } = useBranchStore();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const canCreate = usePermission("stock_condition_transfers", "create");
  const canExport = usePermission("stock_condition_transfers", "export");

  const { exportToFile, isExporting } = useExportStockConditionTransfers();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const commonFilters = {
    search: filters?.search || debouncedSearch || undefined,
    branchIds: filters?.branchIds || undefined,
    branchId: !filters?.branchIds
      ? filters?.branchId || selectedBranch?.id
      : undefined,
    status: filters?.status,
    toBucket: filters?.toBucket,
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
    creatorId: filters?.creatorId,
    productId: filters?.productId,
  };

  const { data, isLoading } = useStockConditionTransfers({
    page,
    limit,
    ...commonFilters,
  });

  const transfers = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const colSpan = 8;

  if (showCreateForm) {
    return (
      <StockConditionTransferForm onClose={() => setShowCreateForm(false)} />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Chuyển loại tồn
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người tạo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded text-sm w-64 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canExport && (
            <div ref={exportMenuRef} className="relative">
              <button
                onClick={() => exportToFile(commonFilters)}
                disabled={isExporting}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600 disabled:opacity-50">
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? "Đang xuất..." : "Xuất file"}
              </button>
            </div>
          )}
          {canCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded text-sm hover:bg-brand-dark">
              <Plus className="w-4 h-4" />
              Tạo phiếu
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Mã phiếu
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Chi nhánh
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Người tạo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Ngày
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                Số SP
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Ghi chú
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">
                Trạng thái
              </th>
              <th className="px-4 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Chưa có phiếu nào</div>
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <Fragment key={t.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      expandedId === t.id
                        ? "bg-brand-soft"
                        : "border-b hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(t.id)}>
                    <td
                      className={`px-4 py-2.5 text-sm ${expandedId === t.id ? "border-t-2 border-l-2 border-brand" : ""}`}>
                      <CodeLink
                        entity="stock-condition-transfer"
                        code={t.code}
                      />
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      {t.branchName}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      {t.createdByName}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      {formatDateTime(t.transferDate)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm text-right ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      {t.details?.length || 0}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm text-gray-500 truncate max-w-[200px] ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      {t.note || "-"}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm text-center ${expandedId === t.id ? "border-t-2 border-brand" : ""}`}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td
                      className={`px-4 py-2.5 ${expandedId === t.id ? "border-t-2 border-r-2 border-brand" : ""}`}>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === t.id ? "rotate-180" : ""}`}
                      />
                    </td>
                  </tr>
                  {expandedId === t.id && (
                    <StockConditionTransferDetailRow
                      transferId={t.id}
                      colSpan={colSpan}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
            {[10, 15, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.min(
              Math.max(page - 2 + i, i + 1),
              totalPages - (Math.min(5, totalPages) - 1 - i)
            );
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                  p === page
                    ? "bg-brand text-white border-brand"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-gray-400">
          Trang {page}/{totalPages}
          {total > 0 ? ` · ${total} phiếu` : ""}
        </span>
      </div>
    </div>
  );
}
