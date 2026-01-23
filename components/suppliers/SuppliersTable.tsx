"use client";

import { useState, Fragment, useEffect } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { Supplier, SupplierFilters } from "@/lib/types/supplier";
import { SupplierDetailRow } from "./SupplierDetailRow";
import { SupplierForm } from "./SupplierForm";
import { useBranchStore } from "@/lib/store/branch";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (supplier: Supplier) => React.ReactNode;
}

const formatCurrency = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã nhà cung cấp",
    visible: true,
    render: (supplier) => supplier.code,
  },
  {
    key: "name",
    label: "Tên nhà cung cấp",
    visible: true,
    render: (supplier) => supplier.name,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    render: (supplier) => supplier.contactNumber || supplier.phone || "-",
  },
  {
    key: "groupName",
    label: "Nhóm nhà cung cấp",
    visible: true,
    render: (supplier) =>
      supplier.supplierGroupDetails && supplier.supplierGroupDetails.length > 0
        ? supplier.supplierGroupDetails
            .map((g) => g.supplierGroup.name)
            .join(", ")
        : "-",
  },
  {
    key: "email",
    label: "Email",
    visible: false,
    render: (supplier) => supplier.email || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    render: (supplier) => supplier.address || "-",
  },
  {
    key: "location",
    label: "Khu vực",
    visible: false,
    render: (supplier) => supplier.location || "-",
  },
  {
    key: "wardName",
    label: "Phường/Xã",
    visible: false,
    render: (supplier) => supplier.wardName || "-",
  },
  {
    key: "totalDebt",
    label: "Nợ hiện tại",
    visible: true,
    render: (supplier) => formatCurrency(supplier.totalDebt),
  },
  {
    key: "totalInvoiced",
    label: "Tổng mua",
    visible: true,
    render: (supplier) => formatCurrency(supplier.totalInvoiced),
  },
  {
    key: "totalInvoicedWithoutReturn",
    label: "Tổng mua trừ trả hàng",
    visible: false,
    render: (supplier) => formatCurrency(supplier.totalInvoicedWithoutReturn),
  },
  {
    key: "taxCode",
    label: "Mã số thuế",
    visible: false,
    render: (supplier) => supplier.taxCode || "-",
  },
  {
    key: "contactPerson",
    label: "Người liên hệ",
    visible: false,
    render: (supplier) => supplier.contactPerson || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    render: (supplier) => formatDateTime(supplier.createdAt),
  },
  {
    key: "updatedAt",
    label: "Ngày cập nhật",
    visible: false,
    render: (supplier) => formatDateTime(supplier.updatedAt),
  },
  {
    key: "isActive",
    label: "Trạng thái",
    visible: true,
    render: (supplier) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          supplier.isActive
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}>
        {supplier.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
      </span>
    ),
  },
];

interface SuppliersTableProps {
  filters: SupplierFilters;
  onFiltersChange: (filters: Partial<SupplierFilters>) => void;
}

export function SuppliersTable({
  filters,
  onFiltersChange,
}: SuppliersTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("supplierTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
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
    ...filters,
    name: search || undefined,
    branchId: selectedBranch?.id,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("supplierTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const suppliers = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (supplierId: number) => {
    setExpandedSupplierId((prev) => (prev === supplierId ? null : supplierId));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    onFiltersChange({
      currentItem: (newPage - 1) * limit,
    });
  };

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Nhà cung cấp</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              <span>+</span>
              <span>Nhà cung cấp</span>
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Import file
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Xuất file
            </button>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              ⚙️
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Theo mã, tên, số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded pl-10 pr-4 py-2"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </form>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-100">
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
                  className="px-6 py-3 text-left text-md font-semibold text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Chưa có nhà cung cấp nào
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <tr
                    className="border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(supplier.id)}>
                    <td
                      className="px-6 py-3 sticky left-0 bg-white"
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
                        className="px-6 py-3 text-md whitespace-nowrap">
                        {col.render(supplier)}
                      </td>
                    ))}
                  </tr>
                  {expandedSupplierId === supplier.id && (
                    <SupplierDetailRow
                      supplierId={supplier.id}
                      colSpan={visibleColumns.length + 1}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-600">
            Hiển thị {startItem} - {endItem} của {total} nhà cung cấp
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            ← Trước
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 border rounded ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-50"
                  }`}>
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Sau →
          </button>
        </div>
      </div>

      {showCreateModal && (
        <SupplierForm onClose={() => setShowCreateModal(false)} />
      )}

      {showColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
