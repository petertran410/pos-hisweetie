"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useSubcontractOrders } from "@/lib/hooks/useSubcontractOrders";
import {
  SUBCONTRACT_STATUS,
  SUBCONTRACT_STATUS_COLOR,
  SUBCONTRACT_STATUS_TEXT,
  type SubcontractOrder,
  type SubcontractOrderFilters,
} from "@/lib/types/subcontract-order";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { SubcontractOrderDetailRow } from "./SubcontractOrderDetailRow";
import { MaterialsAtFactoryTab } from "./MaterialsAtFactoryTab";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface SubcontractOrdersTableProps {
  filters: SubcontractOrderFilters;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  ...Object.entries(SUBCONTRACT_STATUS_TEXT).map(([value, label]) => ({
    value,
    label,
  })),
  // Không phải trạng thái: báo cáo nguyên liệu đang nằm ở nhà máy.
  { value: "at-factory", label: "Tồn tại nhà máy" },
];

const formatDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "-";

const money = (v: number | null | undefined) =>
  v == null ? "-" : formatCurrency(Math.round(v));

const DEFAULT_COLUMNS: ColumnConfig<SubcontractOrder>[] = [
  {
    key: "code",
    label: "Mã lệnh",
    visible: true,
    width: "130px",
    render: (o) => <CodeLink entity="subcontract-order" code={o.code} />,
  },
  {
    key: "orderDate",
    label: "Ngày lập",
    visible: true,
    width: "110px",
    render: (o) => formatDay(o.orderDate),
  },
  {
    key: "factory",
    label: "Nhà máy",
    visible: true,
    width: "190px",
    render: (o) => (
      <div>
        <div>{o.factory?.name || o.supplier?.name || "-"}</div>
        {o.factory && o.supplier && (
          <div className="text-xs text-gray-400">{o.supplier.name}</div>
        )}
      </div>
    ),
  },
  {
    key: "productName",
    label: "Thành phẩm",
    visible: true,
    width: "220px",
    render: (o) => (
      <div>
        <div>{o.productName}</div>
        <div className="text-xs text-gray-400">{o.productCode}</div>
      </div>
    ),
  },
  {
    key: "plannedQuantity",
    label: "SL kế hoạch",
    visible: true,
    width: "110px",
    render: (o) => formatNumber(o.plannedQuantity),
  },
  {
    key: "goodQuantity",
    label: "Đã nhận",
    visible: true,
    width: "100px",
    render: (o) =>
      o.status === SUBCONTRACT_STATUS.DRAFT
        ? "-"
        : formatNumber(o.goodQuantity),
  },
  {
    key: "lossPercent",
    label: "Hao hụt",
    visible: true,
    width: "90px",
    render: (o) =>
      o.lossPercent == null ? (
        "-"
      ) : (
        <span className={o.lossExceeded ? "text-red-600 font-medium" : ""}>
          {o.lossPercent}%
        </span>
      ),
  },
  {
    key: "totalCost",
    label: "Tổng chi phí",
    visible: true,
    width: "130px",
    render: (o) =>
      o.status === SUBCONTRACT_STATUS.COMPLETED
        ? money(o.totalCost)
        : money(o.estimatedTotalCost),
  },
  {
    key: "unitCost",
    label: "Giá thành / đv",
    visible: true,
    width: "140px",
    // Chưa hoàn thành thì chỉ là ước tính theo SL kế hoạch → in nghiêng, mờ.
    render: (o) =>
      o.status === SUBCONTRACT_STATUS.COMPLETED ? (
        <div>
          <span className="font-medium">{money(o.unitCost)}</span>
          {o.costPending && (
            <div className="text-xs text-amber-600">Chưa áp giá vốn</div>
          )}
        </div>
      ) : o.estimatedUnitCost ? (
        <span className="italic text-gray-400">
          ~{money(o.estimatedUnitCost)}
        </span>
      ) : (
        "-"
      ),
  },
  {
    key: "remainingAmount",
    label: "Còn nợ nhà máy",
    visible: true,
    width: "140px",
    render: (o) =>
      o.status === SUBCONTRACT_STATUS.DRAFT ||
      o.status === SUBCONTRACT_STATUS.CANCELLED ? (
        "-"
      ) : (
        <span className={o.remainingAmount > 0 ? "text-red-600" : ""}>
          {money(o.remainingAmount)}
        </span>
      ),
  },
  {
    key: "branchName",
    label: "Kho xuất NVL",
    visible: false,
    width: "150px",
    render: (o) => o.branchName,
  },
  {
    key: "receiveBranchName",
    label: "Kho nhận",
    visible: false,
    width: "150px",
    render: (o) => o.receiveBranchName,
  },
  {
    key: "expectedDate",
    label: "Dự kiến xong",
    visible: false,
    width: "120px",
    render: (o) => formatDay(o.expectedDate),
  },
  {
    key: "createdByName",
    label: "Người tạo",
    visible: false,
    width: "140px",
    render: (o) => o.createdByName,
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (o) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
          SUBCONTRACT_STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {SUBCONTRACT_STATUS_TEXT[o.status] ?? "-"}
      </span>
    ),
  },
];

export function SubcontractOrdersTable({
  filters,
}: SubcontractOrdersTableProps) {
  // undefined = người dùng chưa bấm dòng nào (cho phép tự mở khi vào bằng ?Code=)
  const [expandedId, setExpandedId] = useState<number | null | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [limit, setLimit] = useState(15);
  const [activeTab, setActiveTab] = useState("all");

  // Trang hiện tại gắn với bộ lọc đang xem: đổi bộ lọc/tìm kiếm/tab là tự về
  // trang 1 mà không cần effect.
  const pageScope = JSON.stringify([
    debouncedSearch,
    filters,
    activeTab,
    limit,
  ]);
  const [pageState, setPageState] = useState({ scope: pageScope, page: 1 });
  const page = pageState.scope === pageScope ? pageState.page : 1;
  const setPage = (next: number) =>
    setPageState({ scope: pageScope, page: next });

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "subcontractOrderTableColumns",
    DEFAULT_COLUMNS,
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showAtFactory = activeTab === "at-factory";

  // Effective filters: tab overrides sidebar status
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeTab !== "all" && !showAtFactory) f.status = [Number(activeTab)];
    return f;
  }, [filters, activeTab, showAtFactory]);

  const { data, isLoading } = useSubcontractOrders({
    pageSize: limit,
    currentItem: (page - 1) * limit,
    search: debouncedSearch || undefined,
    ...effectiveFilters,
  });

  const orders = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = visibleColumns.length;

  // Mở sẵn chi tiết khi vào bằng link ?Code= và chỉ có đúng một lệnh.
  const openId =
    expandedId !== undefined
      ? expandedId
      : filters.search && orders.length === 1
        ? orders[0].id
        : null;

  return (
    <PermissionGate resource="subcontract_orders" action="view">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white m-4 border rounded-xl">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              Gia công ngoài
            </h1>
            {!showAtFactory && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm mã lệnh, thành phẩm, nhà máy..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <PermissionGate resource="subcontract_orders" action="create">
              <Link
                href="/san-pham/gia-cong/new"
                className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white text-sm rounded-lg hover:bg-brand-dark transition-colors">
                <Plus className="w-4 h-4" />
                Lệnh gia công
              </Link>
            </PermissionGate>
            {!showAtFactory && (
              <ColumnToggle columns={columns} onToggle={toggleColumn} />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.value
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } ${tab.value === "at-factory" ? "ml-auto" : ""}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {showAtFactory ? (
          <MaterialsAtFactoryTab factoryId={filters.factoryId} />
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <table
                className="w-full border-collapse"
                style={{ minWidth: "max-content" }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap"
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
                  ) : orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={colSpan}
                        className="py-20 text-center text-gray-400">
                        <div className="text-sm">
                          Không có lệnh gia công nào
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const expanded = openId === order.id;
                      return (
                        <Fragment key={order.id}>
                          <tr
                            className={`cursor-pointer transition-colors ${
                              expanded
                                ? "bg-brand-soft"
                                : "border-b hover:bg-gray-50"
                            }`}
                            onClick={() =>
                              setExpandedId(expanded ? null : order.id)
                            }>
                            {visibleColumns.map((col, idx) => (
                              <td
                                key={col.key}
                                className={`px-4 py-2.5 text-sm ${
                                  expanded
                                    ? `border-t-2 border-brand ${idx === 0 ? "border-l-2" : ""}`
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
                          </tr>
                          {expanded && (
                            <SubcontractOrderDetailRow
                              orderId={order.id}
                              colSpan={colSpan}
                            />
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Hiển thị</span>
                <select
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                  }}>
                  {[15, 20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>
                  trên tổng <strong>{total}</strong> lệnh
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm text-gray-700">
                  {page} / {totalPages || 1}
                </span>
                <button
                  className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
