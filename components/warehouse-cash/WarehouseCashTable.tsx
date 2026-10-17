"use client";

import {
  CardAction,
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { TablePagination } from "@/components/shared/TablePagination";
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/usePageSize";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Loader2,
  Check,
  CheckCheck,
  MoreHorizontal,
  Paperclip,
  Plus,
  SquarePen,
} from "lucide-react";
import Swal from "sweetalert2";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { CodeLink } from "@/components/shared/CodeLink";
import type {
  WarehouseCashFlowRef,
  WarehouseCustomer,
  WarehouseReceipt,
  WarehouseReceiptQuery,
} from "@/lib/api/internal-finance";
import {
  useCancelWarehouseReceipt,
  useConfirmWarehouseReceiptAmount,
  usePostWarehouseReceipt,
  useWarehouseReceipts,
} from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { formatCurrency } from "@/lib/utils";
import { WarehouseCashAllocationModal } from "./WarehouseCashAllocationModal";
import { WarehouseCashAttachmentsModal } from "./WarehouseCashAttachmentsModal";
import { WarehouseCashForm } from "./WarehouseCashForm";
import {
  WarehouseCashConfirmCell,
  WarehouseCashDifference,
} from "./WarehouseCashConfirmCell";

/** Ô "KT kho xác nhận" cần quyền và mutation của bảng: truyền qua render. */
type WarehouseCellCtx = {
  confirmCell: (row: WarehouseReceipt) => React.ReactNode;
};

/** Phiếu thu đã lập (như Biến động số dư): "Phiếu TT…" bấm mở, kèm số tiền. */
function PostedReceipts({
  row,
  align = "start",
  simple = false,
}: {
  row: WarehouseReceipt;
  align?: "start" | "end";
  /** Chỉ chữ "Phiếu TT…" xếp dọc, như cột thao tác của Biến động số dư. */
  simple?: boolean;
}) {
  const flows = receiptCashFlows(row);
  if (!flows.length) return null;
  if (simple)
    return (
      <div
        className={`flex flex-col gap-0.5 text-xs leading-tight text-gray-500 ${
          align === "end" ? "items-end" : "items-start"
        }`}>
        {flows.map((flow) => (
          <span key={flow.id} className="whitespace-nowrap">
            Phiếu {flow.code}
          </span>
        ))}
      </div>
    );
  const names = new Map(
    receiptCustomers(row).map((customer) => [customer.id, customer.name]),
  );
  return (
    <div
      className={`flex flex-col gap-0.5 text-xs leading-tight ${
        align === "end" ? "items-end text-right" : "items-start"
      }`}>
      {flows.map((flow) => (
        <div key={flow.id} className="whitespace-nowrap">
          <span className="text-gray-500">Phiếu </span>
          <CodeLink entity="cashflow" code={flow.code} />
          {flows.length > 1 &&
            flow.customerId &&
            names.get(Number(flow.customerId)) && (
              <div className="max-w-[180px] truncate text-[11px] text-gray-400">
                {names.get(Number(flow.customerId))}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

/** Cột tiền căn phải cho thẳng hàng nhau. */
const MONEY_COLUMNS = ["amount", "confirmed", "difference"];

/** Số kế toán kho xác nhận (> 0) mới được lập phiếu thu. */
const confirmedOf = (row: WarehouseReceipt) =>
  row.confirmedAmount === null || row.confirmedAmount === undefined
    ? null
    : Number(row.confirmedAmount);
const postBlockReason = (row: WarehouseReceipt) => {
  const confirmed = confirmedOf(row);
  if (confirmed === null) return "Chờ kế toán kho xác nhận số tiền";
  if (confirmed <= 0) return "Kế toán kho xác nhận chưa thu được tiền";
  return null;
};

interface WarehouseCashTableProps {
  filters: WarehouseReceiptQuery;
  onFiltersChange: (patch: Partial<WarehouseReceiptQuery>) => void;
  /** Điện thoại: danh sách thẻ thay cho bảng. */
  isMobile?: boolean;
  activeFilterCount?: number;
  onOpenFilter?: () => void;
}

const PAGE_SIZE = 20;

function WarehouseCashRowMenu({
  canEdit,
  confirmMatch,
  canPost,
  postBlocked,
  canCancel,
  posting,
  canceling,
  onEdit,
  onPost,
  onCancel,
}: {
  canEdit: boolean;
  /** Kế toán kho: "Xác nhận đúng số tiền"; có lý do thì nút mờ. */
  confirmMatch?: {
    amount: number;
    blocked: string | null;
    onConfirm: () => void;
  } | null;
  canPost: boolean;
  /** Có quyền lập phiếu thu nhưng chưa được: lý do hiện trên nút mờ. */
  postBlocked?: string | null;
  canCancel: boolean;
  posting: boolean;
  canceling: boolean;
  onEdit: () => void;
  onPost: () => void;
  onCancel: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        title="Thêm thao tác"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-gray-500 transition-colors ${
          open ? "border-brand bg-brand-soft text-gray-900" : "hover:bg-gray-50"
        }`}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50">
              <SquarePen className="h-4 w-4 shrink-0 text-gray-500" />
              Sửa
            </button>
          )}
          {confirmMatch && (
            <button
              type="button"
              disabled={Boolean(confirmMatch.blocked)}
              title={confirmMatch.blocked || undefined}
              onClick={() => {
                setOpen(false);
                confirmMatch.onConfirm();
              }}
              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent">
              <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <span>
                Xác nhận đúng số tiền
                <span className="block text-[11px] text-gray-400">
                  {confirmMatch.blocked ||
                    `${formatCurrency(confirmMatch.amount)} như báo đơn`}
                </span>
              </span>
            </button>
          )}
          {canPost && (
            <button
              type="button"
              disabled={posting}
              onClick={() => {
                setOpen(false);
                onPost();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
              {posting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
              ) : (
                <Check className="h-4 w-4 shrink-0 text-gray-500" />
              )}
              Lập phiếu thu
            </button>
          )}
          {!canPost && postBlocked && (
            <button
              type="button"
              disabled
              title={postBlocked}
              className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                Lập phiếu thu
                <span className="block text-[11px]">{postBlocked}</span>
              </span>
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={canceling}
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
              {canceling ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 shrink-0" />
              )}
              Hủy phiếu
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const dateLabel = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isPosted = (row: WarehouseReceipt) =>
  row.status === "POSTED" || Boolean(row.cashFlow && row.status !== "POSTING");

const isOpen = (row: WarehouseReceipt) =>
  !isPosted(row) && row.status !== "CANCELLED" && row.status !== "REJECTED";

const isWarehouseSale = (row: WarehouseReceipt) =>
  row.subCategory === "WAREHOUSE_ITEM_SALE" ||
  row.sourceSnapshot?.receiptKind === "WAREHOUSE_SALE";

const statusLabel = (row: WarehouseReceipt) => {
  if (row.status === "CANCELLED")
    return { text: "Đã hủy", className: "bg-red-100 text-red-700" };
  if (row.status === "POSTING")
    return { text: "Đang lập", className: "bg-blue-100 text-blue-700" };
  if (isPosted(row))
    return { text: "Đã lập phiếu", className: "bg-green-100 text-green-700" };
  return { text: "Chưa lập phiếu", className: "bg-amber-100 text-amber-700" };
};

const receiptCustomers = (row: WarehouseReceipt): WarehouseCustomer[] =>
  row.customers?.length ? row.customers : row.customer ? [row.customer] : [];

const receiptCashFlows = (row: WarehouseReceipt): WarehouseCashFlowRef[] =>
  row.postedCashFlows?.length
    ? row.postedCashFlows
    : row.cashFlow
      ? [row.cashFlow]
      : [];

const createWarehouseColumns = (
  onOpenAttachments: (row: WarehouseReceipt) => void,
): ColumnConfig<WarehouseReceipt, WarehouseCellCtx>[] => [
  {
    key: "code",
    label: "Mã",
    visible: true,
    width: "150px",
    render: (row) => (
      <div className="font-mono text-xs leading-5 text-gray-900">
        {row.code}
      </div>
    ),
  },
  {
    key: "occurredAt",
    label: "Ngày thu",
    visible: true,
    width: "110px",
    render: (row) => (
      <span className="whitespace-nowrap">{dateLabel(row.occurredAt)}</span>
    ),
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    width: "130px",
    render: (row) => row.branch?.name || "-",
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    width: "180px",
    render: (row) => {
      const customers = receiptCustomers(row);
      if (isWarehouseSale(row)) return <span>Bán đồ kho</span>;
      if (!customers.length) {
        return <span className="text-gray-400">Chưa có khách</span>;
      }
      return (
        <div className="space-y-0.5 leading-5">
          {customers.map((customer) => (
            <div
              key={`${customer.id}-${customer.name}`}
              className="break-words">
              {customer.name}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "invoice",
    label: "Hóa đơn",
    visible: true,
    width: "150px",
    render: (row) =>
      row.invoiceLinks?.length ? (
        <div className="space-y-0.5 font-mono text-xs leading-5">
          {row.invoiceLinks.map((link) => (
            <div key={link.invoice.id}>{link.invoice.code}</div>
          ))}
        </div>
      ) : (
        "-"
      ),
  },
  {
    key: "packingSlip",
    label: "Báo đơn",
    visible: true,
    width: "120px",
    render: (row) => (
      <span className="font-mono text-xs">{row.packingSlip?.code || "-"}</span>
    ),
  },
  {
    key: "amount",
    label: "Số tiền",
    visible: true,
    width: "120px",
    render: (row) => (
      <span className="font-medium">{formatCurrency(Number(row.amount))}</span>
    ),
  },
  {
    key: "confirmed",
    label: "KT kho xác nhận",
    visible: true,
    width: "190px",
    render: (row, ctx) => ctx?.confirmCell(row) ?? null,
  },
  {
    key: "difference",
    label: "Chênh lệch",
    visible: true,
    width: "120px",
    render: (row) => <WarehouseCashDifference row={row} />,
  },
  {
    key: "description",
    label: "Nội dung",
    visible: true,
    width: "200px",
    render: (row) => (
      <span className="break-words" title={row.description || ""}>
        {row.description || "-"}
      </span>
    ),
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: true,
    width: "160px",
    render: (row) => (
      <span className="break-words text-gray-500" title={row.note || ""}>
        {row.note || "-"}
      </span>
    ),
  },
  {
    key: "attachments",
    label: "Chứng từ",
    visible: true,
    width: "110px",
    render: (row) => {
      const count = row.attachments?.length || 0;
      if (!count) return "-";
      return (
        <button
          type="button"
          title={`Xem ${count} chứng từ`}
          onClick={() => onOpenAttachments(row)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs text-brand hover:border-brand hover:bg-brand-soft">
          <Paperclip className="h-3.5 w-3.5" />
          {count}
        </button>
      );
    },
  },
  {
    key: "cashFlow",
    label: "Phiếu thu",
    // Mã phiếu thu đã hiện ở cột Thao tác; cột riêng để ẩn sẵn.
    visible: false,
    width: "190px",
    render: (row) =>
      receiptCashFlows(row).length ? <PostedReceipts row={row} /> : "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    width: "130px",
    render: (row) => {
      const status = statusLabel(row);
      return (
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.text}
        </span>
      );
    },
  },
];

export function WarehouseCashTable({
  filters,
  onFiltersChange,
  isMobile = false,
  activeFilterCount = 0,
  onOpenFilter,
}: WarehouseCashTableProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [formReceipt, setFormReceipt] = useState<
    WarehouseReceipt | null | undefined
  >(undefined);
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  const [attachmentRow, setAttachmentRow] = useState<WarehouseReceipt | null>(
    null,
  );
  const defaultColumns = useMemo(
    () => createWarehouseColumns(setAttachmentRow),
    [],
  );
  const { columns, toggleColumn } = useColumnVisibility<
    WarehouseReceipt,
    WarehouseCellCtx
  >("warehouseCashTableColumns", defaultColumns);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );
  const postReceipt = usePostWarehouseReceipt();
  const cancelReceipt = useCancelWarehouseReceipt();
  const confirmAmount = useConfirmWarehouseReceiptAmount();
  // Quyền theo vai trò × chi nhánh: xét theo kho của từng phiếu.
  const access = useFinanceAccess();
  const viewBranches = access.branches("warehouse_cash", "view", [6, 1]);
  const canCreate = access.any("warehouse_cash", "create");
  const pageSize = filters.limit || PAGE_SIZE;
  const allowedFilter = (filters.branchIds || []).filter((id) =>
    viewBranches.includes(Number(id)),
  );
  const query = useWarehouseReceipts({
    ...filters,
    branchIds: allowedFilter.length ? allowedFilter : undefined,
    limit: pageSize,
  });
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const page = query.data?.page || filters.page || 1;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const colSpan = visibleColumns.length + 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.search || "") !== search) {
        onFiltersChange({ search: search || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.search, onFiltersChange]);

  const handleCancelReceipt = async (row: WarehouseReceipt) => {
    const cashFlows = receiptCashFlows(row);
    let cancelCashFlows = false;

    if (cashFlows.length > 0) {
      const result = await Swal.fire({
        title: "Xác nhận hủy phiếu tiền mặt kho",
        html: `
          <p>Phiếu này có <strong>${cashFlows.length}</strong> phiếu thu.</p>
          <p class="text-red-600 font-bold mt-2">Bạn có muốn hủy cả phiếu thu không?</p>
        `,
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Có - Hủy kèm phiếu thu",
        denyButtonText: "Không - Giữ phiếu thu",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        denyButtonColor: "#059669",
        cancelButtonColor: "#6b7280",
      });
      if (result.isDismissed) return;
      cancelCashFlows = result.isConfirmed;
    } else {
      const result = await Swal.fire({
        title: "Xác nhận hủy phiếu tiền mặt kho",
        text: "Bạn có chắc chắn muốn hủy phiếu này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
      });
      if (!result.isConfirmed) return;
    }

    try {
      await cancelReceipt.mutateAsync({ id: row.id, cancelCashFlows });
    } catch {
      // Hook đã hiển thị lỗi từ backend.
    }
  };

  const rowActions = (row: WarehouseReceipt) => {
    const sale = isWarehouseSale(row);
    const customers = receiptCustomers(row);
    const canEdit =
      access.can("warehouse_cash", "update", row.branchId) && isOpen(row);
    const mayPost =
      access.can("warehouse_cash", "post", row.branchId) &&
      isOpen(row) &&
      (sale || customers.length > 0);
    // Kế toán công nợ chỉ lập phiếu thu theo số kế toán kho đã xác nhận.
    const postBlocked = mayPost ? postBlockReason(row) : null;
    const canPost = mayPost && !postBlocked;
    const canConfirm =
      access.can("warehouse_cash", "confirm_amount", row.branchId) &&
      isOpen(row) &&
      row.status !== "POSTING";
    const canCancel =
      access.can("warehouse_cash", "cancel", row.branchId) &&
      row.status !== "CANCELLED" &&
      row.status !== "REJECTED" &&
      row.status !== "POSTING";
    const confirmed = confirmedOf(row);
    // Đã tự nhập số thì không dùng "Xác nhận đúng số tiền"; đã đúng số thì ẩn.
    const confirmMatch =
      canConfirm && row.confirmedMode !== "MATCH"
        ? {
            amount: Number(row.amount),
            blocked:
              confirmed !== null
                ? "Đã nhập số tay: bỏ xác nhận (✕) để dùng nút này"
                : null,
            onConfirm: () =>
              confirmAmount.mutate({ id: row.id, mode: "MATCH" }),
          }
        : null;
    return {
      sale,
      customers,
      canEdit,
      canPost,
      postBlocked,
      canConfirm,
      confirmMatch,
      canCancel,
      post: () =>
        sale
          ? postReceipt.mutate({ id: row.id, allocations: [] })
          : setAllocatingId(row.id),
    };
  };

  const confirmCell = (row: WarehouseReceipt) => (
    <WarehouseCashConfirmCell
      row={row}
      open={isOpen(row)}
      editable={rowActions(row).canConfirm}
      pending={
        confirmAmount.isPending && confirmAmount.variables?.id === row.id
      }
      onConfirm={(mode, amount) =>
        confirmAmount.mutate({ id: row.id, mode, amount })
      }
    />
  );
  const cellCtx: WarehouseCellCtx = { confirmCell };

  const modals = (
    <>
      {formReceipt !== undefined && (
        <WarehouseCashForm
          receipt={formReceipt}
          onClose={() => setFormReceipt(undefined)}
        />
      )}
      {allocatingId != null && (
        <WarehouseCashAllocationModal
          id={allocatingId}
          onClose={() => setAllocatingId(null)}
        />
      )}
      {attachmentRow && (
        <WarehouseCashAttachmentsModal
          attachments={attachmentRow.attachments || []}
          title={attachmentRow.code}
          onClose={() => setAttachmentRow(null)}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <FinanceMobileShell
          title="Tiền mặt kho"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã, khách, hóa đơn, báo đơn..."
          activeFilterCount={activeFilterCount}
          onOpenFilter={onOpenFilter}
          summary={
            <span className="text-gray-500">
              <strong className="text-gray-900">{total}</strong> phiếu
            </span>
          }
          isLoading={query.isLoading}
          isEmpty={rows.length === 0}
          emptyText="Không có phiếu tiền mặt"
          page={page}
          totalPages={totalPages}
          onPageChange={(next) => onFiltersChange({ page: next })}
          onCreate={canCreate ? () => setFormReceipt(null) : undefined}>
          {rows.map((row) => {
            const actions = rowActions(row);
            const status = statusLabel(row);
            const flows = receiptCashFlows(row);
            const canceling =
              cancelReceipt.isPending && cancelReceipt.variables?.id === row.id;
            return (
              <FinanceMobileCard
                key={row.id}
                code={row.code}
                muted={row.status === "CANCELLED"}
                badge={
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                    {status.text}
                  </span>
                }
                title={
                  actions.sale
                    ? "Bán đồ kho"
                    : actions.customers.map((item) => item.name).join(", ") ||
                      "Chưa có khách"
                }
                meta={
                  <>
                    <div>
                      {dateLabel(row.occurredAt)} · {row.branch?.name || "-"}
                    </div>
                    {(row.packingSlip?.code || row.invoiceLinks?.length) && (
                      <div className="truncate font-mono">
                        {[
                          row.packingSlip?.code,
                          ...(row.invoiceLinks || []).map(
                            (link) => link.invoice.code,
                          ),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    {row.description && (
                      <div className="break-words">{row.description}</div>
                    )}
                    {flows.length > 0 && (
                      <div className="mt-1">
                        <PostedReceipts row={row} simple />
                      </div>
                    )}
                    <div className="mt-2 flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-2">
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-gray-500">
                          KT kho xác nhận
                        </div>
                        {confirmCell(row)}
                      </div>
                      <div className="text-right">
                        <div className="mb-1 text-[11px] font-medium text-gray-500">
                          Chênh lệch
                        </div>
                        <WarehouseCashDifference row={row} />
                      </div>
                    </div>
                  </>
                }
                amount={formatCurrency(Number(row.amount))}
                amountTone="positive">
                {(row.attachments?.length || 0) > 0 && (
                  <CardAction onClick={() => setAttachmentRow(row)}>
                    <Paperclip className="h-3.5 w-3.5" />
                    {row.attachments?.length}
                  </CardAction>
                )}
                {actions.confirmMatch && (
                  <CardAction
                    disabled={Boolean(actions.confirmMatch.blocked)}
                    title={actions.confirmMatch.blocked || undefined}
                    onClick={actions.confirmMatch.onConfirm}>
                    <CheckCheck className="h-3.5 w-3.5" />
                    Đúng số tiền
                  </CardAction>
                )}
                {actions.canPost && (
                  <CardAction
                    tone="primary"
                    disabled={postReceipt.isPending}
                    onClick={actions.post}>
                    Lập phiếu thu
                  </CardAction>
                )}
                {actions.postBlocked && (
                  <CardAction
                    disabled
                    title={actions.postBlocked}
                    onClick={() => undefined}>
                    {actions.postBlocked}
                  </CardAction>
                )}
                {actions.canEdit && (
                  <CardAction onClick={() => setFormReceipt(row)}>
                    Sửa
                  </CardAction>
                )}
                {actions.canCancel && (
                  <CardAction
                    tone="danger"
                    disabled={canceling}
                    onClick={() => void handleCancelReceipt(row)}>
                    {canceling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Hủy
                  </CardAction>
                )}
              </FinanceMobileCard>
            );
          })}
        </FinanceMobileShell>
        {modals}
      </>
    );
  }

  return (
    <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            Tiền mặt kho
          </h2>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã, khách, hóa đơn, báo đơn..."
            className="w-64 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="text-xs text-gray-400">{total} phiếu</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => setFormReceipt(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
              <Plus className="h-4 w-4" />
              Tạo phiếu
            </button>
          )}
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, minWidth: col.width }}
                  className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                    MONEY_COLUMNS.includes(col.key) ? "text-right" : "text-left"
                  }`}>
                  {col.label}
                </th>
              ))}
              <th
                style={{ width: "160px", minWidth: "160px" }}
                className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-sm text-gray-400">
                  Không có phiếu tiền mặt
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const {
                  canEdit: canEditRow,
                  canPost: canPostRow,
                  postBlocked,
                  confirmMatch,
                  canCancel: canCancelRow,
                  post,
                } = rowActions(row);
                const hasRowActions =
                  canEditRow ||
                  canPostRow ||
                  canCancelRow ||
                  !!postBlocked ||
                  !!confirmMatch;

                return (
                  <tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-gray-50">
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          wordWrap: "break-word",
                        }}
                        className={`px-4 py-2.5 align-middle ${
                          MONEY_COLUMNS.includes(col.key)
                            ? "text-right whitespace-nowrap"
                            : "whitespace-normal"
                        }`}>
                        {col.render(row, cellCtx)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-3">
                        {/* Đã lập phiếu thu: hiện mã phiếu như Biến động số dư. */}
                        <PostedReceipts row={row} align="end" simple />
                        {hasRowActions && (
                          <WarehouseCashRowMenu
                            canEdit={canEditRow}
                            confirmMatch={confirmMatch}
                            canPost={canPostRow}
                            postBlocked={postBlocked}
                            canCancel={canCancelRow}
                            posting={postReceipt.isPending}
                            canceling={
                              cancelReceipt.isPending &&
                              cancelReceipt.variables?.id === row.id
                            }
                            onEdit={() => setFormReceipt(row)}
                            onPost={post}
                            onCancel={() => void handleCancelReceipt(row)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={pageSize}
        limitOptions={PAGE_SIZE_OPTIONS}
        unit="phiếu"
        onPageChange={(next) => onFiltersChange({ page: next })}
        onLimitChange={(next) => onFiltersChange({ limit: next, page: 1 })}
      />

      {modals}
    </div>
  );
}
