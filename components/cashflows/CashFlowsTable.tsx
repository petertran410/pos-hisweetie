"use client";

import { useState, useEffect, Fragment, useMemo, useRef } from "react";
import {
  useCashFlows,
  useExportCashFlows,
  useOpeningBalance,
  useCashFlowSummary,
} from "@/lib/hooks/useCashflows";
import { useBranchStore } from "@/lib/store/branch";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
} from "lucide-react";
import type { CashFlow } from "@/lib/types/cashflow";
import { CashFlowDetailRow } from "./CashFlowDetailRow";
import { formatCurrency } from "@/lib/utils";
import { CreateCashFlowModal } from "./CreateCashFlowModal";
import { PermissionGate } from "../permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

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

const METHOD_TEXT: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  // ewallet: "Ví điện tử",
  // card: "Thẻ",
};

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const DEFAULT_COLUMNS: ColumnConfig<CashFlow>[] = [
  {
    key: "code",
    label: "Mã phiếu",
    visible: true,
    width: "160px",
    render: (cf) => <CodeLink entity="cashflow" code={cf.code} />,
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
    key: "sepayReferenceCode",
    label: "Mã tham chiếu",
    visible: true,
    width: "150px",
    render: (cf) => cf.sepayReferenceCode || "-",
  },
  {
    key: "partnerName",
    label: "Người nộp/nhận",
    visible: true,
    width: "180px",
    render: (cf) => cf.partnerName || "-",
  },
  {
    key: "partnerCode",
    label: "Mã KH/NCC",
    visible: true,
    width: "150px",
    render: (cf) => {
      if (cf.partnerType === "C" && cf.customer?.code) {
        return <CodeLink entity="customer" code={cf.customer.code} withIcon />;
      }
      if (cf.partnerType === "S" && cf.supplier?.code) {
        return <CodeLink entity="supplier" code={cf.supplier.code} withIcon />;
      }
      return "-";
    },
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
  const exportRef = useRef<HTMLDivElement>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const { exportOverview, isExportingOverview } = useExportCashFlows();

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

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "cashFlowTableColumns",
    DEFAULT_COLUMNS
  );

  // Bộ filter dùng chung cho cả list, summary và opening-balance — KHÔNG kèm
  // phân trang, để tổng thu/chi tính trên TOÀN BỘ tập đã lọc (không bị giới hạn
  // theo số phiếu của 1 trang).
  const summaryFilters = useMemo(
    () => ({
      ...(effectiveFilters.code
        ? {}
        : { branchIds: selectedBranch?.id ? [selectedBranch.id] : undefined }),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...effectiveFilters,
    }),
    [effectiveFilters, selectedBranch?.id, debouncedSearch]
  );

  const { data, isLoading } = useCashFlows({
    pageSize: limit,
    currentItem: (page - 1) * limit,
    ...summaryFilters,
  });

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
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cashFlows = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleExportOverview = async () => {
    setShowExportDropdown(false);
    await exportOverview(effectiveFilters);
  };

  const canViewBalance = useCan("cash_flows", "view_balance");

  const { data: openingBalance } = useOpeningBalance(
    canViewBalance ? summaryFilters : null
  );

  // Tổng thu/chi lấy từ backend trên toàn bộ tập đã lọc (không theo trang).
  const { data: summary } = useCashFlowSummary(summaryFilters);

  const totalReceipt = Number(summary?.totalReceipt || 0);
  const totalPayment = Number(summary?.totalPayment || 0);

  const closingBalance = useMemo(
    () => Number(openingBalance || 0) + totalReceipt - totalPayment,
    [openingBalance, totalReceipt, totalPayment]
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
    <PermissionGate resource="cash_flows" action="view">
      <div className="dt-panel flex-1 flex flex-col overflow-hidden mt-4 mr-4 mb-4 min-w-0">
        {/* Toolbar */}
        <div
          className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0"
          style={{ borderColor: "var(--dt-border)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <h2
              className="text-base font-semibold whitespace-nowrap"
              style={{ color: "var(--dt-text)" }}>
              Sổ quỹ
            </h2>
            <input
              type="text"
              placeholder="Tìm mã phiếu, người nộp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dt-input w-64"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="cash_flows" action="create">
              {/* Nút Phiếu thu */}
              <div ref={receiptDropdownRef} className="relative">
                <button
                  onClick={() => {
                    setShowReceiptDropdown((v) => !v);
                    setShowPaymentDropdown(false);
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-[4px] hover:bg-green-700 text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Phiếu thu
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showReceiptDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showReceiptDropdown && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-white border rounded-[8px] shadow-lg z-20 w-44 overflow-hidden"
                    style={{ borderColor: "var(--dt-border)" }}>
                    <div className="py-1">
                      <button
                        onClick={() => openCreateModal("cash", true)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm">
                        Thu tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", true)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm border-t"
                        style={{ borderColor: "var(--dt-border)" }}>
                        Thu chuyển khoản
                      </button>
                      {/* <button
                        onClick={() => openCreateModal("ewallet", true)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm border-t"
                        style={{ borderColor: "var(--dt-border)" }}>
                        Thu ví điện tử
                      </button> */}
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
                  className="px-3 py-1.5 bg-red-600 text-white rounded-[4px] hover:bg-red-700 text-sm font-medium flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Phiếu chi
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showPaymentDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showPaymentDropdown && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-white border rounded-[8px] shadow-lg z-20 w-44 overflow-hidden"
                    style={{ borderColor: "var(--dt-border)" }}>
                    <div className="py-1">
                      <button
                        onClick={() => openCreateModal("cash", false)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm">
                        Chi tiền mặt
                      </button>
                      <button
                        onClick={() => openCreateModal("bank", false)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm border-t"
                        style={{ borderColor: "var(--dt-border)" }}>
                        Chi chuyển khoản
                      </button>
                      {/* <button
                        onClick={() => openCreateModal("ewallet", false)}
                        className="dt-menu-item w-full text-left px-3 py-2 text-sm border-t"
                        style={{ borderColor: "var(--dt-border)" }}>
                        Chi ví điện tử
                      </button> */}
                    </div>
                  </div>
                )}
              </div>
            </PermissionGate>
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setShowExportDropdown((p) => !p)}
                disabled={isExportingOverview}
                className="px-3 py-1.5 border rounded-[4px] text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                style={{
                  borderColor: "var(--dt-border)",
                  color: "var(--dt-text-secondary)",
                }}>
                {isExportingOverview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Xuất file
              </button>
              {showExportDropdown && (
                <div
                  className="absolute right-0 top-full mt-1 bg-white border rounded-[8px] shadow-lg z-20 w-44 overflow-hidden"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <button
                    onClick={handleExportOverview}
                    className="dt-menu-item w-full text-left px-3 py-2 text-sm">
                    Tổng quan
                  </button>
                </div>
              )}
            </div>
            <ColumnToggle columns={columns} onToggle={toggleColumn} />
          </div>
        </div>

        {canViewBalance && (
          <div
            className="px-4 py-2 border-b flex items-center gap-6 text-sm shrink-0"
            style={{
              background: "var(--dt-cyan-bg)",
              borderColor: "var(--dt-border)",
            }}>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--dt-text-muted)" }}>Tồn đầu kỳ:</span>
              <span
                className="font-semibold dt-mono"
                style={{ color: "var(--dt-text)" }}>
                {formatCurrency(Number(openingBalance || 0))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--dt-text-muted)" }}>Tổng thu:</span>
              <span className="font-semibold dt-mono text-green-600">
                +{formatCurrency(totalReceipt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--dt-text-muted)" }}>Tổng chi:</span>
              <span className="font-semibold dt-mono text-red-600">
                -{formatCurrency(totalPayment)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--dt-text-muted)" }}>
                Tồn cuối kỳ:
              </span>
              <span
                className="font-semibold dt-mono"
                style={{ color: "var(--dt-primary)" }}>
                {formatCurrency(closingBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead
              className="sticky top-0 z-10"
              style={{ background: "var(--dt-bg-soft)" }}>
              <tr>
                <th
                  className="px-4 py-2.5 text-left w-10 sticky left-0"
                  style={{ background: "var(--dt-bg-soft)" }}>
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
                    className="px-4 py-2.5 text-left font-medium whitespace-nowrap text-xs uppercase tracking-wide"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      color: "var(--dt-text-muted)",
                    }}>
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
                    <div
                      className="flex flex-col items-center gap-2"
                      style={{ color: "var(--dt-text-muted)" }}>
                      <div
                        className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                        style={{
                          borderColor: "var(--dt-primary)",
                          borderTopColor: "transparent",
                        }}
                      />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : cashFlows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center"
                    style={{ color: "var(--dt-text-muted)" }}>
                    <div className="text-sm">Không có phiếu thu/chi nào</div>
                  </td>
                </tr>
              ) : (
                cashFlows.map((cf) => (
                  <Fragment key={cf.id}>
                    <tr
                      className="border-b cursor-pointer transition-colors dt-row"
                      data-expanded={expandedCashFlowId === cf.id}
                      style={{ borderColor: "var(--dt-border)" }}
                      onClick={() => toggleExpand(cf.id)}>
                      <td
                        className="px-4 py-2.5 sticky left-0 z-10 dt-row-sticky"
                        data-expanded={expandedCashFlowId === cf.id}
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
                          className={`w-4 h-4 transition-transform ${
                            expandedCashFlowId === cf.id ? "rotate-180" : ""
                          }`}
                          style={{ color: "var(--dt-text-muted)" }}
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
        <div
          className="border-t px-4 py-2 flex items-center justify-between text-sm shrink-0"
          style={{ borderColor: "var(--dt-border)" }}>
          <div
            className="flex items-center gap-2"
            style={{ color: "var(--dt-text-secondary)" }}>
            <span>Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="dt-select dt-select-sm">
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
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="dt-icon-btn p-1 rounded disabled:opacity-40">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="dt-icon-btn p-1 rounded disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="text-sm px-2 dt-mono"
              style={{ color: "var(--dt-text-secondary)" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="dt-icon-btn p-1 rounded disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="dt-icon-btn p-1 rounded disabled:opacity-40">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>

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
    </PermissionGate>
  );
}
