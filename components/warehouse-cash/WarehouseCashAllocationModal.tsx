"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { formatCurrency, formatNumberInput } from "@/lib/utils";
import {
  usePostWarehouseReceipt,
  useWarehouseReceipt,
} from "@/lib/hooks/useInternalFinance";
import { useCustomer } from "@/lib/hooks/useCustomers";

type InvoiceRow = {
  id: number;
  code: string;
  debt: number;
  purchaseDate?: string;
  isLinkedToReceipt: boolean;
};

type AllocRow = {
  customerId: number;
  name: string;
  code?: string | null;
  amount: string;
  invoices: Record<number, string>;
  invoiceList: InvoiceRow[];
};

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
  const initialRows = useMemo<AllocRow[]>(() => {
    if (!receipt) return [];
    const customers = receipt.customers?.length
      ? receipt.customers
      : receipt.customer
        ? [receipt.customer]
        : [];
    const total = Number(receipt.amount);
    const preferred = new Set((receipt.invoiceLinks || []).map((link) => link.invoice.id));
    return customers.map((customer) => {
      const source = receipt.allocatableInvoices?.length
        ? receipt.allocatableInvoices
        : (receipt.invoiceLinks || []).map((link) => link.invoice);
      const invoiceList = source
        .filter((invoice) => Number(invoice.customerId) === customer.id)
        .sort((a, b) => {
          const rank = (invoiceId: number) => (preferred.has(invoiceId) ? 0 : 1);
          const rankDiff = rank(a.id) - rank(b.id);
          if (rankDiff) return rankDiff;
          const aDate = new Date(a.purchaseDate || 0).getTime();
          const bDate = new Date(b.purchaseDate || 0).getTime();
          return aDate - bDate || a.id - b.id;
        })
        .map((invoice) => ({
          id: invoice.id,
          code: invoice.code,
          debt: Math.max(0, Number(invoice.debtAmount || 0)),
          purchaseDate: invoice.purchaseDate,
          isLinkedToReceipt: preferred.has(invoice.id),
        }));
      const amount = customers.length === 1 ? total : 0;
      return {
        customerId: customer.id,
        name: customer.name,
        code: customer.code,
        amount: amount ? String(amount) : "",
        invoices: customers.length === 1 ? suggestInvoices(invoiceList, amount) : {},
        invoiceList,
      };
    });
  }, [receipt]);
  const [draft, setDraft] = useState<AllocRow[] | null>(null);
  const rows = draft || initialRows;

  const target = Number(receipt?.amount || 0);
  const sum = (rows || []).reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const diff = Math.round((target - sum) * 100) / 100;
  const balanced = diff === 0 && (rows || []).every((row) => Number(row.amount) > 0);

  const setAmount = (customerId: number, digits: string) => {
    setDraft((current) =>
      (current || rows).map((row) => {
        if (row.customerId !== customerId) return row;
        const other = (current || rows).reduce(
          (total, item) =>
            item.customerId === customerId ? total : total + (Number(item.amount) || 0),
          0,
        );
        let value = digits === "" ? 0 : Number(digits);
        value = Math.min(Math.max(0, value), Math.max(0, target - other));
        return {
          ...row,
          amount: digits === "" ? "" : String(value),
          invoices: suggestInvoices(row.invoiceList, value),
        };
      }),
    );
  };

  const setInvoiceAmount = (customerId: number, invoiceId: number, digits: string) => {
    setDraft((current) =>
      (current || rows).map((row) => {
        if (row.customerId !== customerId) return row;
        const invoice = row.invoiceList.find((item) => item.id === invoiceId);
        const customerAmount = Number(row.amount) || 0;
        const other = Object.entries(row.invoices).reduce(
          (total, [id, amount]) =>
            Number(id) === invoiceId ? total : total + (Number(amount) || 0),
          0,
        );
        let value = digits === "" ? 0 : Number(digits);
        value = Math.min(value, invoice?.debt || 0, Math.max(0, customerAmount - other));
        value = Math.max(0, value);
        return {
          ...row,
          invoices: {
            ...row.invoices,
            [invoiceId]: digits === "" ? "" : String(value),
          },
        };
      }),
    );
  };

  const invoiceWarning = useMemo(() => {
    return (rows || []).some((row) => {
      const invoiceSum = Object.values(row.invoices).reduce(
        (total, amount) => total + (Number(amount) || 0),
        0,
      );
      return invoiceSum - (Number(row.amount) || 0) > 0.001;
    });
  }, [rows]);

  const submit = () => {
    if (!rows || !balanced || invoiceWarning) return;
    post.mutate(
      {
        id,
        allocations: rows.map((row) => ({
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
              Số tiền mặt: <b>{formatCurrency(target)}</b>
              {receipt?.branch?.name ? ` · ${receipt.branch.name}` : ""}
            </p>
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
          {!detail.isLoading && !rows?.length && (
            <p className="text-sm text-gray-500">Phiếu này chưa có khách hàng.</p>
          )}
          {rows?.map((row) => (
            <WarehouseCustomerInvoiceAllocator
              key={row.customerId}
              row={row}
              onAmountChange={(digits) => setAmount(row.customerId, digits)}
              onInvoiceAmountChange={(invoiceId, digits) =>
                setInvoiceAmount(row.customerId, invoiceId, digits)
              }
            />
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              Tổng phân bổ:{" "}
              <b className={balanced ? "text-brand" : "text-red-600"}>
                {formatCurrency(sum)}
              </b>{" "}
              / {formatCurrency(target)}
            </span>
            {!balanced && (
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
              disabled={!balanced || invoiceWarning || post.isPending || !rows?.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              {post.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {rows?.length ? `Tạo ${rows.length} phiếu thu` : "Tạo phiếu thu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarehouseCustomerInvoiceAllocator({
  row,
  onAmountChange,
  onInvoiceAmountChange,
}: {
  row: AllocRow;
  onAmountChange: (digits: string) => void;
  onInvoiceAmountChange: (invoiceId: number, digits: string) => void;
}) {
  const { data: customer, isLoading: isCustomerLoading } = useCustomer(row.customerId);
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePageSize = 6;
  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(row.invoiceList.length / invoicePageSize),
  );
  const visibleInvoicePage = Math.min(invoicePage, invoiceTotalPages);
  const pagedInvoices = row.invoiceList.slice(
    (visibleInvoicePage - 1) * invoicePageSize,
    visibleInvoicePage * invoicePageSize,
  );
  const allocated = Number(row.amount) || 0;
  const invoiceSum = Object.values(row.invoices).reduce(
    (total, amount) => total + (Number(amount) || 0),
    0,
  );
  const credit = Math.max(0, allocated - invoiceSum);

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
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
          <label className="text-sm text-gray-500" htmlFor={`warehouse-amount-${row.customerId}`}>
            Số tiền thu
          </label>
          <input
            id={`warehouse-amount-${row.customerId}`}
            inputMode="numeric"
            value={row.amount ? formatNumberInput(row.amount) : ""}
            onChange={(event) => onAmountChange(event.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="dt-input w-36 rounded-lg text-right"
          />
        </div>
      </div>

      {!row.invoiceList.length ? (
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
                      {invoice.isLinkedToReceipt && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          Phiếu giao hàng
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-gray-600">
                    {invoice.purchaseDate
                      ? new Date(invoice.purchaseDate).toLocaleDateString("vi-VN")
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
                {row.invoiceList.length} hóa đơn • Trang {visibleInvoicePage}/
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
        <span className="text-gray-500">
          Đã gắn hóa đơn:{" "}
          <b className="text-gray-700">{formatCurrency(invoiceSum)}</b> /{" "}
          {formatCurrency(allocated)}
        </span>
        {credit > 0 && (
          <span className="text-amber-600">
            Dư {formatCurrency(credit)} → ghi nhận credit
          </span>
        )}
      </div>
    </section>
  );
}
