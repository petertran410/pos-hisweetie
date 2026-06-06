"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useOrderSuppliers } from "@/lib/hooks/useOrderSuppliers";
import type {
  OrderSupplier,
  OrderSupplierFilters,
} from "@/lib/types/order-supplier";
import {
  getStatusLabel,
  ORDER_SUPPLIER_STATUS,
} from "@/lib/types/order-supplier";
import { OrderSupplierDetailRow } from "./OrderSupplierDetailRow";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface OrderSuppliersTableProps {
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

const DEFAULT_COLUMNS: ColumnConfig<OrderSupplier>[] = [
  {
    key: "code",
    label: "Mã đặt hàng nhập",
    visible: true,
    width: "180px",
    render: (os) => <CodeLink entity="order-supplier" code={os.code} />,
  },
  {
    key: "purchaseOrderCode",
    label: "Mã nhập hàng",
    visible: true,
    width: "250px",
    render: (os) =>
      os.purchaseOrders?.length
        ? os.purchaseOrders.map((po, idx) => (
            <Fragment key={po.code ?? idx}>
              {idx > 0 && <span className="text-gray-400"> | </span>}
              <CodeLink entity="purchase-order" code={po.code} />
            </Fragment>
          ))
        : "-",
  },
  {
    key: "orderDate",
    label: "Ngày đặt",
    visible: true,
    width: "170px",
    render: (os) => formatDateTime(os.orderDate),
  },
  {
    key: "createdDate",
    label: "Ngày tạo",
    visible: true,
    width: "170px",
    render: (os) => formatDateTime(os.createdAt),
  },
  {
    key: "updatedDate",
    label: "Ngày cập nhật",
    visible: false,
    width: "170px",
    render: (os) => formatDateTime(os.updatedAt),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    width: "180px",
    render: (os) => os.supplier?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "150px",
    render: (os) => os.branch?.name || "-",
  },
  {
    key: "total",
    label: "Tổng tiền hàng",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.total),
  },
  {
    key: "orderBy",
    label: "Người đặt",
    visible: false,
    width: "150px",
    render: (os) => os.user?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    width: "150px",
    render: (os) => os.creator?.name || "-",
  },
  {
    key: "totalQuantity",
    label: "Tổng số lượng",
    visible: false,
    width: "150px",
    render: (os) => String(os.totalQty ?? "-"),
  },
  {
    key: "productQty",
    label: "Số mặt hàng",
    visible: false,
    width: "150px",
    render: (os) => String(os.productQty ?? "-"),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    width: "120px",
    render: (os) => formatCurrency(os.discount),
  },
  {
    key: "subTotal",
    label: "Cần trả NCC",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.supplierDebt),
  },
  {
    key: "paidAmount",
    label: "Đã trả NCC",
    visible: true,
    width: "150px",
    render: (os) => formatCurrency(os.paidAmount),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "170px",
    render: (os) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[os.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {getStatusLabel(os.status)}
      </span>
    ),
  },
];

export function OrderSuppliersTable({
  filters,
  onFiltersChange,
}: OrderSuppliersTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset trang 1 khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Sync tab từ sidebar (chỉ sync khi sidebar chọn đúng 1 status)
  useEffect(() => {
    if (filters.status && filters.status.length === 1) {
      setActiveStatusTab(String(filters.status[0]));
    } else if (!filters.status || filters.status.length === 0) {
      setActiveStatusTab("all");
    } else {
      // multi-select → reset tab về "all"
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  // effectiveFilters: tab override sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") {
      f.status = [Number(activeStatusTab)];
    }
    return f;
  }, [filters, activeStatusTab]);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "orderSupplierTableColumns",
    DEFAULT_COLUMNS
  );

  const { data, isLoading } = useOrderSuppliers({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const orderSuppliers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === orderSuppliers.length
        ? []
        : orderSuppliers.map((os) => os.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="order_suppliers" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Đặt hàng nhập
            </h2>
            <input
              type="text"
              placeholder="Tìm mã đặt hàng, mã nhập hàng, NCC, mã hàng, tên SP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="order_suppliers" action="create">
              <button
                onClick={() => router.push("/san-pham/dat-hang-nhap/new")}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo phiếu
              </button>
            </PermissionGate>
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeStatusTab === tab.value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
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
                      selectedIds.length === orderSuppliers.length &&
                      orderSuppliers.length > 0
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
              ) : orderSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">
                      Không có phiếu đặt hàng nhập nào
                    </div>
                  </td>
                </tr>
              ) : (
                orderSuppliers.map((os) => (
                  <Fragment key={os.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === os.id
                          ? "bg-blue-50"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(os.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === os.id
                            ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(os.id)}
                          onChange={() => toggleSelect(os.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedId === os.id
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
                          {col.render(os)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedId === os.id
                            ? "border-t-2 border-r-2 border-blue-500"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedId === os.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedId === os.id && (
                      <OrderSupplierDetailRow
                        orderSupplierId={os.id}
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
            {total > 0 ? ` · ${total.toLocaleString("vi-VN")} phiếu` : ""}
          </span>
        </div>
      </div>
    </PermissionGate>
  );
}
