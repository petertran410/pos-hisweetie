"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import type { Invoice } from "@/lib/types/invoice";
import { useMergeInvoices } from "@/lib/hooks/useInvoices";

interface Props {
  invoices: Invoice[];
  onClose: () => void;
  onSuccess: () => void;
}

const money = (value: number) => Number(value || 0).toLocaleString("vi-VN");

export function MergeInvoicesModal({ invoices, onClose, onSuccess }: Props) {
  const merge = useMergeInvoices();
  const [representativeId, setRepresentativeId] = useState(invoices[0]?.id);
  const ordered = useMemo(
    () =>
      [...invoices].sort(
        (a, b) =>
          new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime() ||
          a.id - b.id,
      ),
    [invoices],
  );
  const notes = ordered.filter((invoice) => invoice.description?.trim());
  const description = [
    `Hóa đơn được gộp từ: ${ordered.map((invoice) => invoice.code).join(", ")}`,
    ...(notes.length
      ? [
          [
            "Ghi chú hóa đơn gốc:",
            ...notes.map(
              (invoice) => `- ${invoice.code}: ${invoice.description!.trim()}`,
            ),
          ].join("\n"),
        ]
      : []),
  ].join("\n\n");
  const total = ordered.reduce(
    (sum, invoice) => sum + Number(invoice.grandTotal || 0),
    0,
  );
  const paid = ordered.reduce(
    (sum, invoice) => sum + Number(invoice.paidAmount || 0),
    0,
  );

  const handleSubmit = async () => {
    await merge.mutateAsync({
      sourceInvoiceIds: ordered.map((invoice) => invoice.id),
      representativeInvoiceId: representativeId,
      idempotencyKey: `invoice-merge-${ordered
        .map((invoice) => invoice.id)
        .sort((a, b) => a - b)
        .join("-")}`,
    });
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gộp hóa đơn</h2>
            <p className="mt-1 text-sm text-gray-500">
              Chọn hóa đơn đại diện để lấy thông tin đầu phiếu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="w-12 px-3 py-2" />
                  <th className="px-3 py-2">Mã hóa đơn</th>
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Khách hàng</th>
                  <th className="px-3 py-2">Điện thoại</th>
                  <th className="px-3 py-2">Địa chỉ</th>
                  <th className="px-3 py-2 text-right">Khách cần trả</th>
                  <th className="px-3 py-2 text-right">Khách đã trả</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={
                      invoice.id === representativeId ? "bg-blue-50" : "border-t"
                    }>
                    <td className="px-3 py-3">
                      <input
                        type="radio"
                        name="representativeInvoice"
                        checked={invoice.id === representativeId}
                        onChange={() => setRepresentativeId(invoice.id)}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-blue-600">
                      {invoice.code}
                    </td>
                    <td className="px-3 py-3">
                      {new Date(invoice.purchaseDate).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3">
                      {invoice.customer?.code ? (
                        <Link
                          href={`/khach-hang?Code=${invoice.customer.code}`}
                          className="text-blue-600 hover:underline"
                          target="_blank">
                          {invoice.customer.name || invoice.customer.code}
                        </Link>
                      ) : (
                        invoice.customer?.name || "Khách vãng lai"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {invoice.customer?.contactNumber || "-"}
                    </td>
                    <td className="px-3 py-3 max-w-[200px] truncate">
                      {invoice.customer?.addresses?.[0]?.address ||
                        invoice.delivery?.address ||
                        "-"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {money(invoice.debtAmount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {money(invoice.paidAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Tổng hóa đơn</div>
              <div className="mt-1 font-semibold">{money(total)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Đã thanh toán</div>
              <div className="mt-1 font-semibold">{money(paid)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Số hóa đơn</div>
              <div className="mt-1 font-semibold">{ordered.length}</div>
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Ghi chú hóa đơn mới
          </label>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 text-sm leading-6 text-gray-700">
            {description}
          </pre>
          <p className="mt-3 text-xs text-amber-700">
            Các phiếu giao hàng, đóng hàng và loading đang hiệu lực sẽ được chuyển
            sang hóa đơn mới và khử trùng lặp. Phiếu đã hủy được giữ nguyên lịch sử
            ở hóa đơn gốc.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            onClick={onClose}
            disabled={merge.isPending}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={merge.isPending || !representativeId}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            {merge.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
