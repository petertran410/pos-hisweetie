"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { Order } from "@/lib/types/order";
import { OrderDetailRow } from "./OrderDetailRow";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (order: Order) => React.ReactNode;
}

interface OrdersTableProps {
  filters: any;
  onCreateClick: () => void;
  onEditClick: (order: Order) => void;
}

const STATUS_COLOR: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
  5: "bg-teal-100 text-teal-700",
  6: "bg-teal-100 text-teal-600",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Đang giao",
  3: "Hoàn thành",
  4: "Đã hủy",
  5: "Đã xác nhận",
  6: "Ra 1 phần HĐ",
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã đặt hàng",
    visible: true,
    width: "140px",
    render: (o) => <span className="font-medium text-blue-600">{o.code}</span>,
  },
  {
    key: "invoiceCode",
    label: "Mã hóa đơn",
    visible: true,
    width: "160px",
    render: (o) => o.invoices?.map((inv) => inv.code).join(" | ") || "-",
  },
  {
    key: "orderDate",
    label: "Thời gian",
    visible: true,
    width: "160px",
    render: (o) => formatDate(o.orderDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: true,
    width: "160px",
    render: (o) => formatDate(o.createdAt),
  },
  {
    key: "updateDate",
    label: "Ngày cập nhật",
    visible: false,
    width: "160px",
    render: (o) => formatDate(o.updatedAt),
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    width: "180px",
    render: (o) => o.customer?.name || "Khách vãng lai",
  },
  {
    key: "phone",
    label: "Điện thoại",
    visible: false,
    width: "140px",
    render: (o) => o.customer?.contactNumber || o.customer?.phone || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    width: "200px",
    render: (o) => o.delivery?.address || "-",
  },
  {
    key: "area",
    label: "Khu vực",
    visible: false,
    width: "160px",
    render: (o) => o.delivery?.locationName || "-",
  },
  {
    key: "ward",
    label: "Phường/Xã",
    visible: false,
    width: "160px",
    render: (o) => o.delivery?.wardName || "-",
  },
  {
    key: "deliveryPartner",
    label: "Đối tác giao hàng",
    visible: false,
    width: "180px",
    render: (o) => o.delivery?.partnerDelivery?.name || "-",
  },
  {
    key: "receiver",
    label: "Người nhận",
    visible: false,
    width: "160px",
    render: (o) => o.delivery?.receiver || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "140px",
    render: (o) => o.soldBy?.name || o.creator?.name || "-",
  },
  {
    key: "salesChannel",
    label: "Kênh bán",
    visible: false,
    width: "140px",
    render: (o) => o.saleChannel?.name || "Khác",
  },
  {
    key: "notes",
    label: "Ghi chú",
    visible: false,
    width: "200px",
    render: (o) => o.description || "-",
  },
  {
    key: "totalAmount",
    label: "Tổng tiền hàng",
    visible: false,
    width: "140px",
    render: (o) => formatCurrency(Number(o.totalAmount)),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    render: (o) => formatCurrency(Number(o.discount)),
  },
  {
    key: "discountRatio",
    label: "% Giảm giá",
    visible: false,
    width: "120px",
    render: (o) => <span>{Number(o.discountRatio)}%</span>,
  },
  {
    key: "grandTotal",
    label: "Tổng sau giảm",
    visible: false,
    width: "140px",
    render: (o) => formatCurrency(Number(o.grandTotal)),
  },
  {
    key: "customerDebt",
    label: "Khách cần trả",
    visible: true,
    width: "140px",
    render: (o) => formatCurrency(Number(o.grandTotal)),
  },
  {
    key: "customerPaid",
    label: "Đã thu",
    visible: true,
    width: "120px",
    render: (o) => (
      <span className="text-green-700 font-medium">
        {formatCurrency(Number(o.paidAmount))}
      </span>
    ),
  },
  {
    key: "customerOwes",
    label: "Còn nợ",
    visible: true,
    width: "120px",
    render: (o) => {
      const debt = Number(o.debtAmount);
      return debt > 0 ? (
        <span className="text-orange-600 font-medium">
          {formatCurrency(debt)}
        </span>
      ) : (
        <span className="text-gray-400">{formatCurrency(debt)}</span>
      );
    },
  },
  {
    key: "waitingDays",
    label: "Số ngày chờ",
    visible: false,
    width: "110px",
    render: (o) => {
      if (!o.orderDate) return "-";
      const diff = Math.ceil(
        Math.abs(Date.now() - new Date(o.orderDate).getTime()) / 86400000
      );
      return (
        <span className={diff > 7 ? "text-red-600 font-medium" : ""}>
          {diff} ngày
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "140px",
    render: (o) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-700"}`}>
        {STATUS_TEXT[o.status] || o.status}
      </span>
    ),
  },
];

export function OrdersTable({ filters, onCreateClick }: OrdersTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const SORTABLE_COLUMNS = new Set([
    "orderDate",
    "createTime",
    "updateDate",
    "customerDebt",
    "customerPaid",
    "customerOwes",
    "totalAmount",
    "grandTotal",
    "status",
  ]);

  const COLUMN_ORDER_BY: Record<string, string> = {
    orderDate: "orderDate",
    createTime: "createdAt",
    updateDate: "updatedAt",
    customerDebt: "grandTotal",
    customerPaid: "paidAmount",
    customerOwes: "debtAmount",
    totalAmount: "totalAmount",
    grandTotal: "grandTotal",
    status: "status",
  };

  const handleSort = (colKey: string) => {
    if (!SORTABLE_COLUMNS.has(colKey)) return;
    if (sortBy !== colKey) {
      setSortBy(colKey);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy(null);
      setSortDir(null);
    }
    setPage(1);
  };

  // Debounce search 300ms → giảm API calls
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset về trang 1 khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Tab status override sidebar status filter (tab takes priority)
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") f.status = activeStatusTab;
    return f;
  }, [filters, activeStatusTab]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orderTableColumns");
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

  const { data, isLoading } = useOrders({
    page,
    limit,
    search: debouncedSearch,
    branchId: selectedBranch?.id,
    ...effectiveFilters,
    ...(sortBy && sortDir
      ? {
          orderBy: COLUMN_ORDER_BY[sortBy],
          orderDirection: sortDir,
        }
      : {
          orderBy: effectiveFilters.orderBy ?? "orderDate",
          orderDirection: effectiveFilters.orderDirection ?? "desc",
        }),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orderTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const orders = data?.data || [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // useMemo → không recompute mỗi render
  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (c) => c.key !== "discount" && c.key !== "discountRatio" && c.visible
      ),
    [columns]
  );

  const toggleColumnVisibility = (key: string) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === orders.length ? [] : orders.map((o) => o.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedOrderId((prev) => (prev === id ? null : id));

  // Đồng bộ tab với sidebar filter khi sidebar đổi status
  useEffect(() => {
    if (filters.status && filters.status !== activeStatusTab) {
      setActiveStatusTab(filters.status);
    } else if (!filters.status) {
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  return (
    <PermissionGate resource="orders" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Đặt hàng
            </h2>
            <input
              type="text"
              placeholder="Tìm mã đơn, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="orders" action="create">
              <button
                onClick={onCreateClick}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo đơn
              </button>
            </PermissionGate>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600">
              <Settings className="w-4 h-4" />
              Cột
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
                      selectedIds.length === orders.length && orders.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${
                      SORTABLE_COLUMNS.has(col.key)
                        ? "cursor-pointer select-none hover:bg-gray-100"
                        : ""
                    }`}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => handleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {SORTABLE_COLUMNS.has(col.key) && (
                        <span className="inline-flex text-gray-400">
                          {sortBy === col.key && sortDir === "desc" ? (
                            <ArrowDown className="w-3 h-3 text-blue-500" />
                          ) : sortBy === col.key && sortDir === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-blue-500" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </span>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có đơn đặt hàng nào</div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedOrderId === order.id
                          ? "bg-blue-50"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(order.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedOrderId === order.id
                            ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedOrderId === order.id
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
                          {col.render(order)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedOrderId === order.id
                            ? "border-t-2 border-r-2 border-blue-500"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedOrderId === order.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <OrderDetailRow orderId={order.id} colSpan={colSpan} />
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

            {/* Hiển thị tối đa 5 trang, căn giữa quanh trang hiện tại */}
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
            {total > 0 ? ` · ${total.toLocaleString("vi-VN")} đơn` : ""}
          </span>
        </div>
      </div>

      {/* ── Column modal ── */}
      {showColumnModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setShowColumnModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl w-72 p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">
                Cột hiển thị
              </h3>
              <button onClick={() => setShowColumnModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {columns
                .filter(
                  (c) => c.key !== "discount" && c.key !== "discountRatio"
                )
                .map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
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
        </div>
      )}
    </PermissionGate>
  );
}
