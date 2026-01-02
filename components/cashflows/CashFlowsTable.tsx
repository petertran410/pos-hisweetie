"use client";

import { useState, useEffect } from "react";
import { useCashFlows } from "@/lib/hooks/useCashflows";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, Settings, FileDown } from "lucide-react";
import type { CashFlow } from "@/lib/types/cashflow";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (cashflow: CashFlow) => React.ReactNode;
}

interface CashFlowsTableProps {
  filters: any;
  onCreateReceiptClick: () => void;
  onCreatePaymentClick: () => void;
}

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("vi-VN").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return "bg-green-100 text-green-700";
    case 1:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã phiếu",
    visible: true,
    render: (cashflow) => (
      <span className="font-medium text-blue-600">{cashflow.code}</span>
    ),
  },
  {
    key: "transDate",
    label: "Thời gian",
    visible: true,
    render: (cashflow) => formatDateTime(cashflow.transDate),
  },
  {
    key: "cashFlowGroup",
    label: "Loại thu chi",
    visible: true,
    render: (cashflow) => cashflow.cashFlowGroupName || "-",
  },
  {
    key: "partnerName",
    label: "Người nộp/nhận",
    visible: true,
    render: (cashflow) => cashflow.partnerName || "-",
  },
  {
    key: "amount",
    label: "Giá trị",
    visible: true,
    render: (cashflow) => (
      <span
        className={`font-medium ${
          cashflow.isReceipt ? "text-green-600" : "text-red-600"
        }`}>
        {cashflow.isReceipt ? "+" : "-"}
        {formatMoney(Number(cashflow.amount))}
      </span>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (cashflow) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          cashflow.status
        )}`}>
        {cashflow.statusValue || "Đã thanh toán"}
      </span>
    ),
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    render: (cashflow) => cashflow.creatorName || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    render: (cashflow) => cashflow.branchName || "-",
  },
  {
    key: "accountName",
    label: "Tên tài khoản",
    visible: false,
    render: (cashflow) => cashflow.account?.bankName || "-",
  },
  {
    key: "accountNumber",
    label: "Số tài khoản",
    visible: false,
    render: (cashflow) => cashflow.account?.accountNumber || "-",
  },
  {
    key: "method",
    label: "Phương thức",
    visible: false,
    render: (cashflow) => {
      const methodMap: { [key: string]: string } = {
        cash: "Tiền mặt",
        card: "Thẻ",
        transfer: "Chuyển khoản",
      };
      return methodMap[cashflow.method] || cashflow.method;
    },
  },
  {
    key: "description",
    label: "Ghi chú",
    visible: false,
    render: (cashflow) => cashflow.description || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    render: (cashflow) => cashflow.address || "-",
  },
  {
    key: "contactNumber",
    label: "Số điện thoại",
    visible: false,
    render: (cashflow) => cashflow.contactNumber || "-",
  },
  {
    key: "wardName",
    label: "Phường/Xã",
    visible: false,
    render: (cashflow) => cashflow.wardName || "-",
  },
];

export function CashFlowsTable({
  filters,
  onCreateReceiptClick,
  onCreatePaymentClick,
}: CashFlowsTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashflowTableColumns");
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

  const { data, isLoading } = useCashFlows({
    pageSize: limit,
    currentItem: (page - 1) * limit,
    ...filters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cashflowTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const cashflows = data?.data || [];
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
    if (selectedIds.length === cashflows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cashflows.map((c) => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const calculateStats = () => {
    const receipts = cashflows.filter((c) => c.isReceipt && c.status === 0);
    const payments = cashflows.filter((c) => !c.isReceipt && c.status === 0);

    const totalReceipts = receipts.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );
    const totalPayments = payments.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );

    return {
      openingBalance: 132569727287,
      totalReceipts,
      totalPayments,
      closingBalance: 132569727287 + totalReceipts - totalPayments,
    };
  };

  const stats = calculateStats();

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="border-b p-4 bg-gray-50">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Quỹ đầu kỳ</div>
            <div className="text-lg font-semibold">
              {formatMoney(stats.openingBalance)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Tổng thu</div>
            <div className="text-lg font-semibold text-green-600">
              {formatMoney(stats.totalReceipts)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Tổng chi</div>
            <div className="text-lg font-semibold text-red-600">
              -{formatMoney(stats.totalPayments)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Tồn quỹ</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatMoney(stats.closingBalance)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Theo mã phiếu"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg text-sm w-80"
              />
              <svg
                className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateReceiptClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Phiếu thu
            </button>
            <button
              onClick={onCreatePaymentClick}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Phiếu chi
            </button>
            <button
              onClick={() => setShowColumnModal(true)}
              className="p-2 border rounded-lg hover:bg-gray-50"
              title="Tùy chỉnh cột">
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="p-2 border rounded-lg hover:bg-gray-50"
              title="Xuất file">
              <FileDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    cashflows.length > 0 &&
                    selectedIds.length === cashflows.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : cashflows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Chưa có phiếu thu/chi nào
                </td>
              </tr>
            ) : (
              cashflows.map((cashflow) => (
                <tr
                  key={cashflow.id}
                  className="border-b hover:bg-gray-50 cursor-pointer">
                  <td
                    className="px-6 py-3 sticky left-0 bg-white"
                    onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(cashflow.id)}
                      onChange={() => toggleSelect(cashflow.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-3 text-sm whitespace-nowrap">
                      {col.render(cashflow)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} phiếu
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm">
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
          <span className="text-sm">
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
                  <span className="text-sm">{col.label}</span>
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
