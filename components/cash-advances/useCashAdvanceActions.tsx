"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";
import {
  cashAdvancesApi,
  type CashAdvance,
  type CashAdvanceExpenseRow,
} from "@/lib/api/cash-advances";
import {
  useCancelCashAdvance,
  useConfirmCashAdvance,
  useReleaseAdvanceExpense,
  useUploadSignedCashAdvance,
} from "@/lib/hooks/useCashAdvances";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useAuthStore } from "@/lib/store/auth";
import { useVoucherPrint } from "@/lib/cash-advances/useVoucherPrint";
import { isPostedAdvance } from "@/lib/cash-advances/display";
import { formatCurrency } from "@/lib/utils";
import { CashAdvanceForm } from "./CashAdvanceForm";
import { SignedVoucherUploadModal } from "./SignedVoucherUploadModal";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] || char,
  );

/**
 * Thao tác trên phiếu tạm ứng dùng chung cho bảng (máy tính) và thẻ (điện
 * thoại): in, sửa phiếu tạm, xác nhận giao tiền, upload phiếu đã ký, hủy,
 * tạo hoàn ứng, bỏ Đã chi phiếu chi kho đã chi từ tạm ứng.
 */
export function useCashAdvanceActions() {
  const router = useRouter();
  const access = useFinanceAccess();
  const userId = useAuthStore((state) => state.user?.id);
  const voucher = useVoucherPrint();
  const confirm = useConfirmCashAdvance();
  const cancel = useCancelCashAdvance();
  const upload = useUploadSignedCashAdvance();
  const release = useReleaseAdvanceExpense();
  const [editing, setEditing] = useState<CashAdvance | null>(null);
  const [signing, setSigning] = useState<CashAdvance | null>(null);
  const can = (action: string, branchId: number) =>
    access.can("cash_advance", action, branchId);

  const rules = {
    canEdit: (row: CashAdvance) =>
      row.status === "DRAFT" &&
      (can("update", row.branchId) ||
        (row.createdBy === userId && can("create", row.branchId))),
    canConfirm: (row: CashAdvance) =>
      row.status === "DRAFT" && can("confirm", row.branchId),
    canUploadSigned: (row: CashAdvance) =>
      isPostedAdvance(row.status) &&
      (access.superAdmin ||
        row.recipientId === userId ||
        row.createdBy === userId),
    canCancel: (row: CashAdvance) =>
      row.status !== "CANCELLED" &&
      (can("cancel", row.branchId) ||
        (row.status === "DRAFT" &&
          row.createdBy === userId &&
          can("create", row.branchId))),
    canRefund: (row: CashAdvance) =>
      isPostedAdvance(row.status) &&
      row.usage.maxRefund > 0 &&
      access.can("cash_advance_refund", "create", row.branchId),
    canReleaseExpense: (branchId: number) =>
      access.can("internal_fund", "cancel", branchId),
  };

  const handleConfirm = async (row: CashAdvance) => {
    let balanceText = "";
    try {
      const balance = await cashAdvancesApi.fundBalance(row.branchId);
      balanceText =
        balance.closing < row.amount
          ? `<p class="mt-2 text-sm font-medium text-red-600">Quỹ kho hiện còn ${formatCurrency(balance.closing)} đ, ít hơn số tạm ứng.</p>`
          : `<p class="mt-2 text-xs text-gray-500">Quỹ kho hiện còn ${formatCurrency(balance.closing)} đ.</p>`;
    } catch {
      // Không xem được số dư quỹ thì vẫn cho xác nhận.
    }
    const result = await Swal.fire({
      title: "Xác nhận giao tiền tạm ứng?",
      html: `<p class="text-sm text-gray-600">Giao <strong>${formatCurrency(row.amount)} đ</strong> cho <strong>${escape(row.recipient.name)}</strong> và trừ quỹ <strong>${escape(row.branch?.name || "")}</strong>. Sau đó cần upload phiếu tạm ứng đã ký.</p>${balanceText}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận giao tiền",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "#0f766e",
    });
    if (result.isConfirmed) confirm.mutate(row.id);
  };

  const handleCancel = async (row: CashAdvance) => {
    const result = await Swal.fire({
      title: "Hủy phiếu tạm ứng",
      html: `<p class="text-sm text-gray-600">Hủy phiếu <strong>${row.code}</strong> (${formatCurrency(row.amount)} đ).${
        isPostedAdvance(row.status)
          ? " Tiền tạm ứng được ghi trả lại quỹ kho."
          : ""
      } Phiếu đã hủy vẫn được giữ lại để tra cứu.</p>`,
      input: "textarea",
      inputPlaceholder: "Lý do hủy phiếu",
      inputAttributes: { maxlength: "500" },
      inputValidator: (value) =>
        value?.trim() ? undefined : "Cần nhập lý do hủy",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed)
      cancel.mutate({ id: row.id, reason: String(result.value).trim() });
  };

  const handleRelease = async (entry: CashAdvanceExpenseRow) => {
    const result = await Swal.fire({
      title: "Bỏ Đã chi phiếu chi kho",
      html: `<p class="text-sm text-gray-600">Phiếu <strong>${entry.code}</strong> trở về Chưa chi, phần đã chi từ tạm ứng được trả lại tạm ứng. Phần đã trừ quỹ (nếu có) cũng được hủy.</p>`,
      input: "textarea",
      inputPlaceholder: "Lý do",
      inputValidator: (value) => (value?.trim() ? undefined : "Cần nhập lý do"),
      showCancelButton: true,
      confirmButtonText: "Bỏ Đã chi",
      cancelButtonText: "Không",
      confirmButtonColor: "#dc2626",
    });
    if (result.isConfirmed)
      release.mutate({
        entryId: entry.id,
        reason: String(result.value).trim(),
      });
  };

  const elements = (
    <>
      {editing && (
        <CashAdvanceForm
          branchId={editing.branchId}
          advance={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {signing && (
        <SignedVoucherUploadModal
          title={`Phiếu tạm ứng đã ký · ${signing.code}`}
          pending={upload.isPending}
          onClose={() => setSigning(null)}
          onSubmit={(attachments) =>
            upload.mutate(
              { id: signing.id, attachments },
              { onSuccess: () => setSigning(null) },
            )
          }
        />
      )}
      {voucher.modal}
    </>
  );

  return {
    ...rules,
    busy:
      confirm.isPending || cancel.isPending || release.isPending ? true : false,
    print: (row: { id: number }) => voucher.print("cash_advance", row.id),
    printById: (id: number) => voucher.print("cash_advance", id),
    edit: setEditing,
    confirm: (row: CashAdvance) => void handleConfirm(row),
    uploadSigned: setSigning,
    cancel: (row: CashAdvance) => void handleCancel(row),
    createRefund: (row: CashAdvance) =>
      router.push(`/tai-chinh/hoan-ung?advanceId=${row.id}`),
    releaseExpense: (entry: CashAdvanceExpenseRow) => void handleRelease(entry),
    elements,
  };
}

export type CashAdvanceActions = ReturnType<typeof useCashAdvanceActions>;
