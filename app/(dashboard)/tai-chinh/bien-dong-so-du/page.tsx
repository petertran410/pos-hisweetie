"use client";

import { useState, useRef, useEffect } from "react";
import { useSepayTransactions } from "@/lib/hooks/useSepay";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import {
  SepayStatusBadge,
  SepayCustomerCell,
  SepayMatchActions,
} from "@/components/sepay/SepayMatchControls";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  X,
  Calendar,
} from "lucide-react";
import "@/app/dashboard.css";

const formatDateLabel = (d: string) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "dd/mm/yyyy";

const PAGE_SIZE = 20;

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

interface Filters {
  search: string;
  accountNumber: string;
  transferType: "" | "in" | "out";
  dateFrom: string;
  dateTo: string;
  status: "" | "processing" | "assigned" | "completed";
}

const EMPTY_FILTERS: Filters = {
  search: "",
  accountNumber: "",
  transferType: "",
  dateFrom: "",
  dateTo: "",
  status: "",
};

export default function BienDongSoDuPage() {
  const [page, setPage] = useState(1);
  // Filter đang nhập trên form
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  // Filter đã áp dụng (gửi lên API)
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  // Lịch đang mở: "from" | "to" | null
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const dateBoxRef = useRef<HTMLDivElement>(null);

  // Đóng lịch khi click ra ngoài
  useEffect(() => {
    if (!openCal) return;
    const handler = (e: MouseEvent) => {
      if (dateBoxRef.current && !dateBoxRef.current.contains(e.target as Node)) {
        setOpenCal(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openCal]);

  const { data, isLoading, isFetching } = useSepayTransactions({
    page,
    limit: PAGE_SIZE,
    search: applied.search || undefined,
    accountNumber: applied.accountNumber || undefined,
    transferType: applied.transferType || undefined,
    dateFrom: applied.dateFrom || undefined,
    dateTo: applied.dateTo || undefined,
    status: applied.status || undefined,
  });

  const transactions = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const hasFilters =
    applied.search ||
    applied.accountNumber ||
    applied.transferType ||
    applied.dateFrom ||
    applied.dateTo ||
    applied.status;

  return (
    <PagePermissionGuard resource="sepay" action="view">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b bg-white">
          <h1 className="text-xl font-bold">Biến động số dư</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lịch sử giao dịch ngân hàng đồng bộ từ Sepay
          </p>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-white border-b flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={draft.search}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, search: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Nội dung / mã tham chiếu"
                className="pl-8 pr-3 py-2 border rounded-lg text-sm w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Số tài khoản</label>
            <input
              value={draft.accountNumber}
              onChange={(e) =>
                setDraft((p) => ({ ...p, accountNumber: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Số TK ngân hàng"
              className="px-3 py-2 border rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Loại</label>
            <select
              value={draft.transferType}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  transferType: e.target.value as Filters["transferType"],
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Tất cả</option>
              <option value="in">Tiền vào</option>
              <option value="out">Tiền ra</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Trạng thái</label>
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  status: e.target.value as Filters["status"],
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Tất cả</option>
              <option value="processing">Đang xử lý</option>
              <option value="assigned">Đã xác nhận KH</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>

          <div ref={dateBoxRef} className="flex items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Từ ngày</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCal((c) => (c === "from" ? null : "from"))
                  }
                  className={`w-40 flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                    draft.dateFrom
                      ? "border-emerald-300 bg-emerald-50 text-gray-800"
                      : "border-gray-300 text-gray-400"
                  } ${openCal === "from" ? "ring-2 ring-emerald-100 border-emerald-400" : "hover:border-gray-400"}`}>
                  <span>{formatDateLabel(draft.dateFrom)}</span>
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {openCal === "from" && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-72">
                    <MiniCalendar
                      value={draft.dateFrom}
                      onChange={(d) =>
                        setDraft((p) => ({ ...p, dateFrom: d }))
                      }
                      onClose={() => setOpenCal(null)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">Đến ngày</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenCal((c) => (c === "to" ? null : "to"))}
                  className={`w-40 flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all ${
                    draft.dateTo
                      ? "border-emerald-300 bg-emerald-50 text-gray-800"
                      : "border-gray-300 text-gray-400"
                  } ${openCal === "to" ? "ring-2 ring-emerald-100 border-emerald-400" : "hover:border-gray-400"}`}>
                  <span>{formatDateLabel(draft.dateTo)}</span>
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                {openCal === "to" && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-72">
                    <MiniCalendar
                      value={draft.dateTo}
                      onChange={(d) => setDraft((p) => ({ ...p, dateTo: d }))}
                      onClose={() => setOpenCal(null)}
                      minDate={draft.dateFrom || undefined}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            Lọc
          </button>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <X className="w-4 h-4" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Thời gian
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Ngân hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Số tài khoản
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  Tiền vào
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  Tiền ra
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Nội dung
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Mã tham chiếu
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  Số dư lũy kế
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Khách hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  Trạng thái
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Đang tải...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const amountIn = Number(tx.amountIn);
                  const amountOut = Number(tx.amountOut);
                  return (
                    <tr
                      key={tx.id}
                      className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {formatDateTime(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-2.5">{tx.bankBrandName || "-"}</td>
                      <td className="px-4 py-2.5">{tx.accountNumber || "-"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {amountIn > 0 ? `+${formatCurrency(amountIn)}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">
                        {amountOut > 0 ? `-${formatCurrency(amountOut)}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 max-w-[280px] truncate" title={tx.transactionContent || ""}>
                        {tx.transactionContent || "-"}
                      </td>
                      <td className="px-4 py-2.5">{tx.referenceNumber || "-"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {tx.accumulated ? formatCurrency(Number(tx.accumulated)) : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        <SepayCustomerCell tx={tx} />
                      </td>
                      <td className="px-4 py-2.5">
                        <SepayStatusBadge status={tx.match?.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <SepayMatchActions tx={tx} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {isFetching && (
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            )}
            Tổng {total.toLocaleString("vi-VN")} giao dịch
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PagePermissionGuard>
  );
}
