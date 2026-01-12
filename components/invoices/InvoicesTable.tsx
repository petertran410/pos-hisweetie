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
    case 1:
      return "bg-green-100 text-green-700";
    case 2:
      return "bg-red-100 text-red-700";
    case 3:
      return "bg-blue-100 text-blue-700";
    case 4:
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Hoàn thành";
    case 2:
      return "Đã hủy";
    case 3:
      return "Đang xử lý";
    case 4:
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
    key: "orderCode",
    label: "Mã vận đơn",
    visible: false,
    render: (invoice) => invoice.delivery?.deliveryCode || "-",
  },
  {
    key: "deliveryStatus",
    label: "Trạng thái giao hàng",
    visible: false,
    render: (invoice) => {
      const deliveryStatus = invoice.delivery?.status;
      if (!deliveryStatus) return "-";
      return deliveryStatus === 1 ? "Chưa giao" : "Đã giao";
    },
  },
  {
    key: "reconciliationCode",
    label: "Mã đối soát",
    visible: false,
    render: () => "-",
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
    visible: true,
    render: (invoice) => formatDateTime(invoice.updatedAt),
  },
  {
    key: "returnCode",
    label: "Mã trả hàng",
    visible: false,
    render: () => "-",
  },
  {
    key: "customerCode",
    label: "Mã KH",
    visible: true,
    render: (invoice) => invoice.customer?.code || "-",
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    render: (invoice) => invoice.customer?.name || "-",
  },
  {
    key: "email",
    label: "Email",
    visible: false,
    render: (invoice) => invoice.customer?.email || "-",
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
    key: "area",
    label: "Khu vực",
    visible: false,
    render: (invoice) => invoice.customer?.cityName || "-",
  },
  {
    key: "ward",
    label: "Phường/Xã",
    visible: false,
    render: (invoice) => invoice.customer?.wardName || "-",
  },
  {
    key: "birthDate",
    label: "Ngày sinh",
    visible: false,
    render: (invoice) => {
      if (!invoice.customer?.birthDate) return "-";
      return formatDateTime(invoice.customer.birthDate);
    },
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    render: (invoice) => invoice.branch?.name || "-",
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
    key: "saleChannel",
    label: "Kênh bán",
    visible: false,
    render: (invoice) => invoice.saleChannel?.name || "Khác",
  },
  {
    key: "deliveryPartner",
    label: "Đối tác giao hàng",
    visible: false,
    render: (invoice) => invoice.delivery?.partnerDelivery?.name || "-",
  },
  {
    key: "notes",
    label: "Ghi chú",
    visible: false,
    render: (invoice) => invoice.description || "-",
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
    key: "taxDiscount",
    label: "Giảm thuế",
    visible: false,
    render: () => "-",
  },
  {
    key: "otherFees",
    label: "Thu khác",
    visible: false,
    render: () => "-",
  },
  {
    key: "paymentDiscount",
    label: "Chiết khấu thanh toán",
    visible: false,
    render: () => "-",
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
    key: "codAmount",
    label: "Còn cần thu (COD)",
    visible: false,
    render: (invoice) => formatMoney(Number(invoice.debtAmount)),
  },
  {
    key: "deliveryFee",
    label: "Phí trả ĐTGH",
    visible: false,
    render: (invoice) =>
      invoice.delivery?.price
        ? formatMoney(Number(invoice.delivery.price))
        : "-",
  },
  {
    key: "deliveryNote",
    label: "Ghi chú trạng thái giao hàng",
    visible: false,
    render: () => "-",
  },
  {
    key: "deliveryTime",
    label: "Thời gian giao hàng",
    visible: false,
    render: (invoice) => {
      if (!invoice.delivery?.createdAt) return "-";
      return formatDateTime(invoice.delivery.createdAt);
    },
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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

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

  console.log(invoices);

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

  const toggleExpand = (invoiceId: number) => {
    setExpandedInvoiceId((prev) => (prev === invoiceId ? null : invoiceId));
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[150px]">Hóa đơn</h2>
          <input
            type="text"
            placeholder="Tìm kiếm hóa đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tạo Hóa Đơn
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột Hiển Thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === invoices.length &&
                    invoices.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                    className={`border-b cursor-pointer ${
                      expandedInvoiceId === invoice.id ? "" : ""
                    }`}
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
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-md">
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
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            ←
          </button>
          <span className="text-md">
            Trang {page} / {Math.ceil(total / limit) || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            →
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-md">{col.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
