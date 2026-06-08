"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useSupplierReturns } from "@/lib/hooks/useSupplierReturns";
import { useBranchStore } from "@/lib/store/branch";
import type { SupplierReturn } from "@/lib/types/supplier-return";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { CodeLink } from "@/components/shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface Props {
  filters: any;
  onCreateClick: () => void;
  onViewClick: (item: SupplierReturn) => void;
  onImportClick?: () => void;
}

const formatMoney = (v: number) => new Intl.NumberFormat("en-US").format(v);
const formatDateTime = (s?: string) =>
  s ? new Date(s).toLocaleString("vi-VN") : "-";

const STATUS_COLOR: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<number, string> = {
  1: "Yêu cầu trả",
  2: "Đã xuất kho",
  3: "Hoàn thành",
  4: "Đã hủy",
  5: "Phiếu tạm",
  6: "Đang xuất kho (tạm)",
};

const MODE_LABEL: Record<string, string> = {
  by_purchase_order: "Theo phiếu nhập",
  by_product: "Sản phẩm lẻ",
};

const DEFAULT_COLUMNS: ColumnConfig<SupplierReturn>[] = [
  {
    key: "code",
    label: "Mã trả hàng nhập",
    visible: true,
    render: (item) => <CodeLink entity="supplier-return" code={item.code} />,
  },
  {
    key: "purchaseOrderCode",
    label: "Mã phiếu nhập",
    visible: true,
    render: (item) =>
      item.purchaseOrder?.code ? (
        <CodeLink entity="purchase-order" code={item.purchaseOrder.code} />
      ) : (
        "-"
      ),
  },
  {
    key: "supplier",
    label: "Nhà cung cấp",
    visible: true,
    render: (item) => item.supplier?.name || "-",
  },
  {
    key: "mode",
    label: "Loại trả",
    visible: true,
    render: (item) => MODE_LABEL[item.mode] || item.mode,
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    render: (item) => item.branch?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    render: (item) => item.creator?.name || item.createdByName || "-",
  },
  {
    key: "createdAt",
    label: "Thời gian tạo",
    visible: true,
    render: (item) => formatDateTime(item.createdAt),
  },
  {
    key: "totalReturnAmount",
    label: "Tổng tiền trả",
    visible: true,
    render: (item) => formatMoney(Number(item.totalReturnAmount)),
  },
  {
    key: "refundAmount",
    label: "Thực xuất",
    visible: true,
    render: (item) => formatMoney(Number(item.refundAmount)),
  },
  {
    key: "refundType",
    label: "Hình thức",
    visible: true,
    render: (item) =>
      item.refundType === "cash_refund"
        ? "Thu tiền"
        : item.refundType === "debt_offset"
          ? "Cấn trừ nợ"
          : "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (item) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-700"
        }`}>
        {STATUS_LABEL[item.status] ?? "Không xác định"}
      </span>
    ),
  },
];

export function SupplierReturnsTable({
  filters,
  onCreateClick,
  onViewClick,
  onImportClick,
}: Props) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { columns, visibleColumns, toggleColumn } =
    useColumnVisibility<SupplierReturn>(
      "supplierReturnTableColumns",
      DEFAULT_COLUMNS
    );

  const { data, isLoading } = useSupplierReturns({
    page,
    limit,
    search,
    branchId: selectedBranch?.id,
    ...filters,
  });

  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <PermissionGate resource="supplier_returns" action="view">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, tên NCC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-lg text-sm w-80"
          />
          <div className="flex items-center gap-2">
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
            {onImportClick && (
              <PermissionGate resource="supplier_returns" action="create">
                <button
                  onClick={onImportClick}
                  className="flex items-center gap-1 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm">
                  <Upload className="w-4 h-4" />
                  Import Excel
                </button>
              </PermissionGate>
            )}
            <PermissionGate resource="supplier_returns" action="create">
              <button
                onClick={onCreateClick}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <Plus className="w-4 h-4" />
                Tạo phiếu trả hàng nhập
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="text-center py-8 text-gray-500">
                    Không có phiếu trả hàng nhập
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => onViewClick(item)}>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">Tổng: {total} bản ghi</div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border rounded text-sm">
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">
              Trước
            </button>
            <span className="text-sm">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">
              Sau
            </button>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
