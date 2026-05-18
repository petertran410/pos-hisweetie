"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { SupplierFilters, Supplier } from "@/lib/types/supplier";
import { formatCurrency } from "@/lib/utils";
import { Plus, Upload, Settings } from "lucide-react";
import { SupplierDetailRow } from "./SupplierDetailRow";
import { SupplierForm } from "./SupplierForm";
import { SupplierImportBalanceModal } from "./SupplierImportBalanceModal";
import { PermissionGate } from "@/components/permissions/PermissionGate";

// ─── Types ────────────────────────────────────────────────────────────────────
type ColumnKey =
  | "code"
  | "name"
  | "contactNumber"
  | "groups"
  | "branch"
  | "debt"
  | "totalInvoiced"
  | "status";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  width: string;
  render: (supplier: Supplier) => React.ReactNode;
}

interface SuppliersTableProps {
  filters: SupplierFilters;
}

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

// ─── Columns ──────────────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã nhà cung cấp",
    visible: true,
    width: "160px",
    render: (s) => <span className="font-medium text-blue-600">{s.code}</span>,
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
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
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

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supplierTableColumns");
      if (saved) {
        try {
          const savedCols = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedCols.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const { data, isLoading } = useSuppliers({
    ...effectiveFilters,
    currentItem: (page - 1) * limit,
    pageSize: limit,
    name: debouncedSearch || undefined,
  });

  useEffect(() => {
    localStorage.setItem("supplierTableColumns", JSON.stringify(columns));
  }, [columns]);

  const suppliers: Supplier[] = data?.data || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );
  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleColumnVisibility = (key: ColumnKey) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

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
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* ── Toolbar ── */}
      <div className="border-b px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Theo mã, tên, số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowColumnModal((v) => !v)}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600 relative">
            <Settings className="w-4 h-4" />
            Cột hiển thị
            {/* Column modal */}
            {showColumnModal && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 w-56 max-h-80 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold text-gray-700">
                    Hiển thị cột
                  </span>
                  <button
                    onClick={() => setShowColumnModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs">
                    ✕
                  </button>
                </div>
                <div className="space-y-0.5">
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer px-2 py-1.5 hover:bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumnVisibility(col.key)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </button>
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
                  className="py-16 text-center text-gray-400 text-sm">
                  Không có nhà cung cấp nào
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <tr
                    className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      expandedId === supplier.id
                        ? "bg-blue-50 hover:bg-blue-50"
                        : ""
                    }`}
                    onClick={() => toggleExpand(supplier.id)}>
                    <td
                      className="px-4 py-3 sticky left-0 bg-inherit"
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
                        className="px-4 py-3 text-gray-700"
                        style={{ width: col.width, minWidth: col.width }}>
                        {col.render(supplier)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-gray-400 transition-transform inline-block ${expandedId === supplier.id ? "rotate-90" : ""}`}>
                        ›
                      </span>
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
      <div className="border-t px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="text-sm text-gray-500">
          Tổng: <span className="font-medium text-gray-700">{total}</span> nhà
          cung cấp
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            Trước
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            Sau
          </button>
        </div>
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
