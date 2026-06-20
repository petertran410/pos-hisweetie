"use client";

import { useState } from "react";
import { Plus, RefreshCw, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useContracts } from "@/lib/hooks/useContracts";
import {
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_BADGE,
  type ContractFilters,
  type ContractStatus,
} from "@/lib/types/contract";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { ContractRowActions } from "./ContractRowActions";
import { ContractCreateModal } from "./ContractCreateModal";

export function ContractsTable() {
  const [filters, setFilters] = useState<ContractFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isFetching, refetch } = useContracts(filters);
  const contracts = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / (filters.pageSize || 20)));

  const handleStatusChange = (status: string) => {
    setFilters((f) => ({
      ...f,
      status: status ? (status as ContractStatus) : undefined,
      page: 1,
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold mr-2">Hợp đồng</h1>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm tiêu đề / email / khách..."
            className="border rounded px-3 py-1.5 text-sm w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50">
            Tìm
          </button>
        </form>

        <select
          value={filters.status || ""}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">Tất cả trạng thái</option>
          {CONTRACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTRACT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            title="Làm mới"
            className="p-2 rounded border hover:bg-gray-50">
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
          <PermissionGate resource="contracts" action="create">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Tạo hợp đồng
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-2 font-medium">Tiêu đề</th>
              <th className="px-4 py-2 font-medium">Loại HĐ</th>
              <th className="px-4 py-2 font-medium">Khách hàng</th>
              <th className="px-4 py-2 font-medium">Email nhận</th>
              <th className="px-4 py-2 font-medium">Nguồn</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium">Gửi</th>
              <th className="px-4 py-2 font-medium">Ký</th>
              <th className="px-4 py-2 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Chưa có hợp đồng nào
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{c.title}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.templateTitle || "-"}
                  </td>
                  <td className="px-4 py-2">
                    <div>{c.customer?.name || `#${c.customerId}`}</div>
                    <div className="text-xs text-gray-400">
                      {c.customer?.code}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.recipientEmail || "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.source === "template" ? "Template" : "Upload"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        CONTRACT_STATUS_BADGE[c.status] || ""
                      }`}>
                      {CONTRACT_STATUS_LABEL[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {c.sentAt ? formatDate(c.sentAt) : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {c.signedAt ? formatDate(c.signedAt) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      <ContractRowActions contract={c} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-white text-sm">
          <span className="text-gray-500">{total} hợp đồng</span>
          <div className="flex items-center gap-2">
            <button
              disabled={(filters.page || 1) <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))
              }
              className="px-3 py-1 rounded border disabled:opacity-40">
              Trước
            </button>
            <span>
              {filters.page || 1} / {totalPages}
            </span>
            <button
              disabled={(filters.page || 1) >= totalPages}
              onClick={() =>
                setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))
              }
              className="px-3 py-1 rounded border disabled:opacity-40">
              Sau
            </button>
          </div>
        </div>
      )}

      <ContractCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
