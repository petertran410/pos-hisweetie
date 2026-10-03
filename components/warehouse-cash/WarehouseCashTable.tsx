"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Check,
  Paperclip,
  Plus,
  SquarePen,
} from "lucide-react";
import Swal from "sweetalert2";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import type {
  WarehouseCashFlowRef,
  WarehouseCustomer,
  WarehouseReceipt,
  WarehouseReceiptQuery,
} from "@/lib/api/internal-finance";
import {
  useCancelWarehouseReceipt,
  usePostWarehouseReceipt,
  useWarehouseReceipts,
} from "@/lib/hooks/useInternalFinance";
import { useCan } from "@/lib/hooks/useCan";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { formatCurrency } from "@/lib/utils";
import { WarehouseCashAllocationModal } from "./WarehouseCashAllocationModal";
import { WarehouseCashAttachmentsModal } from "./WarehouseCashAttachmentsModal";
import { WarehouseCashForm } from "./WarehouseCashForm";

interface WarehouseCashTableProps {
  filters: WarehouseReceiptQuery;
  onFiltersChange: (patch: Partial<WarehouseReceiptQuery>) => void;
}

const PAGE_SIZE = 20;

function WarehouseCashRowMenu({
  canEdit,
  canPost,
  canCancel,
  posting,
  canceling,
  onEdit,
  onPost,
  onCancel,
}: {
  canEdit: boolean;
  canPost: boolean;
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
        title="Thao tác"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-lg border px-3 text-sm text-gray-700 transition-colors ${
          open
            ? "border-brand bg-brand-soft text-gray-900"
            : "hover:border-gray-300 hover:bg-gray-50"
        }`}>
        Thao tác
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
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
  if (row.status === "CANCELLED") return { text: "Đã hủy", className: "bg-red-100 text-red-700" };
  if (row.status === "POSTING") return { text: "Đang lập", className: "bg-blue-100 text-blue-700" };
  if (isPosted(row)) return { text: "Đã lập phiếu", className: "bg-green-100 text-green-700" };
  return { text: "Chưa lập phiếu", className: "bg-amber-100 text-amber-700" };
};

const receiptCustomers = (row: WarehouseReceipt): WarehouseCustomer[] =>
  row.customers?.length
    ? row.customers
    : row.customer
      ? [row.customer]
      : [];

const receiptCashFlows = (row: WarehouseReceipt): WarehouseCashFlowRef[] =>
  row.postedCashFlows?.length
    ? row.postedCashFlows
    : row.cashFlow
      ? [row.cashFlow]
      : [];

const createWarehouseColumns = (
  onOpenAttachments: (row: WarehouseReceipt) => void,
): ColumnConfig<WarehouseReceipt>[] => [
  {
    key: "code",
    label: "Mã",
    visible: true,
    width: "150px",
    render: (row) => (
      <div className="font-mono text-xs leading-5 text-gray-900">{row.code}</div>
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
            <div key={`${customer.id}-${customer.name}`} className="break-words">
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
    visible: true,
    width: "130px",
    render: (row) => {
      const flows = receiptCashFlows(row);
      return flows.length ? (
        <div className="space-y-0.5 font-mono text-xs leading-5">
          {flows.map((flow) => (
            <div key={flow.id}>{flow.code}</div>
          ))}
        </div>
      ) : (
        "-"
      );
    },
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
}: WarehouseCashTableProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [formReceipt, setFormReceipt] = useState<WarehouseReceipt | null | undefined>(
    undefined,
  );
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  const [attachmentRow, setAttachmentRow] = useState<WarehouseReceipt | null>(null);
  const defaultColumns = useMemo(
    () => createWarehouseColumns(setAttachmentRow),
    [],
  );
  const { columns, toggleColumn } = useColumnVisibility<WarehouseReceipt>(
    "warehouseCashTableColumns",
    defaultColumns,
  );
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns],
  );
  const postReceipt = usePostWarehouseReceipt();
  const cancelReceipt = useCancelWarehouseReceipt();
  const canCreate = useCan("warehouse_cash", "create");
  const canUpdate = useCan("warehouse_cash", "update");
  const canPost = useCan("warehouse_cash", "post");
  const canCancel = useCan("warehouse_cash", "cancel");
  const pageSize = filters.limit || PAGE_SIZE;
  const query = useWarehouseReceipts({ ...filters, limit: pageSize });
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
                  className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {col.label}
                </th>
              ))}
              <th
                style={{ width: "104px", minWidth: "104px" }}
                className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
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
                <td colSpan={colSpan} className="py-20 text-center text-sm text-gray-400">
                  Không có phiếu tiền mặt
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const sale = isWarehouseSale(row);
                const customers = receiptCustomers(row);
                const canEditRow = canUpdate && isOpen(row);
                const canPostRow =
                  canPost && isOpen(row) && (sale || customers.length > 0);
                const canCancelRow =
                  canCancel &&
                  row.status !== "CANCELLED" &&
                  row.status !== "REJECTED" &&
                  row.status !== "POSTING";
                const hasRowActions = canEditRow || canPostRow || canCancelRow;

                return (
                  <tr key={row.id} className="border-b transition-colors hover:bg-gray-50">
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
                          col.key === "amount" ? "text-right whitespace-nowrap" : "whitespace-normal"
                        }`}>
                        {col.render(row)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 align-middle">
                      {hasRowActions && (
                        <WarehouseCashRowMenu
                          canEdit={canEditRow}
                          canPost={canPostRow}
                          canCancel={canCancelRow}
                          posting={postReceipt.isPending}
                          canceling={
                            cancelReceipt.isPending &&
                            cancelReceipt.variables?.id === row.id
                          }
                          onEdit={() => setFormReceipt(row)}
                          onPost={() =>
                            sale
                              ? postReceipt.mutate({ id: row.id, allocations: [] })
                              : setAllocatingId(row.id)
                          }
                          onCancel={() => void handleCancelReceipt(row)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={pageSize}
            onChange={(event) =>
              onFiltersChange({ limit: Number(event.target.value), page: 1 })
            }
            className="rounded border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand">
            {[10, 15, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-gray-500">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            title="Trang đầu"
            disabled={page <= 1}
            onClick={() => onFiltersChange({ page: 1 })}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Trang trước"
            disabled={page <= 1}
            onClick={() => onFiltersChange({ page: page - 1 })}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onFiltersChange({ page: page + 1 })}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Trang cuối"
            disabled={page >= totalPages}
            onClick={() => onFiltersChange({ page: totalPages })}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

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
    </div>
  );
}
