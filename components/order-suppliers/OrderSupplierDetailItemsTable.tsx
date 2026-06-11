"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useOrderSupplierDetailItems,
  useUpdateOrderSupplierItemFactoryPrice,
} from "@/lib/hooks/useOrderSuppliers";
import type { OrderSupplierDetailItem } from "@/lib/api/order-suppliers";
import type { OrderSupplierFilters } from "@/lib/types/order-supplier";
import {
  getStatusLabel,
  ORDER_SUPPLIER_STATUS,
} from "@/lib/types/order-supplier";
import { formatCurrency, formatNumberInput } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

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

const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";
const fmtNum = (n?: number) =>
  n == null ? "-" : Number(n).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

type FactoryField = "factoryPrice" | "factorySubTotal";

interface EditCtx {
  canUpdate: boolean;
  editing: {
    orderSupplierId: number;
    productId: number;
    field: FactoryField;
    value: string;
  } | null;
  startEdit: (r: OrderSupplierDetailItem, field: FactoryField) => void;
  changeValue: (value: string) => void;
  commit: () => void;
  cancel: () => void;
}

/** Ô inline-edit cho giá nhà máy / thành tiền nhà máy. */
function FactoryCell({
  r,
  field,
  ctx,
}: {
  r: OrderSupplierDetailItem;
  field: FactoryField;
  ctx?: EditCtx;
}) {
  const value = field === "factoryPrice" ? r.factoryPrice : r.factorySubTotal;
  const isEditing =
    ctx?.editing != null &&
    ctx.editing.orderSupplierId === r.orderSupplierId &&
    ctx.editing.productId === r.productId &&
    ctx.editing.field === field;

  if (isEditing && ctx) {
    return (
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        value={formatNumberInput(ctx.editing!.value)}
        onChange={(e) => ctx.changeValue(e.target.value)}
        onBlur={ctx.commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") ctx.commit();
          else if (e.key === "Escape") ctx.cancel();
        }}
        className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-brand"
      />
    );
  }

  if (!ctx?.canUpdate) {
    return <span>{value == null ? "-" : formatCurrency(value)}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => ctx.startEdit(r, field)}
      className="w-full text-right px-2 py-1 -mx-2 -my-1 rounded border border-transparent hover:border-gray-300 hover:bg-brand-soft transition-colors cursor-pointer">
      {value == null ? (
        <span className="text-gray-400">Nhập...</span>
      ) : (
        formatCurrency(value)
      )}
    </button>
  );
}

const DEFAULT_COLUMNS: ColumnConfig<OrderSupplierDetailItem, EditCtx>[] = [
  {
    key: "orderSupplierCode",
    label: "Mã PĐN",
    visible: true,
    width: "150px",
    render: (r) => (
      <CodeLink entity="order-supplier" code={r.orderSupplierCode} />
    ),
  },
  {
    key: "productCode",
    label: "Mã hàng",
    visible: true,
    width: "120px",
    render: (r) => <CodeLink entity="product" code={r.productCode} />,
  },
  {
    key: "productName",
    label: "Tên sản phẩm",
    visible: true,
    width: "240px",
    render: (r) => r.productName,
  },
  {
    key: "orderedQty",
    label: "SL đặt",
    visible: true,
    width: "90px",
    render: (r) => r.orderedQty,
  },
  {
    key: "price",
    label: "Đơn giá",
    visible: true,
    width: "120px",
    render: (r) => formatCurrency(r.price),
  },
  {
    key: "factoryPrice",
    label: "Đơn giá NM",
    visible: true,
    width: "120px",
    render: (r, ctx) => <FactoryCell r={r} field="factoryPrice" ctx={ctx} />,
  },
  {
    key: "factorySubTotal",
    label: "Thành tiền NM",
    visible: true,
    width: "140px",
    render: (r, ctx) => (
      <span className="font-medium text-gray-900">
        <FactoryCell r={r} field="factorySubTotal" ctx={ctx} />
      </span>
    ),
  },
  {
    key: "subTotal",
    label: "Thành tiền",
    visible: true,
    width: "140px",
    render: (r) => (
      <span className="font-medium text-gray-900">
        {formatCurrency(r.subTotal)}
      </span>
    ),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    width: "170px",
    render: (r) => r.supplier?.name || "-",
  },
  {
    key: "orderDate",
    label: "Ngày tạo",
    visible: true,
    width: "160px",
    render: (r) => fmtDateTime(r.orderDate),
  },
  {
    key: "borderGate",
    label: "Cửa khẩu",
    visible: true,
    width: "130px",
    render: (r) => r.borderGateName || "-",
  },
  {
    key: "receivedQty",
    label: "Đã nhập",
    visible: true,
    width: "90px",
    render: (r) => (
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
    ),
  },
  {
    key: "remainingQty",
    label: "Còn lại",
    visible: true,
    width: "90px",
    render: (r) => (
      <span className="font-medium text-gray-700">{r.remainingQty}</span>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "150px",
    render: (r) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {getStatusLabel(r.status)}
      </span>
    ),
  },
  // ── Cột phụ (mặc định ẩn) ──
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    width: "140px",
    render: (r) => r.branch?.name || "-",
  },
  {
    key: "tradeMarkName",
    label: "Thương hiệu",
    visible: false,
    width: "140px",
    render: (r) => r.tradeMarkName || "-",
  },
  {
    key: "productGroup",
    label: "Nhóm hàng",
    visible: false,
    width: "200px",
    render: (r) => r.productGroup || "-",
  },
  {
    key: "unitWeightGram",
    label: "TL gói (gram)",
    visible: false,
    width: "120px",
    render: (r) => fmtNum(r.unitWeightGram),
  },
  {
    key: "totalWeightKg",
    label: "Tổng KL (kg)",
    visible: false,
    width: "120px",
    render: (r) => fmtNum(r.totalWeightKg),
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "140px",
    render: (r) => r.creator?.name || "-",
  },
];

const RIGHT_ALIGN = new Set<string>([
  "orderedQty",
  "receivedQty",
  "remainingQty",
  "price",
  "subTotal",
  "factoryPrice",
  "factorySubTotal",
  "unitWeightGram",
  "totalWeightKg",
]);

export function OrderSupplierDetailItemsTable({ filters }: Props) {
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
    if (activeStatusTab !== "all") f.status = [Number(activeStatusTab)];
    return f;
  }, [filters, activeStatusTab]);

  const { columns, visibleColumns, toggleColumn } =
    useColumnVisibility<OrderSupplierDetailItem, EditCtx>(
      "orderSupplierDetailItemColumns",
      DEFAULT_COLUMNS
    );

  const { data, isLoading } = useOrderSupplierDetailItems({
    ...effectiveFilters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  // ── Inline edit giá nhà máy / thành tiền nhà máy ──
  const canUpdate = usePermission("order_suppliers", "update");
  const updateFactoryPrice = useUpdateOrderSupplierItemFactoryPrice();
  const [editing, setEditing] = useState<EditCtx["editing"]>(null);

  const editCtx: EditCtx = {
    canUpdate,
    editing,
    startEdit: (r, field) => {
      if (!canUpdate) return;
      const current =
        field === "factoryPrice" ? r.factoryPrice : r.factorySubTotal;
      setEditing({
        orderSupplierId: r.orderSupplierId,
        productId: r.productId,
        field,
        value: current == null ? "" : String(current),
      });
    },
    changeValue: (value) =>
      setEditing((prev) =>
        prev ? { ...prev, value: value.replace(/[^0-9]/g, "") } : prev
      ),
    cancel: () => setEditing(null),
    commit: () => {
      if (!editing) return;
      const raw = editing.value.trim();
      const newValue = raw === "" ? null : Number(raw);
      if (newValue != null && (isNaN(newValue) || newValue < 0)) {
        setEditing(null);
        return;
      }
      const original = rows.find(
        (r) =>
          r.orderSupplierId === editing.orderSupplierId &&
          r.productId === editing.productId
      );
      const prevValue = original
        ? editing.field === "factoryPrice"
          ? original.factoryPrice
          : original.factorySubTotal
        : null;
      // Không gọi API nếu giá trị không đổi.
      if ((prevValue ?? null) === (newValue ?? null)) {
        setEditing(null);
        return;
      }
      updateFactoryPrice.mutate({
        orderSupplierId: editing.orderSupplierId,
        productId: editing.productId,
        data: { [editing.field]: newValue },
      });
      setEditing(null);
    },
  };

  const rows = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = visibleColumns.length;

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
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
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
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${
                      RIGHT_ALIGN.has(col.key) ? "text-right" : "text-left"
                    }`}
                    style={{ width: col.width, minWidth: col.width }}>
                    {col.label}
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
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 ${
                          RIGHT_ALIGN.has(col.key) ? "text-right" : "text-left"
                        }`}
                        style={{ width: col.width, minWidth: col.width }}>
                        {col.render(r, editCtx)}
                      </td>
                    ))}
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
