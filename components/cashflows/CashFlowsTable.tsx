// components/cashflows/CashFlowsTable.tsx
"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import { useCashFlows } from "@/lib/hooks/useCashflows";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { CashFlow } from "@/lib/types/cashflow";
import { CashFlowDetailRow } from "./CashFlowDetailRow";
import { formatCurrency } from "@/lib/utils";
import { Can } from "../permissions/Can";
import { CreateCashFlowModal } from "./CreateCashFlowModal";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (cf: CashFlow) => React.ReactNode;
}

interface CashFlowsTableProps {
  filters: any;
  onCreateReceiptClick: () => void;
  onCreatePaymentClick: () => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "receipt", label: "Phiếu thu" },
  { value: "payment", label: "Phiếu chi" },
  { value: "2", label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  0: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
};

const STATUS_TEXT: Record<number, string> = {
  0: "Hoạt động",
  2: "Đã hủy",
};

const METHOD_TEXT: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  ewallet: "Ví điện tử",
  card: "Thẻ",
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã phiếu",
    visible: true,
    width: "160px",
    render: (cf) => (
      <span className="font-medium text-blue-600">{cf.code}</span>
    ),
  },
  {
    key: "transDate",
    label: "Thời gian",
    visible: true,
    width: "160px",
    render: (cf) => formatDateTime(cf.transDate),
  },
  {
    key: "type",
    label: "Loại phiếu",
    visible: true,
    width: "120px",
    render: (cf) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          cf.isReceipt
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
        {cf.isReceipt ? "Phiếu thu" : "Phiếu chi"}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Số tiền",
    visible: true,
    width: "140px",
    render: (cf) => {
      const total =
        Number(cf.amount) + Number((cf as any).debtOffsetTotal || 0);
      return (
        <span
          className={`font-medium ${cf.isReceipt ? "text-green-600" : "text-red-600"}`}>
          {cf.isReceipt ? "+" : "-"}
          {formatCurrency(total)}
        </span>
      );
    },
  },
  {
    key: "method",
    label: "Phương thức",
    visible: true,
    width: "130px",
    render: (cf) => METHOD_TEXT[cf.method] || cf.method || "-",
  },
  {
    key: "partnerName",
    label: "Người nộp/nhận",
    visible: true,
    width: "180px",
    render: (cf) => cf.partnerName || "-",
  },
  {
    key: "cashFlowGroup",
    label: "Loại thu/chi",
    visible: true,
    width: "150px",
    render: (cf) => cf.cashFlowGroupName || cf.cashFlowGroup?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: false,
    width: "150px",
    render: (cf) => cf.branchName || cf.branch?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "140px",
    render: (cf) => cf.creatorName || cf.creator?.name || "-",
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: false,
    width: "160px",
    render: (cf) => formatDateTime(cf.createdAt),
  },
  {
    key: "description",
    label: "Ghi chú",
    visible: false,
    width: "200px",
    render: (cf) => cf.description || "-",
  },
  {
    key: "account",
    label: "Tài khoản NH",
    visible: false,
    width: "180px",
    render: (cf) =>
      cf.account ? `${cf.account.bankName} - ${cf.account.accountNumber}` : "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "140px",
    render: (cf) => (
      <span
        className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLOR[cf.status] || "bg-gray-100 text-gray-700"
        }`}>
        {cf.status === 0
          ? cf.isReceipt
            ? "Đã thanh toán"
            : "Đã chi"
          : cf.status === 2
            ? "Đã hủy"
            : "Đang xử lý"}
      </span>
    ),
  },
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Create modal state
  const [createModalType, setCreateModalType] = useState<
    "cash" | "bank" | "ewallet" | null
  >(null);
  const [createModalIsReceipt, setCreateModalIsReceipt] = useState(true);
  const [showReceiptDropdown, setShowReceiptDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const receiptDropdownRef = useRef<HTMLDivElement>(null);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi filter/search/tab đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Tab override sidebar
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (activeStatusTab === "receipt") f.isReceipt = true;
    else if (activeStatusTab === "payment") f.isReceipt = false;
    else if (activeStatusTab === "2") f.status = 2;
    return f;
  }, [filters, activeStatusTab]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashFlowTableColumns");
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

  const { data, isLoading } = useCashFlows({
    pageSize: limit,
    currentItem: (page - 1) * limit,
    branchIds: selectedBranch?.id ? [selectedBranch.id] : undefined,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...effectiveFilters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cashFlowTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        receiptDropdownRef.current &&
        !receiptDropdownRef.current.contains(e.target as Node)
      ) {
        setShowReceiptDropdown(false);
      }
      if (
        paymentDropdownRef.current &&
        !paymentDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPaymentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cashFlows = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  const toggleColumnVisibility = (key: string) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === cashFlows.length ? [] : cashFlows.map((c) => c.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedCashFlowId((prev) => (prev === id ? null : id));

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const openCreateModal = (
    type: "cash" | "bank" | "ewallet",
    isReceipt: boolean
  ) => {
    setCreateModalType(type);
    setCreateModalIsReceipt(isReceipt);
    setShowReceiptDropdown(false);
    setShowPaymentDropdown(false);
  };

  return (
    <Can resource="cash_flows" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* Toolbar */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Sổ quỹ
            </h2>
            <input
              type="text"
              placeholder="Tìm mã phiếu, người nộp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Can resource="cash_flows" action="create">
              {/* Nút Phiếu thu */}
              <div ref={receiptDropdownRef} className="relative">
                <button
                  onClick={() => {
                    setShowReceiptDropdown((v) => !v);
                    setShowPaymentDropdown(false);
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Phiếu thu
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showReceiptDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showReceiptDropdown && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => openCreateModal("cash", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Thu tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100">
                        Thu chuyển khoản
                      </button>
                      <button
                        onClick={() => openCreateModal("ewallet", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100">
                        Thu ví điện tử
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Phiếu chi */}
              <div ref={paymentDropdownRef} className="relative">
                <button
                  onClick={() => {
                    setShowPaymentDropdown((v) => !v);
                    setShowReceiptDropdown(false);
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Phiếu chi
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showPaymentDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showPaymentDropdown && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => openCreateModal("cash", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Chi tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100">
                        Chi chuyển khoản
                      </button>
                      <button
                        onClick={() => openCreateModal("ewallet", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-100">
                        Chi ví điện tử
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Can>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600">
              <Settings className="w-4 h-4" />
              Cột
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      cashFlows.length > 0 &&
                      selectedIds.length === cashFlows.length
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
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : cashFlows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400">
                    <div className="text-sm">Không có phiếu thu/chi nào</div>
                  </td>
                </tr>
              ) : (
                cashFlows.map((cf) => (
                  <Fragment key={cf.id}>
                    <tr
                      className={`border-b cursor-pointer transition-colors ${
                        expandedCashFlowId === cf.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(cf.id)}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedCashFlowId === cf.id
                            ? "bg-blue-50"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cf.id)}
                          onChange={() => toggleSelect(cf.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-2.5"
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(cf)}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedCashFlowId === cf.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedCashFlowId === cf.id && (
                      <CashFlowDetailRow cashFlowId={cf.id} colSpan={colSpan} />
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — giống InvoicesTable */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-sm shrink-0">
          <div className="flex items-center gap-2 text-gray-600">
            <span>Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-200 rounded px-1.5 py-0.5 text-sm">
              {[15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>{total > 0 ? ` • ${total.toLocaleString()} phiếu` : ""}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Column modal — giống InvoicesTable */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-base font-semibold text-gray-800">
                  Tùy chỉnh cột hiển thị
                </h3>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {createModalType && (
          <CreateCashFlowModal
            isOpen={true}
            onClose={() => setCreateModalType(null)}
            type={createModalType}
            isReceipt={createModalIsReceipt}
          />
        )}
      </div>
    </Can>
  );
}
