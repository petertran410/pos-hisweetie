"use client";

import { useState, useEffect, Fragment } from "react";
import { useConsignments } from "@/lib/hooks/useConsignments";
import type {
  Consignment,
  ConsignmentFilters,
} from "@/lib/types/consignment";
import {
  getStatusLabel,
  CONSIGNMENT_STATUS_COLOR,
  CONSIGNMENT_RETURN_STATUS,
} from "@/lib/types/consignment";
import { ConsignmentDetailRow } from "./ConsignmentDetailRow";
import { Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface ConsignmentsTableProps {
  filters: ConsignmentFilters;
  onFiltersChange: (filters: Partial<ConsignmentFilters>) => void;
  onCreateClick?: () => void;
}

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

// Tổng SL ký gửi (từ items)
const consignedQty = (c: Consignment) =>
  (c.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);

// Tổng SL đã xuất hóa đơn (từ invoices[].details)
const invoicedQty = (c: Consignment) =>
  (c.invoices || []).reduce(
    (sum, inv) =>
      sum +
      (inv.details || []).reduce((s, d) => s + Number(d.quantity || 0), 0),
    0
  );

// Tổng SL đã hoàn & nhận về kho (returns STOCK_RECEIVED)
const receivedQty = (c: Consignment) =>
  (c.returns || [])
    .filter((r) => r.status === CONSIGNMENT_RETURN_STATUS.STOCK_RECEIVED)
    .reduce(
      (sum, r) =>
        sum +
        (r.details || []).reduce(
          (s, d) => s + Number(d.returnQuantity || 0),
          0
        ),
      0
    );

// Mã các phiếu hoàn ký gửi chưa hủy
const returnCodes = (c: Consignment) =>
  (c.returns || [])
    .filter((r) => r.status !== CONSIGNMENT_RETURN_STATUS.CANCELLED)
    .map((r) => r.code);

const DEFAULT_COLUMNS: ColumnConfig<Consignment>[] = [
  {
    key: "code",
    label: "Mã ký gửi",
    visible: true,
    width: "160px",
    render: (c) => <CodeLink entity="consignment" code={c.code} />,
  },
  {
    key: "invoiceCode",
    label: "Mã hóa đơn",
    visible: true,
    width: "200px",
    render: (c) => {
      const codes = returnCodes(c);
      const hasInv = !!c.invoices?.length;
      if (!hasInv && codes.length === 0) return "-";
      return (
        <div className="flex flex-col gap-0.5">
          {hasInv && (
            <div>
              {c.invoices!.map((inv, idx) => (
                <Fragment key={inv.code ?? idx}>
                  {idx > 0 && <span className="text-gray-400"> | </span>}
                  <CodeLink entity="invoice" code={inv.code} />
                </Fragment>
              ))}
            </div>
          )}
          {codes.length > 0 && (
            <div className="text-xs text-orange-600">{codes.join(" | ")}</div>
          )}
        </div>
      );
    },
  },
  {
    key: "consignDate",
    label: "Ngày ký gửi",
    visible: true,
    width: "170px",
    render: (c) => formatDateTime(c.consignDate),
  },
  {
    key: "createdDate",
    label: "Ngày tạo",
    visible: false,
    width: "170px",
    render: (c) => formatDateTime(c.createdAt),
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    width: "200px",
    render: (c) => c.customer?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "150px",
    render: (c) => c.branch?.name || "-",
  },
  {
    key: "totalAmount",
    label: "Tổng tiền hàng",
    visible: true,
    width: "150px",
    render: (c) => formatCurrency(Number(c.totalAmount)),
  },
  {
    key: "grandTotal",
    label: "Tổng cộng",
    visible: true,
    width: "150px",
    render: (c) => formatCurrency(Number(c.grandTotal)),
  },
  {
    key: "invoicedQty",
    label: "SL đã xuất",
    visible: true,
    width: "120px",
    render: (c) => invoicedQty(c).toLocaleString("vi-VN"),
  },
  {
    key: "returnedQty",
    label: "SL hoàn KG",
    visible: true,
    width: "120px",
    render: (c) => {
      const r = receivedQty(c);
      return (
        <span className={r > 0 ? "text-orange-600 font-medium" : ""}>
          {r.toLocaleString("vi-VN")}
        </span>
      );
    },
  },
  {
    key: "remainingQty",
    label: "Ký gửi còn lại",
    visible: true,
    width: "130px",
    render: (c) => {
      const remaining = consignedQty(c) - invoicedQty(c) - receivedQty(c);
      return (
        <span className={remaining > 0 ? "text-orange-600 font-medium" : ""}>
          {remaining.toLocaleString("vi-VN")}
        </span>
      );
    },
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "150px",
    render: (c) => c.creator?.name || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "170px",
    render: (c) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          CONSIGNMENT_STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {getStatusLabel(c.status)}
      </span>
    ),
  },
];

export function ConsignmentsTable({
  filters,
  onFiltersChange,
  onCreateClick,
}: ConsignmentsTableProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || "");
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "consignmentTableColumns",
    DEFAULT_COLUMNS
  );

  const { data, isLoading } = useConsignments({
    ...filters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const consignments = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const colSpan = visibleColumns.length + 1; // chevron

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="consignments" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Đơn hàng ký gửi
            </h2>
            <input
              type="text"
              placeholder="Tìm mã ký gửi, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="consignments" action="create">
              <button
                onClick={() =>
                  onCreateClick
                    ? onCreateClick()
                    : router.push("/don-hang/ky-gui/new")
                }
                className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo phiếu
              </button>
            </PermissionGate>
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
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
              ) : consignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có phiếu ký gửi nào</div>
                  </td>
                </tr>
              ) : (
                consignments.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === c.id
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(c.id)}>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedId === c.id ? "border-t-2 border-brand" : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(c)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedId === c.id
                            ? "border-t-2 border-r-2 border-brand"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedId === c.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <ConsignmentDetailRow
                        consignmentId={c.id}
                        colSpan={colSpan}
                      />
                    )}
                  </Fragment>
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
