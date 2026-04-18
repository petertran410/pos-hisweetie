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
    render: (cf) => (
      <span
        className={`font-medium ${cf.isReceipt ? "text-green-600" : "text-red-600"}`}>
        {cf.isReceipt ? "+" : "-"}
        {formatCurrency(Number(cf.amount))}
      </span>
    ),
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
    width: "120px",
    render: (cf) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const createDropdownRef = useRef<HTMLDivElement>(null);

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
    page,
    pageSize: limit,
    currentItem: (page - 1) * limit,
    search: debouncedSearch || undefined,
    branchIds: selectedBranch?.id ? [selectedBranch.id] : undefined,
    ...effectiveFilters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cashFlowTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        createDropdownRef.current &&
        !createDropdownRef.current.contains(e.target as Node)
      )
        setShowCreateDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
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
    setShowCreateDropdown(false);
  };

  return (
    <Can resource="cash_flows" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
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
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Can resource="cash_flows" action="create">
              <div ref={createDropdownRef} className="relative">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Tạo phiếu
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showCreateDropdown && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border rounded-lg shadow-lg z-30">
                    <div className="py-1">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
                        Phiếu thu
                      </div>
                      <button
                        onClick={() => openCreateModal("cash", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Thu tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Thu chuyển khoản
                      </button>
                      <button
                        onClick={() => openCreateModal("ewallet", true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Thu ví điện tử
                      </button>
                      <div className="border-t my-1" />
                      <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
                        Phiếu chi
                      </div>
                      <button
                        onClick={() => openCreateModal("cash", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Chi tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Chi chuyển khoản
                      </button>
                      <button
                        onClick={() => openCreateModal("ewallet", false)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        Chi ví điện tử
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Can>
            <button
              onClick={() => setShowColumnModal(true)}
              className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-gray-50/50 shrink-0 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap transition-colors ${
                activeStatusTab === tab.value
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left sticky left-0 z-10 bg-white">
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
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase"
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

        {/* ── Pagination ── */}
        <div className="border-t px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
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
            <span>/ {total} phiếu</span>
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

        {/* ── Column Toggle Modal ── */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-80 max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800">Hiển thị cột</h3>
                <button onClick={() => setShowColumnModal(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="cursor-pointer"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Create Modal ── */}
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
