"use client";

import { useState, Fragment, useEffect } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { Supplier, SupplierFilters } from "@/lib/types/supplier";
import { SupplierDetailRow } from "./SupplierDetailRow";
import { SupplierForm } from "./SupplierForm";
import { Plus, Settings } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: string;
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
    width: "180px",
    render: (supplier) => supplier.code,
  },
  {
    key: "name",
    label: "Tên nhà cung cấp",
    visible: true,
    width: "200px",
    render: (supplier) => supplier.name,
  },
  {
    key: "contactNumber",
    label: "Điện thoại",
    visible: true,
    width: "150px",
    render: (supplier) => supplier.contactNumber || "-",
  },
  {
    key: "groupName",
    label: "Nhóm nhà cung cấp",
    visible: true,
    width: "220px",
    render: (supplier) =>
      supplier.groups ? supplier.groups.replace(/\|/g, ", ") : "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "180px",
    render: (supplier) => supplier.branch?.name || "-",
  },
  {
    key: "email",
    label: "Email",
    visible: false,
    width: "200px",
    render: (supplier) => supplier.email || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "250px",
    render: (supplier) => supplier.address || "-",
  },
  {
    key: "location",
    label: "Khu vực",
    visible: false,
    width: "180px",
    render: (supplier) => supplier.location || "-",
  },
  {
    key: "wardName",
    label: "Phường/Xã",
    visible: false,
    width: "150px",
    render: (supplier) => supplier.wardName || "-",
  },
  {
    key: "debt",
    label: "Nợ hiện tại",
    visible: true,
    width: "150px",
    render: (supplier) => formatCurrency(supplier.debt),
  },
  {
    key: "totalInvoiced",
    label: "Tổng mua",
    visible: true,
    width: "150px",
    render: (supplier) => formatCurrency(supplier.totalInvoiced),
  },
  {
    key: "totalInvoicedWithoutReturn",
    label: "Tổng mua trừ trả hàng",
    visible: false,
    width: "220px",
    render: (supplier) => formatCurrency(supplier.totalInvoicedWithoutReturn),
  },
  {
    key: "taxCode",
    label: "Mã số thuế",
    visible: false,
    width: "150px",
    render: (supplier) => supplier.taxCode || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    width: "180px",
    render: (supplier) => formatDateTime(supplier.createdAt),
  },
  {
    key: "updatedAt",
    label: "Ngày cập nhật",
    visible: false,
    width: "180px",
    render: (supplier) => formatDateTime(supplier.updatedAt),
  },
  {
    key: "isActive",
    label: "Trạng thái",
    visible: true,
    width: "150px",
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");

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
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("supplierTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const suppliers = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  console.log(suppliers);

  const currentItem = filters.currentItem ?? 0;
  const pageSize = filters.pageSize ?? 15;

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
    onFiltersChange({ currentItem: 0 });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h1 className="text-xl font-semibold w-[200px]">Nhà cung cấp</h1>
          <input
            type="text"
            placeholder="Theo mã, tên, số điện thoại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Tạo nhà cung cấp</span>
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột Hiển Thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left sticky left-0 bg-gray-50"
                style={{ width: "60px" }}>
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
                  className="px-6 py-3 text-left text-md font-semibold text-gray-700"
                  style={{
                    minWidth: col.width,
                    maxWidth: col.width,
                    width: col.width,
                  }}>
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
                      className="px-6 py-3 sticky left-0"
                      style={{ width: "60px" }}
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
                        className="px-6 py-3 text-md align-middle"
                        style={{
                          minWidth: col.width,
                          maxWidth: col.width,
                          width: col.width,
                        }}>
                        <div className="break-words">
                          {col.render(supplier)}
                        </div>
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

      <div className="border-t px-4 py-3 flex items-center justify-between">
        <div className="text-md text-gray-600">
          Hiển thị {currentItem + 1} - {Math.min(currentItem + pageSize, total)}{" "}
          của {total} nhà cung cấp
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onFiltersChange({
                currentItem: Math.max(0, currentItem - pageSize),
              })
            }
            disabled={currentItem === 0}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Trước
          </button>
          <button
            onClick={() =>
              onFiltersChange({ currentItem: currentItem + pageSize })
            }
            disabled={currentItem + pageSize >= total}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Sau
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
