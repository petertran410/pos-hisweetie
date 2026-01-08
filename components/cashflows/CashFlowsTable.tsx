"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useCashFlows, useOpeningBalance } from "@/lib/hooks/useCashflows";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, Settings, FileDown, ChevronDown } from "lucide-react";
import { CreateCashFlowModal } from "./CreateCashFlowModal";
import type { CashFlow } from "@/lib/types/cashflow";
import { CashFlowDetailRow } from "./CashFlowDetailRow";

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
  return new Intl.NumberFormat("en-US").format(value);
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

const RECEIPT_TYPES = [
  { type: "cash", label: "Tiền mặt" },
  { type: "bank", label: "Ngân hàng" },
  { type: "ewallet", label: "Ví điện tử" },
];

export function CashFlowsTable({
  filters,
  onCreateReceiptClick,
  onCreatePaymentClick,
}: CashFlowsTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedCashFlowId, setExpandedCashFlowId] = useState<number | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showReceiptDropdown, setShowReceiptDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<"cash" | "bank" | "ewallet">(
    "cash"
  );
  const [isReceipt, setIsReceipt] = useState(true);

  const receiptButtonRef = useRef<HTMLDivElement>(null);
  const paymentButtonRef = useRef<HTMLDivElement>(null);

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

  const { data: openingBalanceData } = useOpeningBalance(filters);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cashflowTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        receiptButtonRef.current &&
        !receiptButtonRef.current.contains(event.target as Node)
      ) {
        setShowReceiptDropdown(false);
      }
      if (
        paymentButtonRef.current &&
        !paymentButtonRef.current.contains(event.target as Node)
      ) {
        setShowPaymentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const toggleExpand = (cashFlowId: number) => {
    setExpandedCashFlowId((prev) => (prev === cashFlowId ? null : cashFlowId));
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

    const openingBalance = openingBalanceData || 0;
    const closingBalance = openingBalance + totalReceipts - totalPayments;

    return {
      openingBalance,
      totalReceipts,
      totalPayments,
      closingBalance,
    };
  };

  const stats = calculateStats();

  const handleCreateClick = (
    type: "cash" | "bank" | "ewallet",
    receipt: boolean
  ) => {
    setModalType(type);
    setIsReceipt(receipt);
    setShowCreateModal(true);
    setShowReceiptDropdown(false);
    setShowPaymentDropdown(false);
  };

  const handleReceiptMouseEnter = () => {
    setShowReceiptDropdown(true);
    setShowPaymentDropdown(false);
  };

  const handlePaymentMouseEnter = () => {
    setShowPaymentDropdown(true);
    setShowReceiptDropdown(false);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
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
                {formatMoney(stats.totalPayments)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Quỹ cuối kỳ</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatMoney(stats.closingBalance)}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 w-[500px]">
            <h2 className="text-xl font-semibold w-[150px]">Sổ quỹ</h2>
            <input
              type="text"
              placeholder="Tìm kiếm sổ quỹ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div
              ref={receiptButtonRef}
              className="relative"
              onMouseEnter={handleReceiptMouseEnter}
              onMouseLeave={() => setShowReceiptDropdown(false)}>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-md flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tạo phiếu thu
                <ChevronDown className="w-4 h-4" />
              </button>

              {showReceiptDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                  {RECEIPT_TYPES.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleCreateClick(item.type as any, true)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-md transition-colors">
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              ref={paymentButtonRef}
              className="relative"
              onMouseEnter={handlePaymentMouseEnter}
              onMouseLeave={() => setShowPaymentDropdown(false)}>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-md flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tạo phiếu chi
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPaymentDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                  {RECEIPT_TYPES.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleCreateClick(item.type as any, false)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-md transition-colors">
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowColumnModal(true)}
              className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Cột hiển thị
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
                      selectedIds.length === cashflows.length &&
                      cashflows.length > 0
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
              ) : cashflows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 1}
                    className="px-6 py-8 text-center text-gray-500">
                    Chưa có sổ quỹ nào
                  </td>
                </tr>
              ) : (
                cashflows.map((cashflow) => (
                  <Fragment key={cashflow.id}>
                    <tr
                      className={`border-b cursor-pointer ${
                        expandedCashFlowId === cashflow.id ? "bg-gray-50" : ""
                      }`}
                      onClick={() => toggleExpand(cashflow.id)}>
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
                          className="px-6 py-3 text-md whitespace-nowrap">
                          {col.render(cashflow)}
                        </td>
                      ))}
                    </tr>
                    {expandedCashFlowId === cashflow.id && (
                      <CashFlowDetailRow
                        cashFlowId={cashflow.id}
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
              Hiển thị {cashflows.length} / {total} kết quả
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-md">
              Trước
            </button>
            <span className="px-4 py-1 text-md">
              Trang {page} / {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-md">
              Sau
            </button>
          </div>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              Tùy chỉnh cột hiển thị
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {DEFAULT_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      columns.find((c) => c.key === col.key)?.visible ?? false
                    }
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-md">{col.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-md">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateCashFlowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        type={modalType}
        isReceipt={isReceipt}
      />
    </>
  );
}
