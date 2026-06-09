"use client";

import { useState, useRef, useEffect } from "react";
import { useSepayTransactions } from "@/lib/hooks/useSepay";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
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

const formatDateLabel = (d: string) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "dd/mm/yyyy";

const PAGE_SIZE = 20;

const formatDateParts = (d?: string | null) => {
  if (!d) return { time: "-", date: "" };
  const dt = new Date(d);
  return {
    time: dt.toLocaleTimeString("vi-VN"),
    date: dt.toLocaleDateString("vi-VN"),
  };
};

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
  // Mặc định khi vào trang: lọc "Đang xử lý" (processing).
  // Vẫn ưu tiên query param ?status= nếu có (vd điều hướng từ toast thông báo).
  const initialFilters: Filters = (() => {
    const defaults: Filters = { ...EMPTY_FILTERS, status: "processing" };
    if (typeof window === "undefined") return defaults;
    const st = new URLSearchParams(window.location.search).get("status");
    if (st === "processing" || st === "assigned" || st === "completed") {
      return { ...EMPTY_FILTERS, status: st };
    }
    return defaults;
  })();
  // Filter đang nhập trên form
  const [draft, setDraft] = useState<Filters>(initialFilters);
  // Filter đã áp dụng (gửi lên API)
  const [applied, setApplied] = useState<Filters>(initialFilters);
  // Lịch đang mở: "from" | "to" | null
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const dateBoxRef = useRef<HTMLDivElement>(null);

  // Danh sách tài khoản ngân hàng cho dropdown filter
  const { data: bankAccountsData } = useBankAccountsForPayment();
  const bankAccounts: Array<{
    id: number;
    accountNumber: string;
    bankCode?: string;
    bankName?: string;
  }> = Array.isArray(bankAccountsData) ? bankAccountsData : [];

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
        <div
          className="p-4 border-b bg-white"
          style={{ borderColor: "var(--dt-border)" }}>
          <h1 className="text-xl font-bold">Biến động số dư</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--dt-text-muted)" }}>
            Lịch sử giao dịch ngân hàng đồng bộ từ Sepay
          </p>
        </div>

        {/* Filter bar */}
        <div
          className="p-4 bg-white border-b flex flex-wrap items-end gap-3"
          style={{ borderColor: "var(--dt-border)" }}>
          <div className="flex flex-col">
            <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={draft.search}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, search: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Nội dung / mã tham chiếu"
                className="dt-input dt-input-sm !rounded-lg pl-8 w-60"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
              Tài khoản ngân hàng
            </label>
            <select
              value={draft.accountNumber}
              onChange={(e) =>
                setDraft((p) => ({ ...p, accountNumber: e.target.value }))
              }
              className="dt-select dt-select-sm !rounded-lg w-52">
              <option value="">Tất cả</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.accountNumber}>
                  {(b.bankCode || b.bankName || "TK") + " - " + b.accountNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
              Loại
            </label>
            <select
              value={draft.transferType}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  transferType: e.target.value as Filters["transferType"],
                }))
              }
              className="dt-select dt-select-sm !rounded-lg w-32">
              <option value="">Tất cả</option>
              <option value="in">Tiền vào</option>
              <option value="out">Tiền ra</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
              Trạng thái
            </label>
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  status: e.target.value as Filters["status"],
                }))
              }
              className="dt-select dt-select-sm !rounded-lg w-40">
              <option value="">Tất cả</option>
              <option value="processing">Đang xử lý</option>
              <option value="assigned">Đã xác nhận KH</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>

          <div ref={dateBoxRef} className="flex items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
                Từ ngày
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCal((c) => (c === "from" ? null : "from"))
                  }
                  className="dt-input dt-input-sm !rounded-lg w-40 flex items-center justify-between"
                  style={
                    draft.dateFrom
                      ? { color: "var(--dt-text)" }
                      : { color: "var(--dt-text-muted)" }
                  }>
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
              <label className="text-xs mb-1" style={{ color: "var(--dt-text-muted)" }}>
                Đến ngày
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenCal((c) => (c === "to" ? null : "to"))}
                  className="dt-input dt-input-sm !rounded-lg w-40 flex items-center justify-between"
                  style={
                    draft.dateTo
                      ? { color: "var(--dt-text)" }
                      : { color: "var(--dt-text-muted)" }
                  }>
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
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
            Lọc
          </button>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="dt-btn-ghost inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors">
              <X className="w-4 h-4" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead
              className="sticky top-0 border-b z-10"
              style={{ background: "var(--dt-bg-soft)" }}>
              <tr>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Thời gian
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Ngân hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Số tài khoản
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Tiền vào
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Tiền ra
                </th>
                <th className="px-4 py-2.5 text-left font-medium" style={{ color: "var(--dt-text-muted)" }}>
                  Nội dung
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Mã tham chiếu
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Khách hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Trạng thái
                </th>
                <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap" style={{ color: "var(--dt-text-muted)" }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center" style={{ color: "var(--dt-text-muted)" }}>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Đang tải...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center" style={{ color: "var(--dt-text-muted)" }}>
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
                      className="border-b dt-row transition-colors"
                      style={{ borderColor: "var(--dt-border)" }}>
                      <td className="px-4 py-2.5 leading-tight">
                        <div>{formatDateParts(tx.transactionDate).time}</div>
                        <div className="text-xs" style={{ color: "var(--dt-text-muted)" }}>
                          {formatDateParts(tx.transactionDate).date}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{tx.bankBrandName || "-"}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap dt-mono">{tx.accountNumber || "-"}</td>
                      <td className="px-4 py-2.5 text-left font-medium text-green-600 whitespace-nowrap dt-mono">
                        {amountIn > 0 ? `+${formatCurrency(amountIn)}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-left font-medium text-red-600 whitespace-nowrap dt-mono">
                        {amountOut > 0 ? `-${formatCurrency(amountOut)}` : "-"}
                      </td>
                      <td className="px-4 py-2.5 w-[220px] max-w-[220px] break-words whitespace-normal align-top">
                        {tx.transactionContent || "-"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap dt-mono">{tx.referenceNumber || "-"}</td>
                      <td className="px-4 py-2.5 w-[150px] max-w-[150px] break-words whitespace-normal align-top">
                        <SepayCustomerCell tx={tx} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <SepayStatusBadge status={tx.match?.status} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
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
        <div
          className="p-3 border-t bg-white flex items-center justify-between"
          style={{ borderColor: "var(--dt-border)" }}>
          <div className="text-sm" style={{ color: "var(--dt-text-muted)" }}>
            {isFetching && (
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            )}
            Tổng {total.toLocaleString("vi-VN")} giao dịch
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--dt-border)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm dt-mono" style={{ color: "var(--dt-text-secondary)" }}>
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--dt-border)" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PagePermissionGuard>
  );
}
