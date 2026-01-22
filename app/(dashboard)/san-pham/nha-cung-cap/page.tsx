"use client";

import { useState } from "react";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { SuppliersSidebar } from "@/components/suppliers/SuppliersSidebar";
import { SuppliersTable } from "@/components/suppliers/SuppliersTable";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { ColumnVisibilityModal } from "@/components/suppliers/ColumnVisibilityModal";
import { SupplierFilters } from "@/lib/types/supplier";

type VisibleColumns = {
  code: boolean;
  name: boolean;
  contactNumber: boolean;
  groupName: boolean;
  email: boolean;
  address: boolean;
  location: boolean;
  wardName: boolean;
  totalDebt: boolean;
  totalInvoiced: boolean;
  totalInvoicedWithoutReturn: boolean;
  taxCode: boolean;
  contactPerson: boolean;
  createdAt: boolean;
  updatedAt: boolean;
  isActive: boolean;
};

export default function SuppliersPage() {
  const [filters, setFilters] = useState<SupplierFilters>({
    pageSize: 15,
    currentItem: 0,
    orderBy: "createdAt",
    orderDirection: "desc",
    isActive: true,
    includeSupplierGroup: true,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    code: true,
    name: true,
    contactNumber: true,
    groupName: true,
    email: false,
    address: false,
    location: false,
    wardName: false,
    totalDebt: true,
    totalInvoiced: true,
    totalInvoicedWithoutReturn: false,
    taxCode: false,
    contactPerson: false,
    createdAt: false,
    updatedAt: false,
    isActive: true,
  });

  const { data, isLoading } = useSuppliers({
    ...filters,
    name: searchTerm || undefined,
  });

  const handleFilterChange = (newFilters: Partial<SupplierFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      currentItem: newFilters.currentItem ?? 0,
    }));
  };

  const handleToggleColumn = (column: string) => {
    if (column in visibleColumns) {
      setVisibleColumns((prev) => ({
        ...prev,
        [column]: !prev[column as keyof VisibleColumns],
      }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, currentItem: 0 }));
  };

  const currentItem = filters.currentItem ?? 0;
  const pageSize = filters.pageSize ?? 15;

  return (
    <div className="flex h-full border-t bg-gray-50">
      <SuppliersSidebar filters={filters} setFilters={handleFilterChange} />

      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

        <div className="flex-1 overflow-auto bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Đang tải...</div>
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <SuppliersTable
              suppliers={data.data}
              visibleColumns={visibleColumns}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Không có dữ liệu</div>
            </div>
          )}
        </div>

        {data && data.total > 0 && (
          <div className="border-t bg-white p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {currentItem + 1} -{" "}
              {Math.min(currentItem + pageSize, data.total)} của {data.total}{" "}
              nhà cung cấp
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleFilterChange({
                    currentItem: Math.max(0, currentItem - pageSize),
                  })
                }
                disabled={currentItem === 0}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                ← Trước
              </button>
              <button
                onClick={() =>
                  handleFilterChange({
                    currentItem: currentItem + pageSize,
                  })
                }
                disabled={currentItem + pageSize >= data.total}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <SupplierForm onClose={() => setShowCreateModal(false)} />
      )}

      {showColumnModal && (
        <ColumnVisibilityModal
          visibleColumns={visibleColumns}
          onToggle={handleToggleColumn}
          onClose={() => setShowColumnModal(false)}
        />
      )}
    </div>
  );
}
