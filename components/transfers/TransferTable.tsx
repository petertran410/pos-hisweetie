"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import { useTransfers } from "@/lib/hooks/useTransfers";
import {
  Plus,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Transfer, TransferQueryParams } from "@/lib/api/transfers";
import { TransferForm } from "./TransferForm";
import { PermissionGate } from "../permissions/PermissionGate";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (t: Transfer) => React.ReactNode;
}

interface TransferTableProps {
  filters: TransferQueryParams;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "1", label: "Phiếu tạm" },
  { value: "2", label: "Đang chuyển" },
  { value: "3", label: "Đã nhận" },
  { value: "4", label: "Đã hủy" },
];

const STATUS_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Đang chuyển",
  3: "Đã nhận",
  4: "Đã hủy",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (amount: number) =>
  Number(amount).toLocaleString("vi-VN") + " đ";

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

// ─── Columns ──────────────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã chuyển hàng",
    visible: true,
    width: "160px",
    render: (t) => <span className="font-medium text-blue-600">{t.code}</span>,
  },
  {
    key: "transferDate",
    label: "Ngày chuyển",
    visible: true,
    width: "150px",
    render: (t) => formatDateTime(t.transferredDate),
  },
  {
    key: "receiveDate",
    label: "Ngày nhận",
    visible: true,
    width: "150px",
    render: (t) => formatDateTime(t.receivedDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: false,
    width: "150px",
    render: (t) => formatDateTime(t.createdAt),
  },
  {
    key: "fromBranch",
    label: "Từ chi nhánh",
    visible: true,
    width: "160px",
    render: (t) => t.fromBranchName,
  },
  {
    key: "toBranch",
    label: "Tới chi nhánh",
    visible: true,
    width: "160px",
    render: (t) => t.toBranchName,
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    width: "130px",
    render: (t) => t.createdByName,
  },
  {
    key: "totalSendQuantity",
    label: "Tổng SL chuyển",
    visible: false,
    width: "130px",
    render: (t) =>
      (
        t.details?.reduce((s, i) => s + Number(i.sendQuantity), 0) || 0
      ).toLocaleString(),
  },
  {
    key: "totalTransfer",
    label: "Giá trị chuyển",
    visible: true,
    width: "140px",
    render: (t) => formatMoney(t.totalTransfer),
  },
  {
    key: "totalReceiveValue",
    label: "Giá trị nhận",
    visible: false,
    width: "130px",
    render: (t) => formatMoney(t.totalReceive || 0),
  },
  {
    key: "totalGoods",
    label: "Tổng mặt hàng",
    visible: false,
    width: "120px",
    render: (t) => t.details?.length || 0,
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    width: "200px",
    render: (t) => t.noteBySource || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (t) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[t.status] || "bg-gray-100 text-gray-700"}`}>
        {STATUS_TEXT[t.status] || "-"}
      </span>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function TransferTable({ filters }: TransferTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page 1 khi filter/search/tab thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, activeStatusTab]);

  // Sync tab từ sidebar status filter
  useEffect(() => {
    if (filters.status && filters.status.length === 1) {
      setActiveStatusTab(String(filters.status[0]));
    } else if (!filters.status || filters.status.length === 0) {
      setActiveStatusTab("all");
    } else {
      setActiveStatusTab("all");
    }
  }, [filters.status]);

  // Tab override sidebar status
  const effectiveFilters = useMemo((): TransferQueryParams => {
    const f = { ...filters };
    if (activeStatusTab !== "all") f.status = [Number(activeStatusTab)];
    return f;
  }, [filters, activeStatusTab]);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transferTableColumns");
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

  const { data, isLoading } = useTransfers({
    ...effectiveFilters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transferTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const transfers = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  const toggleColumnVisibility = (key: string) =>
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === transfers.length ? [] : transfers.map((t) => t.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <PermissionGate resource="transfers" action="view">
      <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
        {/* ── Toolbar ── */}
        <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
              Chuyển hàng
            </h2>
            <input
              type="text"
              placeholder="Tìm mã phiếu chuyển..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PermissionGate resource="transfers" action="create">
              <button
                onClick={() => {
                  setSelectedTransfer(null);
                  setShowForm(true);
                }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Tạo phiếu
              </button>
            </PermissionGate>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 text-gray-600">
              <Settings className="w-4 h-4" />
              Cột
            </button>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex items-center gap-1 px-4 border-b overflow-x-auto shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatusTab(tab.value)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeStatusTab === tab.value
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                  <input
                    type="checkbox"
                    checked={
                      transfers.length > 0 &&
                      selectedIds.length === transfers.length
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
              ) : transfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="py-20 text-center text-gray-400 text-sm">
                    Không có phiếu chuyển hàng nào
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <Fragment key={transfer.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedId === transfer.id
                          ? "bg-blue-50"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        toggleExpand(transfer.id);
                        setSelectedTransfer(transfer);
                        setShowForm(true);
                      }}>
                      <td
                        className={`px-4 py-2.5 sticky left-0 z-10 ${
                          expandedId === transfer.id
                            ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                            : "bg-white"
                        }`}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(transfer.id)}
                          onChange={() => toggleSelect(transfer.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 ${
                            expandedId === transfer.id
                              ? "border-t-2 border-blue-500"
                              : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(transfer)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 ${
                          expandedId === transfer.id
                            ? "border-t-2 border-r-2 border-blue-500"
                            : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedId === transfer.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="border-t px-4 py-3 flex items-center justify-between shrink-0">
          <div className="text-sm text-gray-600">
            {total > 0
              ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} / ${total} phiếu`
              : "0 phiếu"}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded-lg px-2 py-1 text-sm">
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Column Modal ── */}
        {showColumnModal && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            onClick={() => setShowColumnModal(false)}>
            <div
              className="bg-white rounded-xl shadow-xl w-72 p-5"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Cột hiển thị
                </h3>
                <button onClick={() => setShowColumnModal(false)}>
                  <span className="text-gray-400 hover:text-gray-600 text-lg">
                    ✕
                  </span>
                </button>
              </div>
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TransferForm Modal ── */}
      {showForm && (
        <TransferForm
          transfer={selectedTransfer}
          onClose={() => {
            setShowForm(false);
            setSelectedTransfer(null);
            setExpandedId(null);
          }}
        />
      )}
    </PermissionGate>
  );
}
