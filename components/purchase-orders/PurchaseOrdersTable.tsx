"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { usePurchaseOrders } from "@/lib/hooks/usePurchaseOrders";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
} from "@/lib/types/purchase-order";
import {
  getStatusLabel,
  PURCHASE_ORDER_STATUS,
} from "@/lib/types/purchase-order";
import { PurchaseOrderDetailRow } from "./PurchaseOrderDetailRow";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface PurchaseOrdersTableProps {
  filters: PurchaseOrderFilters;
  onFiltersChange: (filters: Partial<PurchaseOrderFilters>) => void;
}

const STATUS_COLOR: Record<number, string> = {
  [PURCHASE_ORDER_STATUS.DRAFT]: "bg-gray-100 text-gray-700",
  [PURCHASE_ORDER_STATUS.COMPLETED]: "bg-green-100 text-green-700",
  [PURCHASE_ORDER_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

const DEFAULT_COLUMNS: ColumnConfig<PurchaseOrder>[] = [
  {
    key: "code",
    label: "Mã nhập hàng",
    visible: true,
    width: "150px",
    render: (po) => <CodeLink entity="purchase-order" code={po.code} />,
  },
  {
    key: "supplierOrderCode",
    label: "Mã đặt hàng nhập",
    visible: true,
    width: "180px",
    render: (po) =>
      po.orderSupplier?.code ? (
        <CodeLink entity="order-supplier" code={po.orderSupplier.code} />
      ) : (
        "-"
      ),
  },
  {
    key: "purchaseDate",
    label: "Thời gian",
    visible: true,
    width: "170px",
    render: (po) => formatDateTime(po.purchaseDate),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    width: "180px",
    render: (po) => po.supplier?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "150px",
    render: (po) => po.branch?.name || "-",
  },
  {
    key: "purchaseBy",
    label: "Người nhập",
    visible: false,
    width: "150px",
    render: (po) => po.purchaseBy?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    width: "150px",
    render: (po) => po.creator?.name || "-",
  },
  {
    key: "totalQuantity",
    label: "Tổng số lượng",
    visible: true,
    width: "140px",
    render: (po) => {
      const total =
        po.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;
      return total;
    },
  },
  {
    key: "productQuantity",
    label: "Số mặt hàng",
    visible: false,
    width: "150px",
    render: (po) => po.items?.length || 0,
  },
  {
    key: "ncc",
    label: "Mã NCC",
    visible: false,
    width: "120px",
    render: (po) =>
      po.supplier?.code ? (
        <CodeLink entity="supplier" code={po.supplier.code} />
      ) : (
        "-"
      ),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    width: "120px",
    render: (po) => formatCurrency(po.discount),
  },
  {
    key: "totalPayForSupplier",
    label: "Chi phí nhập trả NCC",
    visible: false,
    width: "200px",
    render: (po) => formatCurrency(po.totalAmount),
  },
  {
    key: "needToPay",
    label: "Cần trả NCC",
    visible: true,
    width: "150px",
    render: (po) => formatCurrency(po.debtAmount),
  },
  {
    key: "paidAmount",
    label: "Đã trả NCC",
    visible: true,
    width: "150px",
    render: (po) => formatCurrency(po.paidAmount),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "160px",
    render: (po) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[po.status] ?? "bg-gray-100 text-gray-700"}`}>
        {getStatusLabel(po.status)}
      </span>
    ),
  },
];

export function PurchaseOrdersTable({
  filters,
  onFiltersChange,
}: PurchaseOrdersTableProps) {
  const router = useRouter();
  const canViewPrice = useCan("purchase_orders", "view_price");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  const PRICE_COLUMN_KEYS = [
    "discount",
    "totalPayForSupplier",
    "needToPay",
    "paidAmount",
  ];

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset trang 1 khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Sync tab từ sidebar
  useEffect(() => {
    if (filters.status !== undefined) {
      setActiveStatusTab(String(filters.status));
    } else {
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  // effectiveFilters: tab override sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab !== "all") f.status = Number(activeStatusTab);
    else delete f.status;
    return f;
  }, [filters, activeStatusTab]);

  const { columns, toggleColumn } = useColumnVisibility(
    "purchaseOrderTableColumns",
    DEFAULT_COLUMNS
  );

  const { data, isLoading } = usePurchaseOrders({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const purchaseOrders = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Ẩn price columns nếu không có quyền
  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (c) => c.visible && (canViewPrice || !PRICE_COLUMN_KEYS.includes(c.key))
      ),
    [columns, canViewPrice]
  );

  const colSpan = visibleColumns.length + 2;

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === purchaseOrders.length
        ? []
        : purchaseOrders.map((po: PurchaseOrder) => po.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="purchase_orders" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Nhập hàng
            </h2>
            <input
              type="text"
              placeholder="Tìm mã phiếu, sản phẩm, nhà cung cấp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="purchase_orders" action="create">
              <button
                onClick={() => router.push("/san-pham/nhap-hang/new")}
                className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo phiếu
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
                      selectedIds.length === purchaseOrders.length &&
                      purchaseOrders.length > 0
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
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có phiếu nhập hàng nào</div>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po: PurchaseOrder) => (
                  <Fragment key={po.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === po.id
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(po.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === po.id
                            ? "bg-brand-soft border-t-2 border-l-2 border-brand"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(po.id)}
                          onChange={() => toggleSelect(po.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${expandedId === po.id ? "border-t-2 border-brand" : ""}`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(po)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${expandedId === po.id ? "border-t-2 border-r-2 border-brand" : ""}`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === po.id ? "rotate-180" : ""}`}
                        />
                      </td>
                    </tr>
                    {expandedId === po.id && (
                      <PurchaseOrderDetailRow
                        purchaseOrderId={po.id}
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
              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
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
                      ? "bg-brand text-white border-brand"
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
