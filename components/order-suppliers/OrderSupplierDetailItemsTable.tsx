"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOrderSupplierDetailItems } from "@/lib/hooks/useOrderSuppliers";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";
import {
  getStatusLabel,
  ORDER_SUPPLIER_STATUS,
} from "@/lib/types/order-supplier";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";

interface Props {
  filters: OrderSupplierFilters;
  onFiltersChange: (filters: Partial<OrderSupplierFilters>) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: String(ORDER_SUPPLIER_STATUS.DRAFT), label: "Phiếu tạm" },
  { value: String(ORDER_SUPPLIER_STATUS.CONFIRMED), label: "Đã xác nhận NCC" },
  { value: String(ORDER_SUPPLIER_STATUS.PARTIAL), label: "Nhập một phần" },
  { value: String(ORDER_SUPPLIER_STATUS.COMPLETED), label: "Hoàn thành" },
  { value: String(ORDER_SUPPLIER_STATUS.CANCELLED), label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  [ORDER_SUPPLIER_STATUS.DRAFT]: "bg-gray-100 text-gray-700",
  [ORDER_SUPPLIER_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700",
  [ORDER_SUPPLIER_STATUS.PARTIAL]: "bg-yellow-100 text-yellow-700",
  [ORDER_SUPPLIER_STATUS.COMPLETED]: "bg-green-100 text-green-700",
  [ORDER_SUPPLIER_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

export function OrderSupplierDetailItemsTable({
  filters,
  onFiltersChange,
}: Props) {
  const [search, setSearch] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  useEffect(() => {
    if (filters.status && filters.status.length === 1) {
      setActiveStatusTab(String(filters.status[0]));
    } else {
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") {
      f.status = [Number(activeStatusTab)];
    }
    return f;
  }, [filters, activeStatusTab]);

  const { data, isLoading } = useOrderSupplierDetailItems({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = 12;

  return (
    <PermissionGate resource="order_suppliers" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Đặt hàng nhập chi tiết
            </h2>
            <input
              type="text"
              placeholder="Tìm mã PĐN, NCC, mã/tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeStatusTab === tab.value
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {[
                  "Mã PĐN",
                  "Ngày đặt",
                  "Nhà cung cấp",
                  "Chi nhánh",
                  "Mã hàng",
                  "Tên sản phẩm",
                  "SL đặt",
                  "Đã nhập",
                  "Còn lại",
                  "Đơn giá",
                  "Thành tiền",
                  "Trạng thái",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${
                      [6, 7, 8, 9, 10].includes(i) ? "text-right" : "text-left"
                    }`}>
                    {h}
                  </th>
                ))}
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
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có dòng sản phẩm nào</div>
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={`${r.orderSupplierId}-${r.productId}-${idx}`}
                    className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <CodeLink
                        entity="order-supplier"
                        code={r.orderSupplierCode}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {formatDateTime(r.orderDate)}
                    </td>
                    <td className="px-3 py-2">{r.supplier?.name || "-"}</td>
                    <td className="px-3 py-2">{r.branch?.name || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <CodeLink entity="product" code={r.productCode} />
                    </td>
                    <td className="px-3 py-2">{r.productName}</td>
                    <td className="px-3 py-2 text-right">{r.orderedQty}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          r.receivedQty >= r.orderedQty
                            ? "text-green-600 font-medium"
                            : r.receivedQty > 0
                              ? "text-yellow-600 font-medium"
                              : "text-gray-400"
                        }>
                        {r.receivedQty}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {r.remainingQty}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatCurrency(r.price)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(r.subTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-700"
                        }`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                  </tr>
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
              {[15, 20, 50, 100].map((n) => (
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
            <span className="text-xs text-gray-600 px-2">
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-gray-400">
            {total > 0 ? `${total.toLocaleString("vi-VN")} dòng` : ""}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
