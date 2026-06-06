"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { SupplierFilters, Supplier } from "@/lib/types/supplier";
import { formatCurrency } from "@/lib/utils";
import { Plus, Upload, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { SupplierDetailRow } from "./SupplierDetailRow";
import { SupplierForm } from "./SupplierForm";
import { SupplierImportBalanceModal } from "./SupplierImportBalanceModal";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { CodeLink } from "@/components/shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SuppliersTableProps {
  filters: SupplierFilters;
}

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

// ─── Columns ──────────────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: ColumnConfig<Supplier>[] = [
  {
    key: "code",
    label: "Mã nhà cung cấp",
    visible: true,
    width: "160px",
    render: (s) => <CodeLink entity="supplier" code={s.code} />,
  },
  {
    key: "name",
    label: "Tên nhà cung cấp",
    visible: true,
    width: "200px",
    render: (s) => <span className="font-medium">{s.name}</span>,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    width: "140px",
    render: (s) => s.contactNumber || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "150px",
    render: (s) => s.branch?.name || "-",
  },
  {
    key: "debt",
    label: "Nợ hiện tại",
    visible: true,
    width: "150px",
    render: (s) => formatCurrency(s.debt ?? 0),
  },
  {
    key: "totalInvoiced",
    label: "Tổng mua",
    visible: true,
    width: "150px",
    render: (s) => formatCurrency(s.totalInvoiced ?? 0),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "140px",
    render: (s) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          s.isActive
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600"
        }`}>
        {s.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
      </span>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function SuppliersTable({ filters }: SuppliersTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Tab override sidebar isActive
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab === "active") f.isActive = true;
    else if (activeStatusTab === "inactive") f.isActive = false;
    else if (activeStatusTab === "all") delete f.isActive;
    return f;
  }, [filters, activeStatusTab]);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "supplierTableColumns",
    DEFAULT_COLUMNS
  );

  const { data, isLoading } = useSuppliers({
    ...effectiveFilters,
    currentItem: (page - 1) * limit,
    pageSize: limit,
    name: debouncedSearch || undefined,
  });

  const suppliers: Supplier[] = data?.data || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === suppliers.length ? [] : suppliers.map((s) => s.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* ── Toolbar ── */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Nhà cung cấp
          </h2>
          <input
            type="text"
            placeholder="Theo mã, tên, số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PermissionGate resource="suppliers" action="create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Tạo nhà cung cấp
            </button>
          </PermissionGate>
          <PermissionGate resource="suppliers" action="create">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
              <Upload className="w-4 h-4" />
              Import cân bằng nợ
            </button>
          </PermissionGate>
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    suppliers.length > 0 &&
                    selectedIds.length === suppliers.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide"
                  style={{ width: col.width, minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-8" />
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
            ) : suppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có nhà cung cấp nào</div>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      expandedId === supplier.id
                        ? "bg-blue-50"
                        : "border-b hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(supplier.id)}>
                    <td
                      className={`px-4 py-2.5 sticky left-0 z-10 ${
                        expandedId === supplier.id
                          ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                          : "bg-white"
                      }`}
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(supplier.id)}
                        onChange={() => toggleSelect(supplier.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-gray-700 ${
                          expandedId === supplier.id
                            ? "border-t-2 border-blue-500"
                            : ""
                        }`}
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          wordWrap: "break-word",
                          whiteSpace: "normal",
                        }}>
                        {col.render(supplier)}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2.5 ${
                        expandedId === supplier.id
                          ? "border-t-2 border-r-2 border-blue-500"
                          : ""
                      }`}>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedId === supplier.id ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>
                  {expandedId === supplier.id && (
                    <SupplierDetailRow
                      supplierId={supplier.id}
                      colSpan={colSpan}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
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
          {total > 0 ? ` · ${total} nhà cung cấp` : ""}
        </span>
      </div>

      {/* ── Modals ── */}
      {showCreateModal && (
        <SupplierForm onClose={() => setShowCreateModal(false)} />
      )}
      {showImportModal && (
        <SupplierImportBalanceModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}
