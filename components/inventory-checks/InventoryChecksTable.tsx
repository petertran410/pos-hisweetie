"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useInventoryChecks } from "@/lib/hooks/useInventoryChecks";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { InventoryCheckDetailRow } from "./InventoryCheckDetailRow";
import { InventoryCheckForm } from "./InventoryCheckForm";
import { usePermission } from "@/lib/hooks/usePermissions";

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function InventoryChecksTable({ filters }: { filters?: any }) {
  const { selectedBranch } = useBranchStore();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const canCreate = usePermission("inventory_checks", "create");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useInventoryChecks({
    page,
    limit,
    search: debouncedSearch,
    branchId: filters?.branchId || selectedBranch?.id,
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
  });

  const checks = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const colSpan = 7;

  if (showCreateForm) {
    return <InventoryCheckForm onClose={() => setShowCreateForm(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* Modal form */}
      {showCreateForm && (
        <InventoryCheckForm onClose={() => setShowCreateForm(false)} />
      )}
      {/* Toolbar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Kiểm hàng loại B
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người kiểm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Tạo phiếu kiểm
          </button>
        )}
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
                Người kiểm
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Ngày kiểm
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                Số SP
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                Ghi chú
              </th>
              <th className="px-4 py-2.5 w-8"></th>
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
            ) : checks.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Chưa có phiếu kiểm nào</div>
                </td>
              </tr>
            ) : (
              checks.map((check) => (
                <Fragment key={check.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      expandedId === check.id
                        ? "bg-blue-50"
                        : "border-b hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(check.id)}>
                    <td
                      className={`px-4 py-2.5 text-sm font-mono ${
                        expandedId === check.id
                          ? "border-t-2 border-l-2 border-blue-500"
                          : ""
                      }`}>
                      {check.code}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${
                        expandedId === check.id
                          ? "border-t-2 border-blue-500"
                          : ""
                      }`}>
                      {check.branchName}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${
                        expandedId === check.id
                          ? "border-t-2 border-blue-500"
                          : ""
                      }`}>
                      {check.createdByName}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm ${
                        expandedId === check.id
                          ? "border-t-2 border-blue-500"
                          : ""
                      }`}>
                      {formatDateTime(check.checkDate)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm text-right ${
                        expandedId === check.id
                          ? "border-t-2 border-blue-500"
                          : ""
                      }`}>
                      {check.details?.length || 0}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-sm text-gray-500 truncate max-w-[200px] ${
                        expandedId === check.id
                          ? "border-t-2 border-blue-500"
                          : ""
                      }`}>
                      {check.note || "-"}
                    </td>
                    <td
                      className={`px-4 py-2.5 ${
                        expandedId === check.id
                          ? "border-t-2 border-r-2 border-blue-500"
                          : ""
                      }`}>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedId === check.id ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>
                  {expandedId === check.id && (
                    <InventoryCheckDetailRow
                      checkId={check.id}
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
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
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
    </div>
  );
}
