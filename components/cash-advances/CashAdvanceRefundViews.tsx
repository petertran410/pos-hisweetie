"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import Swal from "sweetalert2";
import {
  Ban,
  ChevronDown,
  FileSignature,
  Loader2,
  Pencil,
  Printer,
  Wallet,
} from "lucide-react";
import {
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import type { CashAdvanceRefund } from "@/lib/api/cash-advances";
import {
  useCancelCashAdvanceRefund,
  useConfirmCashAdvanceRefund,
  useUploadSignedCashAdvanceRefund,
} from "@/lib/hooks/useCashAdvances";
import { formatVnDateTime } from "@/lib/internal-finance/dates";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { useAuthStore } from "@/lib/store/auth";
import { formatDateKey, isPostedAdvance } from "@/lib/cash-advances/display";
import { useVoucherPrint } from "@/lib/cash-advances/useVoucherPrint";
import { formatCurrency } from "@/lib/utils";
import { ActionButton, AttachmentStrip } from "./CashAdvanceDetail";
import { MobileDetailSheet } from "./CashAdvanceMobileList";
import { CashAdvanceRefundForm } from "./CashAdvanceRefundForm";
import { CashAdvanceStatusBadge } from "./CashAdvanceStatusBadge";
import { SignedVoucherUploadModal } from "./SignedVoucherUploadModal";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] || char,
  );

/** Thao tác trên phiếu hoàn ứng: cùng quy trình với phiếu tạm ứng. */
export function useRefundActions() {
  const access = useFinanceAccess();
  const userId = useAuthStore((state) => state.user?.id);
  const voucher = useVoucherPrint();
  const confirm = useConfirmCashAdvanceRefund();
  const cancel = useCancelCashAdvanceRefund();
  const upload = useUploadSignedCashAdvanceRefund();
  const [editing, setEditing] = useState<CashAdvanceRefund | null>(null);
  const [signing, setSigning] = useState<CashAdvanceRefund | null>(null);
  const can = (action: string, branchId: number) =>
    access.can("cash_advance_refund", action, branchId);

  const handleConfirm = async (row: CashAdvanceRefund) => {
    const result = await Swal.fire({
      title: "Xác nhận nhận tiền hoàn ứng?",
      html: `<p class="text-sm text-gray-600">Nhận <strong>${formatCurrency(row.amount)} đ</strong> từ <strong>${escape(row.refunder.name)}</strong> và cộng vào quỹ <strong>${escape(row.branch?.name || "")}</strong>. Sau đó cần upload phiếu hoàn ứng đã ký.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận nhận tiền",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "#0f766e",
    });
    if (result.isConfirmed) confirm.mutate(row.id);
  };

  const handleCancel = async (row: CashAdvanceRefund) => {
    const result = await Swal.fire({
      title: "Hủy phiếu hoàn ứng",
      html: `<p class="text-sm text-gray-600">Hủy phiếu <strong>${row.code}</strong> (${formatCurrency(row.amount)} đ).${
        isPostedAdvance(row.status)
          ? " Tiền hoàn ứng đã cộng quỹ sẽ được rút lại."
          : ""
      } Hủy xong, tạm ứng ${row.advance.code} lại cần làm hoàn ứng.</p>`,
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

  return {
    canEdit: (row: CashAdvanceRefund) =>
      row.status === "DRAFT" &&
      (can("update", row.branchId) ||
        (row.createdBy === userId && can("create", row.branchId))),
    canConfirm: (row: CashAdvanceRefund) =>
      row.status === "DRAFT" && can("confirm", row.branchId),
    canUploadSigned: (row: CashAdvanceRefund) =>
      isPostedAdvance(row.status) &&
      (access.superAdmin ||
        row.refunderId === userId ||
        row.createdBy === userId),
    canCancel: (row: CashAdvanceRefund) =>
      row.status !== "CANCELLED" &&
      (can("cancel", row.branchId) ||
        (row.status === "DRAFT" &&
          row.createdBy === userId &&
          can("create", row.branchId))),
    busy: confirm.isPending || cancel.isPending,
    print: (row: { id: number }) =>
      voucher.print("cash_advance_refund", row.id),
    edit: setEditing,
    confirm: (row: CashAdvanceRefund) => void handleConfirm(row),
    uploadSigned: setSigning,
    cancel: (row: CashAdvanceRefund) => void handleCancel(row),
    elements: (
      <>
        {editing && (
          <CashAdvanceRefundForm
            refund={editing}
            onClose={() => setEditing(null)}
          />
        )}
        {signing && (
          <SignedVoucherUploadModal
            title={`Phiếu hoàn ứng đã ký · ${signing.code}`}
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
    ),
  };
}

export type RefundActions = ReturnType<typeof useRefundActions>;

export function CashAdvanceRefundDetail({
  refund,
  actions,
}: {
  refund: CashAdvanceRefund;
  actions: RefundActions;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-sm">
          <div className="text-gray-700">{refund.description || "-"}</div>
          <div className="text-xs text-gray-500">
            Hoàn cho tạm ứng{" "}
            <Link
              href={`/tai-chinh/tam-ung?Code=${encodeURIComponent(refund.advance.code)}`}
              className="font-mono text-brand hover:underline">
              {refund.advance.code}
            </Link>{" "}
            ({formatCurrency(refund.advance.amount)} đ · kỳ{" "}
            {refund.advance.periodLabel})
          </div>
          <div className="text-xs text-gray-500">
            Tạo {formatVnDateTime(refund.createdAt)}
            {refund.creator?.name ? ` · ${refund.creator.name}` : ""}
            {refund.confirmedAt &&
              ` · Nhận tiền ${formatVnDateTime(refund.confirmedAt)}${
                refund.confirmer?.name ? ` · ${refund.confirmer.name}` : ""
              }`}
            {refund.completedAt &&
              ` · Hoàn thành ${formatVnDateTime(refund.completedAt)}`}
          </div>
          {refund.status === "CANCELLED" && (
            <div className="text-xs text-red-600">
              Đã hủy {formatVnDateTime(refund.cancelledAt)}
              {refund.cancelReason ? ` · ${refund.cancelReason}` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={<Printer className="h-4 w-4" />}
            onClick={() => actions.print(refund)}>
            In phiếu
          </ActionButton>
          {actions.canEdit(refund) && (
            <ActionButton
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => actions.edit(refund)}>
              Sửa
            </ActionButton>
          )}
          {actions.canConfirm(refund) && (
            <ActionButton
              tone="primary"
              disabled={actions.busy}
              icon={<Wallet className="h-4 w-4" />}
              onClick={() => actions.confirm(refund)}>
              Xác nhận nhận tiền
            </ActionButton>
          )}
          {actions.canUploadSigned(refund) && (
            <ActionButton
              tone={refund.status === "CONFIRMING" ? "primary" : "default"}
              icon={<FileSignature className="h-4 w-4" />}
              onClick={() => actions.uploadSigned(refund)}>
              {refund.status === "CONFIRMING"
                ? "Upload phiếu đã ký"
                : "Thêm phiếu đã ký"}
            </ActionButton>
          )}
          {actions.canCancel(refund) && (
            <ActionButton
              tone="danger"
              disabled={actions.busy}
              icon={<Ban className="h-4 w-4" />}
              onClick={() => actions.cancel(refund)}>
              Hủy phiếu
            </ActionButton>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <AttachmentStrip
          label="Chứng từ hoàn ứng"
          files={refund.attachments.filter((file) => file.kind !== "SIGNED")}
        />
        <AttachmentStrip
          label="Phiếu đã ký"
          files={refund.attachments.filter((file) => file.kind === "SIGNED")}
        />
      </div>
    </div>
  );
}

export function CashAdvanceRefundTable({
  rows,
  isLoading,
  total,
  actions,
  highlightId,
}: {
  rows: CashAdvanceRefund[];
  isLoading: boolean;
  total?: number;
  actions: RefundActions;
  highlightId?: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [seenHighlight, setSeenHighlight] = useState<number | undefined>();
  if (highlightId && highlightId !== seenHighlight) {
    setSeenHighlight(highlightId);
    setExpandedId(highlightId);
  }
  const headers = [
    "Mã",
    "Ngày hoàn ứng",
    "Kho",
    "Người hoàn ứng",
    "Tạm ứng",
    "Kỳ tạm ứng",
    "Số tiền",
    "Trạng thái",
    "Người tạo",
  ];
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            <th className="w-8 px-2 py-2.5" />
            {headers.map((label) => (
              <th
                key={label}
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                  label === "Số tiền" ? "text-right" : "text-left"
                }`}>
                {label}
              </th>
            ))}
          </tr>
          {total !== undefined && (
            <tr className="border-b bg-gray-50/60 text-xs font-semibold">
              <td colSpan={7} />
              <td className="px-3 py-1.5 text-right text-blue-700">
                {formatCurrency(total)}
              </td>
              <td colSpan={2} />
            </tr>
          )}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={headers.length + 1} className="p-10 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td
                colSpan={headers.length + 1}
                className="p-10 text-center text-gray-400">
                Chưa có phiếu hoàn ứng
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className={`cursor-pointer border-b hover:bg-gray-50 ${
                      expanded ? "bg-brand-soft/40" : ""
                    } ${row.status === "CANCELLED" ? "text-gray-400" : ""}`}>
                    <td className="px-2 py-2 text-gray-400">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold ${
                        row.status === "CANCELLED"
                          ? "line-through"
                          : "text-brand"
                      }`}>
                      {row.code}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDateKey(row.refundDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.branch?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {row.refunder.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {row.advance.code}
                    </td>
                    <td className="min-w-40 px-3 py-2 text-xs">
                      {row.advance.periodLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-blue-700">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <CashAdvanceStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.creator?.name || "-"}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b bg-gray-50/70">
                      <td colSpan={headers.length + 1} className="p-4">
                        <CashAdvanceRefundDetail
                          refund={row}
                          actions={actions}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CashAdvanceRefundMobileList({
  rows,
  isLoading,
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilter,
  total,
  page,
  totalPages,
  onPageChange,
  onCreate,
  actions,
}: {
  rows: CashAdvanceRefund[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
  total?: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  actions: RefundActions;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const open = rows.find((row) => row.id === openId);
  return (
    <>
      <FinanceMobileShell
        title="Hoàn ứng"
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Tìm mã, mã tạm ứng, người hoàn ứng..."
        activeFilterCount={activeFilterCount}
        onOpenFilter={onOpenFilter}
        summary={
          total !== undefined ? (
            <span className="text-xs">
              Tổng hoàn ứng{" "}
              <strong className="text-blue-700">{formatCurrency(total)}</strong>
            </span>
          ) : undefined
        }
        isLoading={isLoading}
        isEmpty={!rows.length}
        emptyText="Chưa có phiếu hoàn ứng"
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onCreate={onCreate}>
        {rows.map((row) => (
          <FinanceMobileCard
            key={row.id}
            code={row.code}
            muted={row.status === "CANCELLED"}
            badge={<CashAdvanceStatusBadge status={row.status} />}
            title={`${row.refunder.name} · tạm ứng ${row.advance.code}`}
            meta={
              <div>
                {row.branch?.name} · Ngày {formatDateKey(row.refundDate)}
              </div>
            }
            amount={formatCurrency(row.amount)}
            amountTone="positive"
            onClick={() => setOpenId(row.id)}
          />
        ))}
      </FinanceMobileShell>
      {open && (
        <MobileDetailSheet title={open.code} onClose={() => setOpenId(null)}>
          <CashAdvanceRefundDetail refund={open} actions={actions} />
        </MobileDetailSheet>
      )}
    </>
  );
}
