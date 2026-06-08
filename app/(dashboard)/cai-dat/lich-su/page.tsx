"use client";

import { useState } from "react";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/api/audit-logs";
import { Filter, X } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

const CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "order", label: "Đơn hàng" },
  { value: "invoice", label: "Hóa đơn" },
  { value: "return_order", label: "Phiếu trả hàng" },
  { value: "payment", label: "Thanh toán" },
  { value: "product", label: "Sản phẩm" },
  { value: "customer", label: "Khách hàng" },
  { value: "supplier", label: "Nhà cung cấp" },
  { value: "transfer", label: "Chuyển kho" },
  { value: "purchase_order", label: "Nhập hàng" },
  { value: "order_supplier", label: "Đặt hàng NCC" },
  { value: "production", label: "Sản xuất" },
  { value: "destruction", label: "Xuất hủy" },
  { value: "packing", label: "Đóng hàng" },
  { value: "user", label: "Người dùng" },
  { value: "branch", label: "Chi nhánh" },
  { value: "setting", label: "Cài đặt" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "info", label: "Thông tin" },
  { value: "warning", label: "Cảnh báo" },
  { value: "critical", label: "Quan trọng" },
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    severity: "",
    startDate: "",
    endDate: "",
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", filters, page, limit],
    queryFn: () =>
      auditLogsApi.getAll({
        category: filters.category || undefined,
        severity: filters.severity || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page,
        limit,
      }),
  });

  const handleResetFilters = () => {
    setFilters({ category: "", severity: "", startDate: "", endDate: "" });
    setPage(1);
  };

  return (
    <PagePermissionGuard resource="roles" action="view">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-white">
          <div className="mb-4">
            <h1 className="text-xl font-semibold">Lịch sử thao tác</h1>
            <p className="text-gray-600 text-sm mt-1">
              Theo dõi tất cả thao tác của nhân viên trên hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                activeFilterCount > 0 ? "border-brand text-brand" : ""
              }`}>
              <Filter className="w-4 h-4" />
              Lọc
              {activeFilterCount > 0 && (
                <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                <X className="w-3 h-3" />
                Xóa bộ lọc
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({ ...filters, category: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mức độ
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => {
                    setFilters({ ...filters, severity: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <AuditLogsTable
            logs={data?.data || []}
            isLoading={isLoading}
            total={data?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      </div>
    </PagePermissionGuard>
  );
}
