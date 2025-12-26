"use client";

import { useState, useEffect, Fragment } from "react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, Settings } from "lucide-react";
import type { Invoice } from "@/lib/types/invoice";
import { InvoiceDetailRow } from "./InvoiceDetailRow";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (invoice: Invoice) => React.ReactNode;
}

interface InvoicesTableProps {
  filters: any;
  onCreateClick: () => void;
  onEditClick: (invoice: Invoice) => void;
}

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 3:
      return "bg-blue-100 text-blue-700";
    case 1:
      return "bg-green-100 text-green-700";
    case 2:
      return "bg-red-100 text-red-700";
    case 5:
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 3:
      return "Đang xử lý";
    case 1:
      return "Hoàn thành";
    case 2:
      return "Đã hủy";
    case 5:
      return "Không giao được";
    default:
      return "Không xác định";
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã hóa đơn",
    visible: true,
    render: (invoice) => invoice.code,
  },
  {
    key: "purchaseDate",
    label: "Thời gian",
    visible: true,
    render: (invoice) => formatDateTime(invoice.purchaseDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: true,
    render: (invoice) => formatDateTime(invoice.createdAt),
  },
  {
    key: "updateDate",
    label: "Ngày cập nhật",
    visible: false,
    render: (invoice) => formatDateTime(invoice.updatedAt),
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    render: (invoice) => invoice.customer?.name || "Khách vãng lai",
  },
  {
    key: "seller",
    label: "Người bán",
    visible: true,
    render: (invoice) => invoice.soldBy?.name || invoice.creator?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: true,
    render: (invoice) => invoice.creator?.name || "-",
  },
  {
    key: "totalAmount",
    label: "Tổng tiền hàng",
    visible: false,
    render: (invoice) => formatMoney(Number(invoice.totalAmount)),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    render: (invoice) => formatMoney(Number(invoice.discount)),
  },
  {
    key: "grandTotal",
    label: "Tổng sau giảm giá",
    visible: false,
    render: (invoice) => formatMoney(Number(invoice.grandTotal)),
  },
  {
    key: "customerDebt",
    label: "Khách cần trả",
    visible: true,
    render: (invoice) => formatMoney(Number(invoice.grandTotal)),
  },
  {
    key: "customerPaid",
    label: "Khách đã trả",
    visible: true,
    render: (invoice) => formatMoney(Number(invoice.paidAmount)),
  },
  {
    key: "phone",
    label: "Điện thoại",
    visible: false,
    render: (invoice) =>
      invoice.customer?.contactNumber || invoice.customer?.phone || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    render: (invoice) => invoice.customer?.address || "-",
  },
  {
    key: "saleChannel",
    label: "Kênh bán",
    visible: false,
    render: (invoice) => invoice.saleChannel?.name || "Khác",
  },
  {
    key: "notes",
    label: "Ghi chú",
    visible: false,
    render: (invoice) => invoice.description || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (invoice) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          invoice.status
        )}`}>
        {getStatusText(invoice.status)}
      </span>
    ),
  },
];

export function InvoicesTable({
  filters,
  onCreateClick,
  onEditClick,
}: InvoicesTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("invoiceTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const { data, isLoading } = useInvoices({
    page,
    limit,
    search,
    branchId: selectedBranch?.id,
    ...filters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("invoiceTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const invoices = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((i) => i.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedInvoiceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Hóa đơn</h2>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hóa đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg w-96"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tùy chỉnh cột
          </button>
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Tạo hóa đơn
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    invoices.length > 0 &&
                    selectedIds.length === invoices.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-md font-semibold text-gray-700 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Chưa có hóa đơn nào
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <Fragment key={invoice.id}>
                  <tr
                    className="border-b cursor-pointer"
                    onClick={() => toggleExpand(invoice.id)}>
                    <td
                      className="px-6 py-3 sticky left-0 bg-white"
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-6 py-3 text-md whitespace-nowrap">
                        {col.render(invoice)}
                      </td>
                    ))}
                  </tr>
                  {expandedInvoiceId === invoice.id && (
                    <InvoiceDetailRow
                      invoiceId={invoice.id}
                      colSpan={visibleColumns.length + 1}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} hóa đơn
          </span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1 border rounded">
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50">
            Trước
          </button>
          <span className="px-3 py-1">
            Trang {page} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1 border rounded disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Tùy chỉnh cột hiển thị
            </h3>
            <div className="space-y-2">
              {columns.map((col) => (
                <label key={col.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
