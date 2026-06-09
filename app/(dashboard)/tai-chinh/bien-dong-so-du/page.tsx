"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSepayTransactions } from "@/lib/hooks/useSepay";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import {
  SepayStatusBadge,
  SepayCustomerCell,
  SepayMatchActions,
} from "@/components/sepay/SepayMatchControls";
import { CustomerLookup } from "@/components/sepay/CustomerLookup";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
const STORAGE_KEY = "sepay-bien-dong-filters";

const formatDateParts = (d?: string | null) => {
  if (!d) return { time: "-", date: "" };
  const dt = new Date(d);
  return {
    time: dt.toLocaleTimeString("vi-VN"),
    date: dt.toLocaleDateString("vi-VN"),
  };
};

// Các preset thời gian (giống trang Đơn hàng)
const DATE_PRESETS: { label: string; value: string }[] = [
  { label: "Toàn thời gian", value: "all_time" },
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tuần trước", value: "last_week" },
  { label: "7 ngày qua", value: "last_7_days" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "30 ngày qua", value: "last_30_days" },
  { label: "Quý này", value: "this_quarter" },
  { label: "Năm nay", value: "this_year" },
  { label: "Tùy chọn", value: "custom" },
];

// yyyy-mm-dd (local) — khớp định dạng MiniCalendar + backend parseFilterDate.
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Trả { dateFrom, dateTo } (yyyy-mm-dd) từ preset. all_time/custom → rỗng/giữ nguyên. */
const getPresetRange = (preset: string): { dateFrom: string; dateTo: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = 86400000;
  switch (preset) {
    case "today":
      return { dateFrom: toYmd(today), dateTo: toYmd(today) };
    case "yesterday": {
      const y = new Date(today.getTime() - day);
      return { dateFrom: toYmd(y), dateTo: toYmd(y) };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay());
      return { dateFrom: toYmd(s), dateTo: toYmd(today) };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { dateFrom: toYmd(s), dateTo: toYmd(e) };
    }
    case "last_7_days":
      return { dateFrom: toYmd(new Date(today.getTime() - 7 * day)), dateTo: toYmd(today) };
    case "this_month":
      return {
        dateFrom: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)),
        dateTo: toYmd(today),
      };
    case "last_month":
      return {
        dateFrom: toYmd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        dateTo: toYmd(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "last_30_days":
      return { dateFrom: toYmd(new Date(today.getTime() - 30 * day)), dateTo: toYmd(today) };
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        dateFrom: toYmd(new Date(now.getFullYear(), q * 3, 1)),
        dateTo: toYmd(today),
      };
    }
    case "this_year":
      return {
        dateFrom: toYmd(new Date(now.getFullYear(), 0, 1)),
        dateTo: toYmd(today),
      };
    default:
      return { dateFrom: "", dateTo: "" };
  }
};

interface Filters {
  search: string;
  accountNumber: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  status: "" | "processing" | "assigned" | "completed";
}

const EMPTY_FILTERS: Filters = {
  search: "",
  accountNumber: "",
  datePreset: "all_time",
  dateFrom: "",
  dateTo: "",
  status: "",
};

export default function BienDongSoDuPage() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  // Khởi tạo filter:
  //   1. Ưu tiên query param ?status= (vd điều hướng từ toast thông báo).
  //   2. Kế đến localStorage (filter người dùng đã lưu lần trước).
  //   3. Mặc định: trạng thái "Đang xử lý".
  const initialFilters: Filters = (() => {
    const defaults: Filters = { ...EMPTY_FILTERS, status: "processing" };
    if (typeof window === "undefined") return defaults;

    const params = new URLSearchParams(window.location.search);

    // Deep-link từ thông báo: ?search=<mã tham chiếu / nội dung CK> → tìm đúng
    // giao dịch, bỏ filter status để không che mất giao dịch đã xử lý.
    const search = params.get("search");
    if (search) {
      return { ...EMPTY_FILTERS, search };
    }

    const st = params.get("status");
    if (st === "processing" || st === "assigned" || st === "completed") {
      return { ...EMPTY_FILTERS, status: st };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...EMPTY_FILTERS, ...saved };
      }
    } catch {
      // ignore
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

  // Lưu filter đã áp dụng vào localStorage để lần sau khôi phục.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applied));
    } catch {
      // ignore
    }
  }, [applied]);

  // Deep-link reactive: khi đang ở sẵn trang này và bấm 1 thông báo khác,
  // URL ?search= đổi → cập nhật filter để nhảy tới đúng giao dịch.
  // Dùng pattern "điều chỉnh state khi giá trị ngoài đổi" của React (so sánh
  // với giá trị trước, set ngay trong render) thay vì useEffect.
  const searchParam = searchParams.get("search");
  const [prevSearchParam, setPrevSearchParam] = useState<string | null>(null);
  if (searchParam && searchParam !== prevSearchParam) {
    setPrevSearchParam(searchParam);
    const next: Filters = { ...EMPTY_FILTERS, search: searchParam };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

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

  // Chọn preset thời gian → cập nhật dateFrom/dateTo tương ứng.
  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      setDraft((p) => ({ ...p, datePreset: "custom" }));
      return;
    }
    const range = getPresetRange(preset);
    setDraft((p) => ({ ...p, datePreset: preset, ...range }));
  };

  const hasFilters =
    applied.search ||
    applied.accountNumber ||
    applied.dateFrom ||
    applied.dateTo ||
    applied.status ||
    (applied.datePreset && applied.datePreset !== "all_time");

  return (
    <PagePermissionGuard resource="sepay" action="view">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b bg-white flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Biến động số dư</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Lịch sử giao dịch ngân hàng đồng bộ từ Sepay
            </p>
          </div>
          <CustomerLookup />
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
                className="dt-input dt-input-sm !rounded-lg pl-8 w-60"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Tài khoản ngân hàng</label>
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
            <label className="text-xs text-gray-500 mb-1">Trạng thái</label>
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

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Khoảng thời gian</label>
            <select
              value={draft.datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="dt-select dt-select-sm !rounded-lg w-40">
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {draft.datePreset === "custom" && (
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
                        ? "border-brand bg-brand-soft text-[var(--dt-text)]"
                        : "border-gray-300 text-gray-400"
                    } ${openCal === "from" ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-400"}`}>
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
                        ? "border-brand bg-brand-soft text-[var(--dt-text)]"
                        : "border-gray-300 text-gray-400"
                    } ${openCal === "to" ? "ring-2 ring-brand-soft border-brand" : "hover:border-gray-400"}`}>
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
          )}

          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
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
            <thead className="sticky top-0 border-b z-10 bg-[var(--dt-bg-soft)]">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Thời gian
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Ngân hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Số tài khoản
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Số tiền
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)]">
                  Nội dung
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Mã tham chiếu
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Khách hàng
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--dt-text-muted)] whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Đang tải...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const amountIn = Number(tx.amountIn);
                  return (
                    <tr
                      key={tx.id}
                      className="border-b dt-row transition-colors">
                      <td className="px-4 py-2.5 leading-tight">
                        <div>{formatDateParts(tx.transactionDate).time}</div>
                        <div className="text-xs text-gray-500">
                          {formatDateParts(tx.transactionDate).date}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{tx.bankBrandName || "-"}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap dt-mono">{tx.accountNumber || "-"}</td>
                      <td className="px-4 py-2.5 text-left font-medium text-green-600 whitespace-nowrap dt-mono">
                        +{formatCurrency(amountIn)}
                      </td>
                      <td className="px-4 py-2.5 w-[220px] max-w-[220px] break-words whitespace-normal align-top">
                        {tx.transactionContent || "-"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{tx.referenceNumber || "-"}</td>
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
        <div className="p-3 border-t bg-white flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {isFetching && (
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            )}
            Tổng {total.toLocaleString("vi-VN")} giao dịch
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="dt-icon-btn p-1.5 border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PagePermissionGuard>
  );
}
