"use client";

import "@/app/dashboard.css";

import { useEffect, useState } from "react";
import {
  Receipt,
  CheckCircle2,
  Clock,
  Search,
  X,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useDeliveryOverview } from "@/lib/hooks/useInvoices";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";

// Bảng màu badge trạng thái hóa đơn (khớp INVOICE_STATUS backend)
const STATUS_BADGE: Record<number, { text: string; className: string }> = {
  3: { text: "Đang xử lý", className: "bg-amber-100 text-amber-700" },
  4: { text: "Không giao được", className: "bg-red-100 text-red-700" },
  5: { text: "Đóng hàng", className: "bg-blue-100 text-blue-700" },
  6: { text: "Loading", className: "bg-purple-100 text-purple-700" },
};

function StatusBadge({
  status,
  statusValue,
}: {
  status: number;
  statusValue?: string | null;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        badge?.className ?? "bg-gray-100 text-gray-600"
      }`}>
      {badge?.text ?? statusValue ?? "Chưa giao"}
    </span>
  );
}

const PAGE_SIZE_DESKTOP = 15;
const PAGE_SIZE_MOBILE = 3;

type DatePreset = "today" | "yesterday" | "7days" | "month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7days", label: "7 ngày" },
  { value: "month", label: "Tháng này" },
];

// Trả về { fromDate, toDate } dạng YYYY-MM-DD theo preset (giờ local trình duyệt)
function getDateRange(preset: DatePreset): {
  fromDate: string;
  toDate: string;
} {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { fromDate: fmt(y), toDate: fmt(y) };
    }
    case "7days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { fromDate: fmt(from), toDate: fmt(today) };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: fmt(from), toDate: fmt(today) };
    }
    case "today":
    default:
      return { fromDate: fmt(today), toDate: fmt(today) };
  }
}

export function DeliveryOverview() {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");

  const { fromDate, toDate } = getDateRange(datePreset);

  // Mobile (dưới sm = 640px) chỉ hiển thị 3 dòng, desktop 15 dòng
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DESKTOP);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const apply = () =>
      setPageSize(mql.matches ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset trang khi đổi search / chi nhánh / page size / khoảng ngày
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedBranch?.id, pageSize, datePreset]);

  const { data, isLoading } = useDeliveryOverview({
    branchId: selectedBranch?.id || undefined,
    fromDate,
    toDate,
    search: debouncedSearch || undefined,
    pageSize,
    currentItem: (page - 1) * pageSize,
  });

  const stats = data?.stats ?? { total: 0, delivered: 0, pending: 0 };
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Chọn hóa đơn để báo giao hàng ──
  type Row = (typeof rows)[number];
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Cache thông tin row đã chọn (để giữ branchId khi đổi trang/lọc)
  const [selectedCache, setSelectedCache] = useState<Record<number, Row>>({});
  const [showForm, setShowForm] = useState(false);
  const createPackingSlip = useCreatePackingSlip();

  // Bỏ chọn khi đổi chi nhánh (branchId khác nhau không gộp 1 phiếu được)
  useEffect(() => {
    setSelectedIds([]);
    setSelectedCache({});
  }, [selectedBranch?.id]);

  const toggleSelect = (row: Row) => {
    setSelectedIds((prev) => {
      if (prev.includes(row.id)) {
        return prev.filter((id) => id !== row.id);
      }
      // Chỉ cho chọn hóa đơn cùng chi nhánh
      const firstId = prev[0];
      if (firstId != null) {
        const firstBranch = selectedCache[firstId]?.branchId;
        if (firstBranch != null && firstBranch !== row.branchId) {
          toast.error("Chỉ chọn được hóa đơn cùng chi nhánh");
          return prev;
        }
      }
      setSelectedCache((c) => ({ ...c, [row.id]: row }));
      return [...prev, row.id];
    });
  };

  const selectedBranchId = (() => {
    const firstId = selectedIds[0];
    if (firstId == null) return null;
    return selectedCache[firstId]?.branchId ?? null;
  })();

  const handleProcess = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 hóa đơn");
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async (formData: any) => {
    try {
      await createPackingSlip.mutateAsync(formData);
      toast.success("Tạo giao hàng thành công");
      setShowForm(false);
      setSelectedIds([]);
      setSelectedCache({});
    } catch {
      toast.error("Tạo giao hàng thất bại");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Bộ lọc khoảng ngày ── */}
      <div
        className="flex gap-2 overflow-x-auto -mx-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {DATE_PRESETS.map((p) => {
          const active = datePreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── 3 ô thống kê ── */}
      {/* Mobile: 3 ô nhỏ nằm ngang, gọn */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center text-center">
          <Receipt className="w-4 h-4 mb-1" style={{ color: "#1A5F6A" }} />
          <span className="text-xl font-bold leading-none">{stats.total}</span>
          <span className="text-[11px] text-gray-500 mt-1 leading-tight">
            Tổng đơn
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center text-center">
          <CheckCircle2 className="w-4 h-4 mb-1" style={{ color: "#2E8B8F" }} />
          <span className="text-xl font-bold leading-none">
            {stats.delivered}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 leading-tight">
            Đã giao
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center text-center">
          <Clock className="w-4 h-4 mb-1" style={{ color: "#9A7A2A" }} />
          <span className="text-xl font-bold leading-none">
            {stats.pending}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 leading-tight">
            Chưa giao
          </span>
        </div>
      </div>

      {/* Desktop: KpiCard đầy đủ */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<Receipt className="w-[18px] h-[18px]" />}
          iconBg="rgba(26,95,106,.14)"
          iconColor="#1A5F6A"
          accent="#1A5F6A"
          name="Tổng đơn hôm nay"
          value={String(stats.total)}
        />
        <KpiCard
          icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
          iconBg="rgba(46,139,143,.14)"
          iconColor="#2E8B8F"
          accent="#2E8B8F"
          name="Đơn giao thành công"
          value={String(stats.delivered)}
        />
        <KpiCard
          icon={<Clock className="w-[18px] h-[18px]" />}
          iconBg="rgba(201,168,76,.16)"
          iconColor="#9A7A2A"
          accent="#C9A84C"
          name="Chưa giao"
          value={String(stats.pending)}
        />
      </div>

      {/* ── Bảng đơn chưa giao ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header + search */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Đơn chờ giao (lấy hàng){" "}
            <span className="text-gray-400 font-normal">({total})</span>
          </h3>
          <div className="relative w-44 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã HĐ, khách..."
              className="w-full pl-9 pr-8 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm text-gray-400">Đang tải...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-10 h-10 text-gray-300 mb-2" />
            <span className="text-gray-400 text-sm">Không có đơn chờ giao</span>
          </div>
        ) : (
          <>
            {/* Desktop: bảng */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2.5 font-medium w-10"></th>
                  <th className="px-4 py-2.5 font-medium">Hóa đơn</th>
                  <th className="px-4 py-2.5 font-medium">Tên khách hàng</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const checked = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => toggleSelect(row)}
                      className={`border-b border-gray-50 cursor-pointer ${
                        checked ? "bg-blue-50/70" : "hover:bg-gray-50/60"
                      }`}>
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(row)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-blue-600">
                          {row.code}
                        </span>
                        {/* <span className="ml-2 text-xs text-gray-400">
                          {formatCurrency(row.grandTotal)}đ
                        </span> */}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {row.customer?.name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusBadge
                          status={row.status}
                          statusValue={row.statusValue}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {rows.map((row) => {
                const checked = selectedIds.includes(row.id);
                return (
                  <div
                    key={row.id}
                    onClick={() => toggleSelect(row)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${
                      checked ? "bg-blue-50/70" : ""
                    }`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(row)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-blue-600 text-sm">
                          {row.code}
                        </span>
                        <StatusBadge
                          status={row.status}
                          statusValue={row.statusValue}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700 truncate">
                          {row.customer?.name || "—"}
                        </span>
                        {/* <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatCurrency(row.grandTotal)}đ
                        </span> */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 disabled:opacity-40 active:scale-95 transition-all">
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Thanh xử lý giao hàng (hiện khi đã chọn) ── */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-700">
            Đã chọn{" "}
            <span className="font-semibold text-blue-600">
              {selectedIds.length}
            </span>{" "}
            hóa đơn
          </span>
          <button
            onClick={handleProcess}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] text-sm font-semibold transition-all">
            <Truck className="w-4 h-4" />
            Xử lý giao hàng
          </button>
        </div>
      )}

      {/* ── Form giao hàng (fill sẵn hóa đơn đã chọn) ── */}
      {showForm && (
        <PackingSlipForm
          preselectedInvoiceIds={selectedIds}
          preselectedBranchId={selectedBranchId}
          preselectedInvoices={selectedIds
            .map((id) => selectedCache[id])
            .filter(Boolean)
            .map((r) => ({
              id: r.id,
              code: r.code,
              grandTotal: r.grandTotal,
              customer: r.customer ?? null,
            }))}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
