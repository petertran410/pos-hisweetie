"use client";

import { useState, useEffect, Fragment } from "react";
import { useStockAudits } from "@/lib/hooks/useStockAudits";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { StockAuditDetailRow } from "./StockAuditDetailRow";
import { StockAuditForm } from "./StockAuditForm";
import { usePermission } from "@/lib/hooks/usePermissions";
import { formatCurrency } from "@/lib/utils";

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const STATUS_MAP: Record<number, { label: string; cls: string }> = {
  1: { label: "Phiếu tạm", cls: "bg-yellow-100 text-yellow-700" },
  2: { label: "Hoàn thành", cls: "bg-green-100 text-green-700" },
  3: { label: "Đã hủy", cls: "bg-red-100 text-red-700" },
};

const formatMoney = (n: number) => n.toLocaleString("vi-VN") + " đ";

export function StockAuditsTable({ filters }: { filters?: any }) {
  const { selectedBranch } = useBranchStore();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const canCreate = usePermission("stock_audits", "create");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const { data, isLoading } = useStockAudits({
    page,
    limit,
    search: debouncedSearch,
    branchIds: filters?.branchIds || undefined,
    branchId: !filters?.branchIds ? (filters?.branchId || selectedBranch?.id) : undefined,
    status: filters?.status,
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
    creatorId: filters?.creatorId,
    details: [],
  });

  const audits = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const colSpan = 10;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-gray-800">Kiểm kho</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người kiểm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tạo phiếu kiểm kho
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Mã phiếu
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Chi nhánh
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Người kiểm
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Ngày kiểm
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Số sản phẩm
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Tổng tồn kho ban đầu
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Tổng tồn kho thực tế
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Tổng số lượng lệch
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Tổng giá trị lệch
              </th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : audits.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Chưa có phiếu kiểm kho nào</div>
                </td>
              </tr>
            ) : (
              audits.map((audit) => {
                const isExpanded = expandedId === audit.id;
                const borderCls = isExpanded
                  ? "border-t-2 border-blue-500"
                  : "";
                const st = STATUS_MAP[audit.status] || STATUS_MAP[1];

                const totalSystemQuantityValue =
                  audit.details?.reduce(
                    (s, d) => s + Number(d.systemQuantity),
                    0
                  ) ?? 0;
                const totalActualQuantityValue =
                  audit.details?.reduce(
                    (s, d) => s + Number(d.actualQuantity),
                    0
                  ) ?? 0;
                const totalDiff =
                  audit.details?.reduce(
                    (s, d) => s + Number(d.difference),
                    0
                  ) ?? 0;
                const totalDiffValue =
                  audit.details?.reduce(
                    (s, d) => s + Number(d.differenceValue),
                    0
                  ) ?? 0;

                return (
                  <Fragment key={audit.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? "bg-blue-50" : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(audit.id)}>
                      <td
                        className={`px-4 py-2.5 ${isExpanded ? `${borderCls} border-l-2` : ""}`}>
                        {audit.code}
                      </td>
                      <td className={`px-4 py-2.5 ${borderCls}`}>
                        {audit.branchName}
                      </td>
                      <td className={`px-4 py-2.5 ${borderCls}`}>
                        {audit.createdByName}
                      </td>
                      <td className={`px-4 py-2.5 ${borderCls}`}>
                        {formatDateTime(audit.checkDate)}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${borderCls}`}>
                        {audit.details?.length || 0}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${borderCls}`}>
                        {totalSystemQuantityValue !== 0
                          ? formatCurrency(totalSystemQuantityValue)
                          : "-"}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${borderCls}`}>
                        {totalActualQuantityValue !== 0
                          ? formatCurrency(totalActualQuantityValue)
                          : "-"}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${borderCls}`}>
                        {totalDiff !== 0 ? formatCurrency(totalDiff) : "-"}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${borderCls}`}>
                        {totalDiffValue !== 0
                          ? formatCurrency(totalDiffValue)
                          : "-"}{" "}
                        đ
                      </td>
                      <td className={`px-4 py-2.5 text-center ${borderCls}`}>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <StockAuditDetailRow audit={audit} colSpan={colSpan} />
                    )}
                  </Fragment>
                );
              })
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
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            {[10, 15, 20, 50, 100].map((n) => (
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
                    ? "bg-blue-600 text-white border-blue-600"
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

      {/* Create Form Modal */}
      {showCreateForm && (
        <StockAuditForm onClose={() => setShowCreateForm(false)} />
      )}
    </div>
  );
}
