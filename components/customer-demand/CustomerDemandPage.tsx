"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, FileText, Loader2, Plus, Search, SquareX, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useCan } from "@/lib/hooks/useCan";
import {
  useApproveCustomerDemandMonth,
  useCancelCustomerDemandMonth,
  useCustomerDemand,
  useCustomerDemandCustomers,
  useCustomerDemands,
} from "@/lib/hooks/useCustomerDemand";
import { CustomerDemandFormModal } from "./CustomerDemandFormModal";
import { CustomerDemandImportModal } from "./CustomerDemandImportModal";
import type {
  CustomerDemand,
  CustomerDemandStatus,
} from "@/lib/types/customer-demand";
import { CUSTOMER_DEMAND_STATUS_LABEL } from "@/lib/types/customer-demand";

const STATUS_TABS: Array<{ value: CustomerDemandStatus | ""; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "DRAFT", label: "Chờ duyệt" },
  { value: "CONFIRMED", label: "Đã duyệt" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusClass: Record<CustomerDemandStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const formatQty = (value: number) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function formatMonthLabel(value: string) {
  const [year, month] = (value || "").split("-");
  if (!year || !month) return value || "—";
  return `${month}/${year}`;
}

export function CustomerDemandPage() {
  const canCreate = useCan("customer_demand", "create");
  const canUpdate = useCan("customer_demand", "update");
  const canApprove = useCan("customer_demand", "approve");
  const canCancel = useCan("customer_demand", "cancel");
  const [filters, setFilters] = useState<{
    customerId?: number;
    month?: string;
    status?: CustomerDemandStatus;
    page: number;
    limit: number;
  }>({ page: 1, limit: 20 });
  const [customerFilterQuery, setCustomerFilterQuery] = useState("");
  const [customerFilterDebounced, setCustomerFilterDebounced] = useState("");
  const [customerFilterLabel, setCustomerFilterLabel] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setCustomerFilterDebounced(customerFilterQuery.trim()),
      300
    );
    return () => clearTimeout(timer);
  }, [customerFilterQuery]);

  const { data, isLoading, isError } = useCustomerDemands(filters);
  const { data: detail, isLoading: detailLoading } =
    useCustomerDemand(selectedId);
  const { data: customerSearch } = useCustomerDemandCustomers(
    customerFilterDebounced || undefined
  );
  const approve = useApproveCustomerDemandMonth();
  const cancel = useCancelCustomerDemandMonth();

  const rows = data?.data ?? [];
  const customerResults = customerSearch ?? [];
  const totalPages = data?.totalPages ?? 1;
  const editDemand = formOpen && selectedId !== null ? detail : null;

  const selectFilterCustomer = (customer: {
    id: number;
    code?: string | null;
    name: string;
  }) => {
    setFilters((prev) => ({ ...prev, customerId: customer.id, page: 1 }));
    setCustomerFilterLabel(
      `${customer.code ? `${customer.code} · ` : ""}${customer.name}`
    );
    setCustomerFilterQuery("");
  };

  const clearCustomerFilter = () => {
    setFilters((prev) => ({ ...prev, customerId: undefined, page: 1 }));
    setCustomerFilterLabel("");
    setCustomerFilterQuery("");
  };

  const handleApprove = async (monthId: number) => {
    try {
      await approve.mutateAsync(monthId);
      toast.success("Đã xác nhận tháng Demand");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xác nhận Demand"
      );
    }
  };

  const handleCancel = async (monthId: number) => {
    if (
      !window.confirm(
        "Hủy tháng Demand này? Tháng đã hủy sẽ không được cộng vào dự kiến đặt hàng."
      )
    ) {
      return;
    }
    try {
      await cancel.mutateAsync({ id: monthId });
      toast.success("Đã hủy tháng Demand");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể hủy Demand"
      );
    }
  };

  return (
    <PagePermissionGuard resource="customer_demand" action="view">
      <div
        className="flex h-full min-h-0 flex-col border-t bg-gray-50"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Demand khách hàng (OEM/đặt hộ)
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Quản lý nhu cầu theo khách hàng, sản phẩm và tháng cần hàng. Không
              tạo Order, hóa đơn, công nợ hoặc giữ tồn.
            </p>
          </div>
          {canCreate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setFormOpen(true);
                }}
                className="bg-brand hover:bg-brand-dark flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" />
                Tạo Demand
              </button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick status tabs */}
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
              {STATUS_TABS.map((tab) => {
                const active = (filters.status ?? "") === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        status: tab.value || undefined,
                        page: 1,
                      }))
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Filter by customer */}
            <div className="relative w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={customerFilterLabel || customerFilterQuery}
                onChange={(event) => {
                  setCustomerFilterLabel("");
                  setFilters((prev) => ({
                    ...prev,
                    customerId: undefined,
                    page: 1,
                  }));
                  setCustomerFilterQuery(event.target.value);
                }}
                placeholder="Tìm khách hàng..."
                className="w-full rounded-lg border py-1.5 pr-8 pl-8 text-xs"
              />
              {!customerFilterLabel &&
                customerFilterDebounced.length >= 2 &&
                customerResults.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded border bg-white shadow-lg">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectFilterCustomer(customer)}
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-50">
                        {customer.code ? `${customer.code} · ` : ""}
                        {customer.name}
                      </button>
                    ))}
                  </div>
                )}
              {customerFilterLabel && (
                <button
                  type="button"
                  onClick={clearCustomerFilter}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter by month */}
            <div className="relative flex items-center">
              <input
                type="month"
                value={filters.month ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    month: event.target.value || undefined,
                    page: 1,
                  }))
                }
                title="Lọc theo tháng cần hàng"
                className="rounded-lg border px-2.5 py-1.5 text-xs"
              />
              {filters.month && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, month: undefined, page: 1 }))
                  }
                  title="Bỏ lọc tháng"
                  className="ml-1 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {data ? (
              <span>
                Tổng: <strong className="font-semibold text-gray-900">{data.total.toLocaleString("vi-VN")}</strong> phiếu
              </span>
            ) : (
              "Đang tải..."
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-4 p-4">
          <div
            className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white"
            style={{ borderColor: "var(--dt-border)" }}>
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải Demand...
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-sm text-red-600">
                Không tải được danh sách Demand.
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Chưa có phiếu Demand phù hợp.
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs font-semibold text-gray-600">
                    <tr>
                      <th className="border-b border-gray-200 px-3.5 py-2.5">Phiếu & Khách hàng</th>
                      <th className="border-b border-gray-200 px-3.5 py-2.5">Tháng & Trạng thái</th>
                      <th className="border-b border-gray-200 px-3.5 py-2.5 text-right">Sản phẩm</th>
                      <th className="border-b border-gray-200 px-3.5 py-2.5 text-right">Tổng số lượng</th>
                      <th className="border-b border-gray-200 px-3.5 py-2.5">Cập nhật</th>
                      <th className="border-b border-gray-200 px-3.5 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <DemandListRow
                        key={row.id}
                        row={row}
                        selected={selectedId === row.id}
                        onView={() => setSelectedId(selectedId === row.id ? null : row.id)}
                        onEdit={
                          canUpdate &&
                          row.months.some((month) => month.status !== "CANCELLED")
                            ? () => {
                                setSelectedId(row.id);
                                setFormOpen(true);
                              }
                            : undefined
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs text-gray-600 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      limit: Number(e.target.value),
                      page: 1,
                    }))
                  }
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>dòng/trang</span>
                {data && (
                  <span className="text-gray-400">
                    · (Hiển thị {Math.min((filters.page - 1) * filters.limit + 1, data.total)} - {Math.min(filters.page * filters.limit, data.total)} / {data.total})
                  </span>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Trước
                  </button>
                  <span className="px-2 font-medium">
                    {filters.page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={filters.page >= totalPages}
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                    Sau
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {selectedId !== null && (
            <aside
              className="flex w-[560px] min-w-[420px] shrink-0 flex-col overflow-hidden rounded-xl border bg-white"
              style={{ borderColor: "var(--dt-border)" }}>
              <div className="flex items-start justify-between border-b px-4 py-3">
                <div>
                  <h2 className="font-semibold">Chi tiết Demand</h2>
                  <p className="text-xs text-gray-500">
                    {detail?.customer.name ?? "..."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {detailLoading || !detail ? (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải...
                </div>
              ) : (
                <DemandDetailMatrix
                  demand={detail}
                  canApprove={canApprove}
                  canCancel={canCancel}
                  approving={approve.isPending}
                  cancelling={cancel.isPending}
                  onApprove={handleApprove}
                  onCancel={handleCancel}
                />
              )}
            </aside>
          )}
        </div>
      </div>
      <CustomerDemandFormModal
        open={formOpen && (selectedId === null || !!editDemand)}
        demand={editDemand}
        onClose={() => setFormOpen(false)}
      />
      {importOpen && (
        <CustomerDemandImportModal onClose={() => setImportOpen(false)} />
      )}
    </PagePermissionGuard>
  );
}

function DemandListRow({
  row,
  selected,
  onView,
  onEdit,
}: {
  row: CustomerDemand;
  selected: boolean;
  onView: () => void;
  onEdit?: () => void;
}) {
  const months = row.months ?? [];
  const draftCount = months.filter((m) => m.status === "DRAFT").length;
  const confirmedCount = months.filter((m) => m.status === "CONFIRMED").length;
  const cancelledCount = months.filter((m) => m.status === "CANCELLED").length;

  return (
    <tr
      onClick={onView}
      className={`group border-b cursor-pointer transition-colors ${
        selected
          ? "bg-brand-soft/70 border-l-4 border-l-brand"
          : "hover:bg-gray-50/80 border-l-4 border-l-transparent"
      }`}
      style={{ borderColor: "var(--dt-border)" }}>
      {/* 1. Mã phiếu & Khách hàng */}
      <td className="px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
            #{row.id}
          </span>
          <span className="font-medium text-gray-900 group-hover:text-brand transition-colors">
            {row.customer.name}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {row.customer.code ? `Mã KH: ${row.customer.code}` : `ID KH: ${row.customer.id}`}
        </div>
        {row.note && (
          <div
            className="mt-1 flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50/80 rounded px-1.5 py-0.5 max-w-xs truncate"
            title={row.note}>
            <FileText className="h-3 w-3 shrink-0 text-amber-600" />
            <span className="truncate">{row.note}</span>
          </div>
        )}
      </td>

      {/* 2. Tháng & Trạng thái */}
      <td className="px-3.5 py-3">
        <div className="mb-1.5">
          {draftCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Chờ duyệt ({draftCount}/{months.length} tháng)
            </span>
          ) : confirmedCount === months.length && months.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 border border-green-200">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Đã duyệt ({confirmedCount} tháng)
            </span>
          ) : cancelledCount === months.length ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              Đã hủy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {confirmedCount} đã duyệt · {cancelledCount} hủy
            </span>
          )}
        </div>
        <div className="flex max-w-80 flex-wrap gap-1">
          {months.map((month) => (
            <span
              key={month.id}
              title={`${month.month} · ${CUSTOMER_DEMAND_STATUS_LABEL[month.status]}`}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass[month.status]}`}>
              {formatMonthLabel(month.month)}
            </span>
          ))}
        </div>
      </td>

      {/* 3. Sản phẩm */}
      <td className="px-3.5 py-3 text-right whitespace-nowrap">
        <div className="font-semibold text-gray-900">{row.totalProducts}</div>
        <div className="text-[11px] text-gray-500">mặt hàng</div>
      </td>

      {/* 4. Tổng số lượng */}
      <td className="px-3.5 py-3 text-right whitespace-nowrap">
        <div className="font-semibold text-gray-900">{formatQty(row.totalQuantityBase)}</div>
        <div className="text-[11px] text-gray-500">đv cơ bản</div>
      </td>

      {/* 5. Cập nhật */}
      <td className="px-3.5 py-3 text-xs text-gray-500 whitespace-nowrap">
        <div>{new Date(row.updatedAt).toLocaleDateString("vi-VN")}</div>
        <div className="text-[11px] text-gray-400">
          {new Date(row.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </td>

      {/* 6. Thao tác */}
      <td className="px-3.5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={onView}
            title={selected ? "Đóng chi tiết" : "Xem chi tiết"}
            className={`rounded p-1.5 transition-colors ${
              selected
                ? "bg-brand text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}>
            <Eye className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Chỉnh sửa phiếu"
              className="rounded px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-200">
              Sửa
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DemandDetailMatrix({
  demand,
  canApprove,
  canCancel,
  approving,
  cancelling,
  onApprove,
  onCancel,
}: {
  demand: CustomerDemand;
  canApprove: boolean;
  canCancel: boolean;
  approving: boolean;
  cancelling: boolean;
  onApprove: (monthId: number) => void;
  onCancel: (monthId: number) => void;
}) {
  const months = demand.months ?? [];
  const products = useMemo(() => {
    const map = new Map<
      number,
      { id: number; code: string; name: string; unit?: string | null }
    >();
    for (const month of months) {
      for (const line of month.lines ?? []) {
        if (!map.has(line.productId)) {
          map.set(line.productId, {
            id: line.productId,
            code: line.product.code,
            name: line.product.name,
            unit: line.product.unit,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [months]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b bg-gray-50 px-4 py-2 text-xs text-gray-600">
        {demand.note || "Không có ghi chú chung"} · {demand.totalProducts} sản
        phẩm · {formatQty(demand.totalQuantityBase)} đơn vị cơ bản
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 min-w-40 border-b border-r bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600">
                Sản phẩm
              </th>
              {months.map((month) => (
                <th
                  key={month.id}
                  className="sticky top-0 z-10 min-w-28 border-b bg-gray-50 px-2 py-2 text-left align-top">
                  <div className="font-semibold text-gray-900">
                    {formatMonthLabel(month.month)}
                  </div>
                  <span
                    className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusClass[month.status]}`}>
                    {CUSTOMER_DEMAND_STATUS_LABEL[month.status]}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {month.status === "DRAFT" && canApprove && (
                      <button
                        type="button"
                        onClick={() => onApprove(month.id)}
                        disabled={approving}
                        className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white disabled:opacity-60">
                        <Check className="h-3 w-3" />
                        Duyệt
                      </button>
                    )}
                    {month.status !== "CANCELLED" && canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(month.id)}
                        disabled={cancelling}
                        className="inline-flex items-center gap-0.5 rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                        <SquareX className="h-3 w-3" />
                        Hủy
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={months.length + 1}
                  className="px-3 py-8 text-center text-gray-400">
                  Phiếu chưa có sản phẩm.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2">
                    <div className="font-medium text-gray-900">
                      {product.code}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">
                      {product.name}
                    </div>
                  </td>
                  {months.map((month) => {
                    const line = (month.lines ?? []).find(
                      (item) => item.productId === product.id
                    );
                    return (
                      <td
                        key={`${product.id}-${month.id}`}
                        className="border-b px-2 py-2 text-right">
                        {line ? (
                          <div>
                            <div className="font-medium">
                              {formatQty(line.inputQuantity)}{" "}
                              {line.inputUnit === "CARTON"
                                ? "thùng"
                                : (line.product.unit ?? "đv")}
                            </div>
                            {line.inputUnit === "CARTON" && (
                              <div className="text-[10px] text-gray-400">
                                {formatQty(line.quantityBase)}{" "}
                                {product.unit ?? "đv"}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {months.some((month) => (month.changeLogs ?? []).length > 0) && (
        <div className="max-h-28 shrink-0 overflow-y-auto border-t px-4 py-2 text-[11px] text-gray-500">
          <div className="mb-1 font-medium text-gray-600">Lịch sử</div>
          {months.flatMap((month) =>
            (month.changeLogs ?? []).slice(0, 3).map((log) => (
              <div key={log.id}>
                {formatMonthLabel(month.month)} ·{" "}
                {new Date(log.createdAt).toLocaleString("vi-VN")} · {log.reason}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
