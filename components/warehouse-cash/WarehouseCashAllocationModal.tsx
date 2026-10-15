"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { formatCurrency, formatNumberInput } from "@/lib/utils";
import {
  usePostWarehouseReceipt,
  useWarehouseReceipt,
} from "@/lib/hooks/useInternalFinance";
import { useCustomer, useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useUnpaidInvoices } from "@/lib/hooks/useUnpaidInvoices";

type InvoiceRow = {
  id: number;
  code: string;
  debt: number;
  purchaseDate?: string;
  /** Hóa đơn của phiếu giao hàng: hiện mặc định. */
  inPackingSlip: boolean;
};

type AllocRow = {
  customerId: number;
  name: string;
  code?: string | null;
  amount: string;
  invoices: Record<number, string>;
  invoiceList: InvoiceRow[];
  /** Khách thêm ngoài báo đơn (tài xế thu hộ nợ cũ): hóa đơn tải riêng. */
  added: boolean;
  /** Đang mở "Hóa đơn khác" (hóa đơn cũ ngoài phiếu giao hàng). */
  showOther: boolean;
};

const byDate = (a: InvoiceRow, b: InvoiceRow) =>
  new Date(a.purchaseDate || 0).getTime() -
    new Date(b.purchaseDate || 0).getTime() || a.id - b.id;

/** Hóa đơn đang hiện: phiếu giao hàng trước, "Hóa đơn khác" khi mở. */
const visibleInvoices = (row: AllocRow) => {
  const linked = row.invoiceList.filter((invoice) => invoice.inPackingSlip);
  const other = row.invoiceList.filter((invoice) => !invoice.inPackingSlip);
  // Không có hóa đơn phiếu giao hàng (khách thêm, phiếu tay): hiện hết.
  if (!linked.length) return other;
  return row.showOther ? [...linked, ...other] : linked;
};

/** Rải số tiền vào các hóa đơn đang hiện, cũ trước. */
const suggestInvoices = (invoices: InvoiceRow[], amount: number) => {
  let remaining = amount;
  const next: Record<number, string> = {};
  for (const invoice of invoices) {
    if (remaining <= 0) break;
    const take = Math.min(invoice.debt, remaining);
    if (take > 0) {
      next[invoice.id] = String(take);
      remaining -= take;
    }
  }
  return next;
};

/**
 * Lập phiếu thu tiền mặt kho theo số kế toán kho xác nhận: phân bổ cho khách
 * trong báo đơn (và khách thêm), vào hóa đơn phiếu giao hàng hoặc hóa đơn khác.
 */
export function WarehouseCashAllocationModal({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const detail = useWarehouseReceipt(id);
  const post = usePostWarehouseReceipt();
  const receipt = detail.data;
  const target = Number(receipt?.confirmedAmount || 0);
  const initialRows = useMemo<AllocRow[]>(() => {
    if (!receipt) return [];
    const customers = receipt.customers?.length
      ? receipt.customers
      : receipt.customer
        ? [receipt.customer]
        : [];
    const linkedIds = new Set(
      (receipt.invoiceLinks || []).map((link) => link.invoice.id),
    );
    const source = receipt.allocatableInvoices?.length
      ? receipt.allocatableInvoices
      : (receipt.invoiceLinks || []).map((link) => link.invoice);
    return customers.map((customer) => {
      const invoiceList = source
        .filter((invoice) => Number(invoice.customerId) === customer.id)
        .map((invoice) => ({
          id: invoice.id,
          code: invoice.code,
          debt: Math.max(0, Number(invoice.debtAmount || 0)),
          purchaseDate: invoice.purchaseDate,
          inPackingSlip:
            ("inPackingSlip" in invoice && Boolean(invoice.inPackingSlip)) ||
            linkedIds.has(invoice.id),
        }))
        .sort(byDate);
      const row: AllocRow = {
        customerId: customer.id,
        name: customer.name,
        code: customer.code,
        amount: "",
        invoices: {},
        invoiceList,
        added: false,
        showOther: false,
      };
      if (customers.length === 1 && target > 0) {
        row.amount = String(target);
        row.invoices = suggestInvoices(visibleInvoices(row), target);
      }
      return row;
    });
  }, [receipt, target]);
  const [draft, setDraft] = useState<AllocRow[] | null>(null);
  const rows = draft || initialRows;

  const sum = rows.reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const diff = Math.round((target - sum) * 100) / 100;
  const paying = rows.filter((row) => Number(row.amount) > 0);
  const balanced = target > 0 && diff === 0 && paying.length > 0;

  const update = (
    customerId: number,
    change: (row: AllocRow, all: AllocRow[]) => AllocRow,
  ) =>
    setDraft((current) => {
      const all = current || rows;
      return all.map((row) =>
        row.customerId === customerId ? change(row, all) : row,
      );
    });

  const setAmount = (customerId: number, digits: string) =>
    update(customerId, (row, all) => {
      const other = all.reduce(
        (total, item) =>
          item.customerId === customerId
            ? total
            : total + (Number(item.amount) || 0),
        0,
      );
      let value = digits === "" ? 0 : Number(digits);
      value = Math.min(Math.max(0, value), Math.max(0, target - other));
      return {
        ...row,
        amount: digits === "" ? "" : String(value),
        invoices: suggestInvoices(visibleInvoices(row), value),
      };
    });

  const setInvoiceAmount = (
    customerId: number,
    invoiceId: number,
    digits: string,
  ) =>
    update(customerId, (row) => {
      const invoice = row.invoiceList.find((item) => item.id === invoiceId);
      const customerAmount = Number(row.amount) || 0;
      const other = Object.entries(row.invoices).reduce(
        (total, [key, amount]) =>
          Number(key) === invoiceId ? total : total + (Number(amount) || 0),
        0,
      );
      let value = digits === "" ? 0 : Number(digits);
      value = Math.min(
        value,
        invoice?.debt || 0,
        Math.max(0, customerAmount - other),
      );
      value = Math.max(0, value);
      return {
        ...row,
        invoices: {
          ...row.invoices,
          [invoiceId]: digits === "" ? "" : String(value),
        },
      };
    });

  const toggleOther = (customerId: number) =>
    update(customerId, (row) => {
      const showOther = !row.showOther;
      // Đóng "Hóa đơn khác": bỏ phần đã gắn vào các hóa đơn bị ẩn.
      const invoices = showOther
        ? row.invoices
        : Object.fromEntries(
            Object.entries(row.invoices).filter(([key]) =>
              row.invoiceList.some(
                (invoice) =>
                  invoice.id === Number(key) && invoice.inPackingSlip,
              ),
            ),
          );
      return { ...row, showOther, invoices };
    });

  const addCustomers = (
    customers: Array<{ id: number; name: string; code?: string | null }>,
  ) =>
    setDraft((current) => {
      const all = current || rows;
      const fresh = customers.filter(
        (customer) => !all.some((row) => row.customerId === customer.id),
      );
      return [
        ...all,
        ...fresh.map((customer) => ({
          customerId: customer.id,
          name: customer.name,
          code: customer.code,
          amount: "",
          invoices: {},
          invoiceList: [],
          added: true,
          showOther: true,
        })),
      ];
    });

  const removeCustomer = (customerId: number) =>
    setDraft((current) =>
      (current || rows).filter((row) => row.customerId !== customerId),
    );

  // Khách thêm: hóa đơn còn nợ tải xong thì đưa vào danh sách của dòng.
  const setLoadedInvoices = (customerId: number, list: InvoiceRow[]) =>
    update(customerId, (row) =>
      row.invoiceList.length || !list.length
        ? row
        : { ...row, invoiceList: list },
    );

  const invoiceWarning = rows.some((row) => {
    const invoiceSum = Object.values(row.invoices).reduce(
      (total, amount) => total + (Number(amount) || 0),
      0,
    );
    return invoiceSum - (Number(row.amount) || 0) > 0.001;
  });

  const submit = () => {
    if (!balanced || invoiceWarning) return;
    post.mutate(
      {
        id,
        allocations: paying.map((row) => ({
          customerId: row.customerId,
          amount: Number(row.amount),
          invoices: Object.entries(row.invoices)
            .map(([invoiceId, amount]) => ({
              invoiceId: Number(invoiceId),
              amount: Number(amount) || 0,
            }))
            .filter((invoice) => invoice.amount > 0),
        })),
      },
      { onSuccess: onClose },
    );
  };

  const reported = Number(receipt?.amount || 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-16"
      onMouseDown={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Phân bổ &amp; lập phiếu thu
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Báo đơn: {formatCurrency(reported)} · Kế toán kho xác nhận:{" "}
              <b className="text-gray-800">{formatCurrency(target)}</b>
              {receipt?.branch?.name ? ` · ${receipt.branch.name}` : ""}
            </p>
            {receipt && reported !== target && (
              <p className="mt-0.5 text-xs text-red-600">
                {reported > target
                  ? `Thiếu ${formatCurrency(reported - target)} so với báo đơn: phần này vẫn là công nợ hóa đơn.`
                  : `Dư ${formatCurrency(target - reported)} so với báo đơn.`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
          {detail.isLoading && (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {receipt && !(target > 0) && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Kế toán kho chưa xác nhận số tiền thực nhận, chưa lập được phiếu
              thu.
            </p>
          )}
          {rows.map((row) => (
            <WarehouseCustomerInvoiceAllocator
              key={row.customerId}
              row={row}
              onAmountChange={(digits) => setAmount(row.customerId, digits)}
              onInvoiceAmountChange={(invoiceId, digits) =>
                setInvoiceAmount(row.customerId, invoiceId, digits)
              }
              onToggleOther={() => toggleOther(row.customerId)}
              onRemove={
                row.added ? () => removeCustomer(row.customerId) : undefined
              }
              onInvoicesLoaded={(list) =>
                setLoadedInvoices(row.customerId, list)
              }
            />
          ))}
          {receipt && target > 0 && (
            <AddCustomerButton
              excludeIds={rows.map((row) => row.customerId)}
              remaining={Math.max(0, diff)}
              onAdd={addCustomers}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              Tổng phân bổ:{" "}
              <b className={balanced ? "text-brand" : "text-red-600"}>
                {formatCurrency(sum)}
              </b>{" "}
              / {formatCurrency(target)}
            </span>
            {!balanced && target > 0 && diff !== 0 && (
              <span className="text-xs text-red-600">
                {diff > 0
                  ? `Còn thiếu ${formatCurrency(diff)}`
                  : `Vượt ${formatCurrency(-diff)}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!balanced || invoiceWarning || post.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              {post.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {paying.length
                ? `Tạo ${paying.length} phiếu thu`
                : "Tạo phiếu thu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PickedCustomer = { id: number; name: string; code?: string | null };

/** Nút "Thêm khách" mở cửa sổ chọn khách như Biến động số dư. */
function AddCustomerButton({
  excludeIds,
  remaining,
  onAdd,
}: {
  excludeIds: number[];
  remaining: number;
  onAdd: (customers: PickedCustomer[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand">
        <UserPlus className="h-4 w-4" />
        Thêm khách ngoài báo đơn
      </button>
      {open && (
        <CustomerPickerModal
          excludeIds={excludeIds}
          remaining={remaining}
          onConfirm={(customers) => {
            onAdd(customers);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Chọn khách (tài xế thu hộ nợ cũ của khách khác), cùng kiểu cửa sổ chọn khách
 * của Biến động số dư: tìm, tick nhiều khách, xem nợ hiện tại.
 */
function CustomerPickerModal({
  excludeIds,
  remaining,
  onConfirm,
  onClose,
}: {
  excludeIds: number[];
  remaining: number;
  onConfirm: (customers: PickedCustomer[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<PickedCustomer[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isFetching } = useSearchCustomers(debounced || undefined, {
    enabled: debounced.length > 0,
  });
  const customers = (
    (data?.data || []) as Array<{
      id: number;
      code: string;
      name: string;
      contactNumber?: string | null;
      totalDebt?: number | string;
    }>
  ).filter((customer) => !excludeIds.includes(customer.id));

  const toggle = (customer: PickedCustomer) =>
    setPicked((current) =>
      current.some((item) => item.id === customer.id)
        ? current.filter((item) => item.id !== customer.id)
        : [...current, customer],
    );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center whitespace-normal bg-black/40 p-4 pt-24"
      onMouseDown={onClose}>
      <div
        className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800">
              Thêm khách ngoài báo đơn
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Còn cần phân bổ: <b>{formatCurrency(remaining)}</b>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b px-5 py-2">
            {picked.map((customer) => (
              <span
                key={customer.id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-xs text-brand">
                {customer.name}
                <button
                  type="button"
                  onClick={() => toggle(customer)}
                  className="hover:text-brand-dark">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã hoặc tên khách hàng..."
              className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isFetching ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
              Đang tìm...
            </div>
          ) : customers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {debounced
                ? "Không tìm thấy khách hàng"
                : "Nhập mã hoặc tên để tìm khách hàng"}
            </div>
          ) : (
            customers.map((customer) => {
              const isPicked = picked.some((item) => item.id === customer.id);
              const debt = Number(customer.totalDebt || 0);
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() =>
                    toggle({
                      id: customer.id,
                      code: customer.code,
                      name: customer.name,
                    })
                  }
                  className={`flex w-full items-center justify-between gap-3 border-b px-5 py-3 text-left transition-colors last:border-0 ${
                    isPicked ? "bg-brand-soft" : "hover:bg-gray-50"
                  }`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isPicked ? "border-brand bg-brand" : "border-gray-300"
                      }`}>
                      {isPicked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800">
                        {customer.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {customer.code}
                        {customer.contactNumber
                          ? ` - ${customer.contactNumber}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  {debt > 0 && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-red-600">
                      Nợ: {formatCurrency(debt)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            disabled={picked.length === 0}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            Thêm {picked.length > 0 ? `(${picked.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarehouseCustomerInvoiceAllocator({
  row,
  onAmountChange,
  onInvoiceAmountChange,
  onToggleOther,
  onRemove,
  onInvoicesLoaded,
}: {
  row: AllocRow;
  onAmountChange: (digits: string) => void;
  onInvoiceAmountChange: (invoiceId: number, digits: string) => void;
  onToggleOther: () => void;
  onRemove?: () => void;
  onInvoicesLoaded: (list: InvoiceRow[]) => void;
}) {
  const { data: customer, isLoading: isCustomerLoading } = useCustomer(
    row.customerId,
  );
  // Khách thêm ngoài báo đơn: tải hóa đơn còn nợ như Biến động số dư.
  const unpaid = useUnpaidInvoices(row.customerId, row.added);
  const loadedKey = unpaid.invoices.map((invoice) => invoice.id).join(",");
  useEffect(() => {
    if (!row.added || !unpaid.invoices.length) return;
    onInvoicesLoaded(
      unpaid.invoices.map((invoice) => ({
        id: invoice.id,
        code: invoice.code,
        debt: Math.max(0, Number(invoice.debtAmount || 0)),
        purchaseDate: invoice.purchaseDate,
        inPackingSlip: false,
      })),
    );
    // Chỉ chạy khi danh sách hóa đơn tải về đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.added, loadedKey]);

  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePageSize = 6;
  const shown = visibleInvoices(row);
  const otherCount = row.invoiceList.filter(
    (invoice) => !invoice.inPackingSlip,
  ).length;
  const hasLinked = row.invoiceList.some((invoice) => invoice.inPackingSlip);
  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(shown.length / invoicePageSize),
  );
  const visibleInvoicePage = Math.min(invoicePage, invoiceTotalPages);
  const pagedInvoices = shown.slice(
    (visibleInvoicePage - 1) * invoicePageSize,
    visibleInvoicePage * invoicePageSize,
  );
  const allocated = Number(row.amount) || 0;
  const invoiceSum = Object.values(row.invoices).reduce(
    (total, amount) => total + (Number(amount) || 0),
    0,
  );
  const credit = Math.max(0, allocated - invoiceSum);
  const loadingInvoices = row.added && unpaid.isLoading;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            {row.name}
            {row.added && (
              <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                Ngoài báo đơn
              </span>
            )}
          </div>
          {row.code && <div className="text-xs text-gray-500">{row.code}</div>}
          <div className="mt-0.5 text-xs text-gray-500">
            {isCustomerLoading ? (
              "Đang tải công nợ..."
            ) : (
              <>
                Nợ hiện tại:{" "}
                <span
                  className={
                    Number(customer?.totalDebt || 0) > 0
                      ? "font-semibold text-red-600"
                      : "font-semibold text-gray-700"
                  }>
                  {formatCurrency(Number(customer?.totalDebt || 0))}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label
            className="text-sm text-gray-500"
            htmlFor={`warehouse-amount-${row.customerId}`}>
            Số tiền thu
          </label>
          <input
            id={`warehouse-amount-${row.customerId}`}
            inputMode="numeric"
            value={row.amount ? formatNumberInput(row.amount) : ""}
            onChange={(event) =>
              onAmountChange(event.target.value.replace(/\D/g, ""))
            }
            placeholder="0"
            className="dt-input w-36 rounded-lg text-right"
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Bỏ khách này"
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loadingInvoices ? (
        <div className="flex justify-center py-3 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : !row.invoiceList.length ? (
        <div className="text-xs text-gray-500">
          Khách không còn hóa đơn nợ; toàn bộ tiền sẽ ghi nhận thành credit.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2.5 py-2 text-left font-medium text-gray-500">
                  Mã hóa đơn
                </th>
                <th className="px-2.5 py-2 text-left font-medium text-gray-500">
                  Ngày
                </th>
                <th className="px-2.5 py-2 text-right font-medium text-gray-500">
                  Còn cần thu
                </th>
                <th className="px-2.5 py-2 text-right font-medium text-gray-500">
                  Tiền thu
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="px-2.5 py-1.5 font-medium text-brand">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{invoice.code}</span>
                      {invoice.inPackingSlip && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          Phiếu giao hàng
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-gray-600">
                    {invoice.purchaseDate
                      ? new Date(invoice.purchaseDate).toLocaleDateString(
                          "vi-VN",
                        )
                      : "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-right text-red-600 dt-mono">
                    {formatCurrency(invoice.debt)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right">
                    <input
                      inputMode="numeric"
                      value={
                        row.invoices[invoice.id]
                          ? formatNumberInput(row.invoices[invoice.id])
                          : ""
                      }
                      onChange={(event) =>
                        onInvoiceAmountChange(
                          invoice.id,
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                      placeholder="0"
                      aria-label={`Tiền thu hóa đơn ${invoice.code}`}
                      className="dt-input w-28 rounded-lg text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoiceTotalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-2.5 py-2 text-xs">
              <span className="text-gray-500">
                {shown.length} hóa đơn • Trang {visibleInvoicePage}/
                {invoiceTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setInvoicePage((current) => Math.max(1, current - 1))
                  }
                  disabled={visibleInvoicePage <= 1}
                  title="Trang trước"
                  aria-label="Trang hóa đơn trước"
                  className="rounded border p-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInvoicePage((current) =>
                      Math.min(invoiceTotalPages, current + 1),
                    )
                  }
                  disabled={visibleInvoicePage >= invoiceTotalPages}
                  title="Trang sau"
                  aria-label="Trang hóa đơn sau"
                  className="rounded border p-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">
            Đã gắn hóa đơn:{" "}
            <b className="text-gray-700">{formatCurrency(invoiceSum)}</b> /{" "}
            {formatCurrency(allocated)}
          </span>
          {hasLinked && otherCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setInvoicePage(1);
                onToggleOther();
              }}
              className="rounded-md border px-2 py-1 font-medium text-gray-700 hover:border-brand hover:text-brand">
              {row.showOther
                ? "Ẩn hóa đơn khác"
                : `Hóa đơn khác (${otherCount})`}
            </button>
          )}
        </div>
        {credit > 0 && (
          <span className="text-amber-600">
            Dư {formatCurrency(credit)} → ghi nhận credit
          </span>
        )}
      </div>
    </section>
  );
}
