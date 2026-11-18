"use client";

import { Loader2, Undo2, Wallet } from "lucide-react";
import Swal from "sweetalert2";
import type { SepayTransaction } from "@/lib/api/sepay";
import type { VpsgCashAccess, VpsgCashRecord } from "@/lib/api/vpsg-cash";
import { useCancelVpsgCash, useRecordVpsgCash } from "@/lib/hooks/useVpsgCash";
import { formatCurrency } from "@/lib/utils";

/**
 * Giao dịch của tài khoản quỹ tiền mặt VPSG (đánh dấu ở Cài đặt › Sổ quỹ).
 * Cùng cách khớp với bộ lọc tài khoản: qua tài khoản ảo thì `subAccount`.
 */
export function isVpsgTransaction(
  tx: Pick<SepayTransaction, "accountNumber" | "subAccount">,
  accountNumbers: string[],
) {
  if (!accountNumbers.length) return false;
  if (tx.subAccount) return accountNumbers.includes(tx.subAccount);
  return Boolean(tx.accountNumber && accountNumbers.includes(tx.accountNumber));
}

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

/** Trạng thái của giao dịch VPSG: thay cho trạng thái luồng khách hàng. */
export function VpsgFundStatus({ record }: { record?: VpsgCashRecord }) {
  return record ? (
    <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Đã ghi quỹ VPSG
    </span>
  ) : (
    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      Chưa ghi quỹ VPSG
    </span>
  );
}

/** Nút ghi tiền vào quỹ nội bộ VPSG (không tạo phiếu thu, không phải tiền khách). */
export function VpsgFundAction({
  tx,
  record,
  access,
}: {
  tx: SepayTransaction;
  record?: VpsgCashRecord;
  access: VpsgCashAccess;
}) {
  const recordMut = useRecordVpsgCash();
  const cancelMut = useCancelVpsgCash();
  const amount = Number(tx.amountIn);
  const beforeStart =
    !!tx.transactionDate &&
    new Date(tx.transactionDate) < new Date(access.fundStart);

  const handleRecord = async () => {
    const result = await Swal.fire({
      title: "Ghi vào quỹ tiền mặt VPSG?",
      html: `<p class="text-sm text-gray-600">Thêm dòng THU <strong>${formatCurrency(amount)}</strong> vào sổ quỹ nội bộ VPSG. Không tạo phiếu thu khách hàng.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ghi vào quỹ",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "#0f766e",
    });
    if (result.isConfirmed) recordMut.mutate(tx.id);
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: "Hủy ghi quỹ VPSG",
      html: `<p class="text-sm text-gray-600">Bỏ dòng THU <strong>${formatCurrency(amount)}</strong> khỏi sổ quỹ VPSG. Có thể ghi lại sau.</p>`,
      input: "textarea",
      inputPlaceholder: "Lý do hủy",
      inputAttributes: { maxlength: "500" },
      inputValidator: (value) =>
        value?.trim() ? undefined : "Cần nhập lý do hủy",
      showCancelButton: true,
      confirmButtonText: "Hủy ghi quỹ",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed)
      cancelMut.mutate({ id: tx.id, reason: String(result.value).trim() });
  };

  if (record)
    return (
      <div className="flex flex-col items-end gap-0.5 text-xs leading-tight text-gray-500">
        <span
          className="whitespace-nowrap"
          title={record.recordedBy?.name || undefined}>
          Đã ghi {dateLabel(record.recordedAt)}
          {record.recordedBy?.name ? ` · ${record.recordedBy.name}` : ""}
        </span>
        {access.canCancel && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelMut.isPending}
            className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50">
            {cancelMut.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Undo2 className="h-3 w-3" />
            )}
            Hủy ghi quỹ
          </button>
        )}
      </div>
    );

  if (beforeStart)
    return (
      <span className="whitespace-nowrap text-xs text-gray-400">
        Trước ngày quỹ lên POS
      </span>
    );

  if (!access.canRecord) return <span className="text-gray-400">-</span>;

  return (
    <button
      type="button"
      onClick={() => void handleRecord()}
      disabled={recordMut.isPending}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50">
      {recordMut.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wallet className="h-3.5 w-3.5" />
      )}
      Ghi vào quỹ VPSG
    </button>
  );
}
