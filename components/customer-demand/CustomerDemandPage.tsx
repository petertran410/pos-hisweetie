"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileText,
  Inbox,
  Plus,
  Search,
  SquareX,
  Upload,
  X,
} from "lucide-react";
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
import {
  DemandButton,
  DemandEmptyState,
  DemandMonthChip,
  DemandStatusChip,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";
import type {
  CustomerDemand,
  CustomerDemandStatus,
} from "@/lib/types/customer-demand";

const STATUS_TABS: Array<{ value: CustomerDemandStatus | ""; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "DRAFT", label: "Chờ duyệt" },
  { value: "CONFIRMED", label: "Đã duyệt" },
  { value: "CANCELLED", label: "Đã hủy" },
];

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

  useEffect(() => {
    if (formOpen || importOpen || selectedId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, importOpen, selectedId]);

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
  const hasActiveFilters = Boolean(
    filters.customerId || filters.month || filters.status
  );
  const canEditSelected =
    canUpdate &&
    !!detail &&
    detail.months.some((month) => month.status !== "CANCELLED");

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

  const openCreate = () => {
    setSelectedId(null);
    setFormOpen(true);
  };

  return (
    <PagePermissionGuard resource="customer_demand" action="view">
      <div className="cd-demand cd-page flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 md:gap-4 md:p-4">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="cd-mark" aria-hidden />
                <h1 className="cd-title">Demand khách hàng</h1>
              </div>
              <p className="cd-subtitle mt-1 max-w-2xl pl-[22px]">
                Nhu cầu OEM/đặt hộ theo khách, sản phẩm và tháng. Không tạo
                Order, hóa đơn, công nợ hoặc giữ tồn.
              </p>
            </div>
            {canCreate && (
              <div className="flex items-center gap-2">
                <DemandButton
                  type="button"
                  variant="ghost"
                  icon={<Upload className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  onClick={() => setImportOpen(true)}>
                  Import Excel
                </DemandButton>
                <DemandButton
                  type="button"
                  icon={<Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  onClick={openCreate}>
                  Tạo Demand
                </DemandButton>
              </div>
            )}
          </div>

          <div className="cd-shell cd-filter-shell shrink-0">
            <div className="cd-core cd-toolbar gap-3 px-3 py-3 md:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="cd-tabs" role="tablist" aria-label="Lọc trạng thái">
                  {STATUS_TABS.map((tab) => {
                    const active = (filters.status ?? "") === tab.value;
                    return (
                      <button
                        key={tab.value || "all"}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            status: tab.value || undefined,
                            page: 1,
                          }))
                        }
                        className={`cd-tab ${active ? "is-active" : ""}`}>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-64 max-w-full">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--cd-muted)]"
                    strokeWidth={1.5}
                  />
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
                    className="cd-input has-icon pr-8"
                  />
                  {!customerFilterLabel &&
                    customerFilterDebounced.length >= 2 && (
                      <div className="cd-menu">
                        {customerResults.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-[var(--cd-muted)]">
                            Không tìm thấy khách hàng
                          </div>
                        ) : (
                          customerResults.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => selectFilterCustomer(customer)}>
                              {customer.code ? `${customer.code} · ` : ""}
                              {customer.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  {customerFilterLabel && (
                    <button
                      type="button"
                      onClick={clearCustomerFilter}
                      className="cd-icon-btn absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                      aria-label="Bỏ lọc khách hàng">
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                <div className="relative flex items-center gap-1">
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
                    className="cd-input w-[10.5rem]"
                  />
                  {filters.month && (
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          month: undefined,
                          page: 1,
                        }))
                      }
                      title="Bỏ lọc tháng"
                      className="cd-icon-btn"
                      aria-label="Bỏ lọc tháng">
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              <div className="cd-subtitle">
                {data ? (
                  <span>
                    Tổng{" "}
                    <strong className="cd-mono text-[var(--cd-text)]">
                      {data.total.toLocaleString("vi-VN")}
                    </strong>{" "}
                    phiếu
                  </span>
                ) : (
                  "Đang tải..."
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-3 md:gap-4">
            <div className="cd-shell min-h-0 min-w-0 flex-1">
              <div className="cd-core">
                {isLoading ? (
                  <DemandListSkeleton />
                ) : isError ? (
                  <DemandEmptyState
                    icon={<Inbox className="h-6 w-6" strokeWidth={1.4} />}
                    title="Không tải được danh sách"
                    description="Thử tải lại trang hoặc kiểm tra kết nối trước khi tiếp tục lập Demand."
                  />
                ) : rows.length === 0 ? (
                  <DemandEmptyState
                    icon={
                      <ClipboardList className="h-6 w-6" strokeWidth={1.4} />
                    }
                    title="Chưa có phiếu Demand"
                    description={
                      hasActiveFilters
                        ? "Không có phiếu khớp bộ lọc hiện tại. Đổi trạng thái, khách hàng hoặc tháng rồi thử lại."
                        : "Tạo phiếu OEM/đặt hộ theo khách hàng và tháng cần hàng, rồi duyệt trước khi cộng vào dự kiến đặt hàng."
                    }
                    action={
                      canCreate && !hasActiveFilters ? (
                        <DemandButton
                          type="button"
                          icon={
                            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                          }
                          onClick={openCreate}>
                          Tạo Demand
                        </DemandButton>
                      ) : null
                    }
                  />
                ) : (
                  <div className="cd-voucher-list">
                    {rows.map((row) => (
                      <DemandListRow
                        key={row.id}
                        row={row}
                        selected={selectedId === row.id}
                        onView={() =>
                          setSelectedId(selectedId === row.id ? null : row.id)
                        }
                        onEdit={
                          canUpdate &&
                          row.months.some(
                            (month) => month.status !== "CANCELLED"
                          )
                            ? () => {
                                setSelectedId(row.id);
                                setFormOpen(true);
                              }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                <div className="cd-pager">
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
                      className="cd-select w-[4.5rem]">
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>dòng/trang</span>
                    {data && (
                      <span>
                        ·{" "}
                        {Math.min(
                          (filters.page - 1) * filters.limit + 1,
                          data.total
                        )}
                        -{Math.min(filters.page * filters.limit, data.total)} /{" "}
                        {data.total}
                      </span>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="cd-pager-btns">
                      <DemandButton
                        type="button"
                        variant="ghost"
                        size="tiny"
                        disabled={filters.page <= 1}
                        icon={
                          <ChevronLeft
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        }
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            page: Math.max(1, prev.page - 1),
                          }))
                        }>
                        Trước
                      </DemandButton>
                      <span className="cd-mono px-1">
                        {filters.page}/{totalPages}
                      </span>
                      <DemandButton
                        type="button"
                        variant="ghost"
                        size="tiny"
                        disabled={filters.page >= totalPages}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            page: Math.min(totalPages, prev.page + 1),
                          }))
                        }>
                        Sau
                      </DemandButton>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`cd-detail-wrap ${selectedId !== null ? "is-open" : ""}`}
              onClick={() => {
                if (window.matchMedia("(max-width: 767px)").matches) {
                  setSelectedId(null);
                }
              }}>
              {selectedId !== null && (
                <div
                  className="cd-shell flex min-h-0 w-full flex-1 flex-col"
                  onClick={(event) => event.stopPropagation()}>
                  <aside className="cd-core">
                    <div className="flex items-start justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_var(--cd-hairline)]">
                      <div className="min-w-0">
                        <h2 className="truncate text-[16px] font-semibold tracking-tight">
                          {detail?.customer.name ?? "Đang tải..."}
                        </h2>
                        {detail && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="cd-id cd-mono">#{detail.id}</span>
                            <span className="cd-subtitle">
                              {detail.customer.code
                                ? `Mã KH: ${detail.customer.code}`
                                : `ID KH: ${detail.customer.id}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {canEditSelected && (
                          <DemandButton
                            type="button"
                            variant="ghost"
                            size="tiny"
                            onClick={() => setFormOpen(true)}>
                            Sửa
                          </DemandButton>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="cd-icon-btn"
                          aria-label="Đóng chi tiết">
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    {detailLoading || !detail ? (
                      <div className="space-y-3 px-4 py-6">
                        <div className="cd-skel w-2/3" />
                        <div className="cd-skel w-full" />
                        <div className="cd-skel w-5/6" />
                        <div className="cd-skel w-3/4" />
                      </div>
                    ) : (
                      <DemandDetailMonths
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
                </div>
              )}
            </div>
          </div>
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

function DemandListSkeleton() {
  return (
    <div className="cd-voucher-list">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="cd-voucher pointer-events-none">
          <div className="space-y-2">
            <div className="cd-skel w-48" />
            <div className="cd-skel w-28" />
            <div className="cd-skel w-40" />
          </div>
          <div className="space-y-2">
            <div className="cd-skel ml-auto w-16" />
            <div className="cd-skel ml-auto w-20" />
          </div>
        </div>
      ))}
    </div>
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
    <article
      onClick={onView}
      className={`cd-voucher ${selected ? "is-selected" : ""}`}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="cd-id cd-mono">#{row.id}</span>
          <h3 className="cd-voucher-name">{row.customer.name}</h3>
        </div>
        <div className="cd-subtitle mt-1">
          {row.customer.code
            ? `Mã KH: ${row.customer.code}`
            : `ID KH: ${row.customer.id}`}
        </div>
        <div className="mt-2">
          {draftCount > 0 ? (
            <DemandStatusChip
              status="DRAFT"
              pulse
              label={`Chờ duyệt (${draftCount}/${months.length} tháng)`}
            />
          ) : confirmedCount === months.length && months.length > 0 ? (
            <DemandStatusChip
              status="CONFIRMED"
              label={`Đã duyệt (${confirmedCount} tháng)`}
            />
          ) : cancelledCount === months.length ? (
            <DemandStatusChip status="CANCELLED" />
          ) : (
            <DemandStatusChip
              status="mixed"
              label={`${confirmedCount} đã duyệt · ${cancelledCount} hủy`}
            />
          )}
        </div>
        <div className="mt-2 flex max-w-xl flex-wrap gap-1">
          {months.map((month) => (
            <DemandMonthChip
              key={month.id}
              month={month.month}
              status={month.status}
            />
          ))}
        </div>
        {row.note && (
          <div className="cd-note mt-2" title={row.note}>
            <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{row.note}</span>
          </div>
        )}
      </div>
      <div className="cd-voucher-side">
        <div className="flex items-end gap-5">
          <div className="cd-stat">
            <b className="cd-mono">{row.totalProducts}</b>
            <span className="cd-subtitle">mặt hàng</span>
          </div>
          <div className="cd-stat">
            <b className="cd-mono">{formatDemandQty(row.totalQuantityBase)}</b>
            <span className="cd-subtitle">đv cơ bản</span>
          </div>
        </div>
        <div className="cd-subtitle">
          {new Date(row.updatedAt).toLocaleDateString("vi-VN")}{" "}
          {new Date(row.updatedAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onView}
            title={selected ? "Đóng chi tiết" : "Xem chi tiết"}
            className={`cd-icon-btn ${selected ? "is-active" : ""}`}>
            <Eye className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {onEdit && (
            <DemandButton
              type="button"
              variant="ghost"
              size="tiny"
              onClick={onEdit}>
              Sửa
            </DemandButton>
          )}
        </div>
      </div>
    </article>
  );
}

function DemandDetailMonths({
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="cd-detail-summary">
        <div className="cd-summary-pill min-w-0 flex-1">
          <span>Ghi chú</span>
          <b className="line-clamp-2">{demand.note || "Không có ghi chú chung"}</b>
        </div>
        <div className="cd-summary-pill">
          <span>Sản phẩm</span>
          <b className="cd-mono">{demand.totalProducts}</b>
        </div>
        <div className="cd-summary-pill">
          <span>Tổng đv cơ bản</span>
          <b className="cd-mono">{formatDemandQty(demand.totalQuantityBase)}</b>
        </div>
      </div>
      <div className="cd-month-stack">
        {months.length === 0 ? (
          <DemandEmptyState
            icon={<ClipboardList className="h-6 w-6" strokeWidth={1.4} />}
            title="Phiếu chưa có tháng"
            description="Sửa phiếu để thêm tháng cần hàng."
          />
        ) : (
          months.map((month) => {
            const lines = month.lines ?? [];
            const logs = (month.changeLogs ?? []).slice(0, 3);
            return (
              <section
                key={month.id}
                className={`cd-month-card is-${month.status.toLowerCase()}`}>
                <div className="cd-month-head">
                  <div>
                    <h3>{formatDemandMonth(month.month)}</h3>
                    <div className="mt-1">
                      <DemandStatusChip status={month.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {month.status === "DRAFT" && canApprove && (
                      <DemandButton
                        type="button"
                        variant="success"
                        size="tiny"
                        disabled={approving}
                        icon={<Check className="h-3 w-3" strokeWidth={1.5} />}
                        onClick={() => onApprove(month.id)}>
                        Duyệt
                      </DemandButton>
                    )}
                    {month.status !== "CANCELLED" && canCancel && (
                      <DemandButton
                        type="button"
                        variant="danger"
                        size="tiny"
                        disabled={cancelling}
                        icon={
                          <SquareX className="h-3 w-3" strokeWidth={1.5} />
                        }
                        onClick={() => onCancel(month.id)}>
                        Hủy
                      </DemandButton>
                    )}
                  </div>
                </div>
                {lines.length === 0 ? (
                  <div className="px-3 pb-3 text-xs text-[var(--cd-muted)]">
                    Tháng chưa có sản phẩm.
                  </div>
                ) : (
                  lines.map((line) => (
                    <div key={line.id} className="cd-line">
                      <div className="min-w-0">
                        <div className="cd-mono text-[11px] text-[var(--cd-cyan-deep)]">
                          {line.product.code}
                        </div>
                        <div className="cd-line-name">{line.product.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="cd-mono text-sm font-semibold">
                          {formatDemandQty(line.inputQuantity)}{" "}
                          {line.inputUnit === "CARTON"
                            ? "thùng"
                            : (line.product.unit ?? "đv")}
                        </div>
                        {line.inputUnit === "CARTON" && (
                          <div className="cd-subtitle">
                            {formatDemandQty(line.quantityBase)}{" "}
                            {line.product.unit ?? "đv"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {logs.length > 0 && (
                  <div className="cd-history">
                    {logs.map((log) => (
                      <div key={log.id}>
                        {new Date(log.createdAt).toLocaleString("vi-VN")} ·{" "}
                        {log.reason}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
