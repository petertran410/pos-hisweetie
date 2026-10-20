"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Ban,
  CheckCircle2,
  FileSignature,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Undo2,
  Wallet,
} from "lucide-react";
import type {
  CashAdvance,
  CashAdvanceAttachment,
  CashAdvanceDetail as Detail,
  CashAdvanceExpenseRow,
} from "@/lib/api/cash-advances";
import { useCashAdvance } from "@/lib/hooks/useCashAdvances";
import { formatVnDate, formatVnDateTime } from "@/lib/internal-finance/dates";
import {
  OUTSIDE_REASON_LABELS,
  formatDateKey,
  isPostedAdvance,
} from "@/lib/cash-advances/display";
import { formatCurrency } from "@/lib/utils";
import {
  CashAdvanceStatusBadge,
  RefundStateBadge,
} from "./CashAdvanceStatusBadge";
import type { CashAdvanceActions } from "./useCashAdvanceActions";

const money = (value: number) => `${formatCurrency(value)} đ`;

const isImage = (file: CashAdvanceAttachment) =>
  (file.fileType || "").startsWith("image/") ||
  /\.(avif|gif|jpe?g|png|webp|heic)$/i.test(file.fileUrl.split("?")[0]);

export function AttachmentStrip({
  label,
  files,
}: {
  label: string;
  files: CashAdvanceAttachment[];
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-500">{label}</div>
      {files.length ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <a
              key={`${file.id || ""}${file.fileUrl}`}
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={file.fileName || file.fileUrl}
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 hover:border-brand">
              {isImage(file) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.fileUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText className="h-6 w-6 text-gray-400" />
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400">Chưa có</div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-gray-900",
  hint,
}: {
  label: string;
  value: number;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2" title={hint}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold ${tone}`}>
        {money(value)}
      </div>
    </div>
  );
}

/** Thẻ đối chiếu: tạm ứng ↔ phiếu chi kho trong kỳ. */
export function UsageSummary({ advance }: { advance: CashAdvance }) {
  const { usage } = advance;
  const percent = usage.amount
    ? Math.min(100, Math.round((usage.used / usage.amount) * 100))
    : 0;
  const lockedPercent = usage.amount
    ? Math.min(100, Math.round((usage.locked / usage.amount) * 100))
    : 0;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Stat label="Tạm ứng" value={usage.amount} />
        <Stat
          label="Phiếu chi kho trong kỳ"
          value={advance.totalInPeriod}
          hint={`${advance.expenseCountInPeriod} phiếu của toàn kho trong kỳ`}
        />
        <Stat
          label="Đã dùng"
          value={usage.used}
          tone="text-red-600"
          hint={`Đã chi (chốt): ${formatCurrency(usage.locked)} · Dự kiến (chưa Đã chi): ${formatCurrency(usage.projected)}`}
        />
        <Stat label="Hoàn ứng" value={usage.refunded} tone="text-blue-700" />
        <Stat label="Còn lại" value={usage.remaining} tone="text-green-700" />
      </div>
      {isPostedAdvance(advance.status) && (
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="flex h-full" style={{ width: `${percent}%` }}>
            <div
              className="h-full bg-red-500"
              style={{
                width: percent ? `${(lockedPercent / percent) * 100}%` : 0,
              }}
            />
            <div className="h-full flex-1 bg-red-300" />
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseTable({
  title,
  rows,
  empty,
  extra,
  action,
}: {
  title: string;
  rows: Array<
    CashAdvanceExpenseRow & { reason?: string; advanceCodes?: string[] }
  >;
  empty: string;
  extra?: (
    row: CashAdvanceExpenseRow & { reason?: string; advanceCodes?: string[] },
  ) => ReactNode;
  action?: (row: CashAdvanceExpenseRow) => ReactNode;
}) {
  const total = rows.reduce((sum, row) => sum + row.allocated, 0);
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
        <span>
          {title} ({rows.length})
        </span>
        <span>{money(total)}</span>
      </div>
      {rows.length ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white text-gray-500">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">
                  Mã phiếu chi
                </th>
                <th className="px-3 py-1.5 text-left font-medium">Ngày</th>
                <th className="px-3 py-1.5 text-left font-medium">Nội dung</th>
                <th className="px-3 py-1.5 text-left font-medium">Người chi</th>
                <th className="px-3 py-1.5 text-right font-medium">Số tiền</th>
                {extra && <th className="px-3 py-1.5 text-left font-medium" />}
                {action && <th className="px-3 py-1.5" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.id}-${row.allocated}`} className="border-t">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono">
                    <Link
                      href={`/tai-chinh/phieu-chi-kho?Code=${encodeURIComponent(row.code)}`}
                      className="text-brand hover:underline">
                      {row.code}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {formatVnDate(row.occurredAt)}
                  </td>
                  <td className="max-w-72 px-3 py-1.5">
                    {row.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {row.payer?.name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium">
                    {formatCurrency(row.allocated)}
                    {row.allocated !== row.amount && (
                      <div className="text-[10px] font-normal text-gray-400">
                        / {formatCurrency(row.amount)}
                      </div>
                    )}
                  </td>
                  {extra && <td className="px-3 py-1.5">{extra(row)}</td>}
                  {action && (
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      {action(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-xs text-gray-400">
          {empty}
        </div>
      )}
    </div>
  );
}

export function ActionButton({
  onClick,
  icon,
  children,
  tone = "default",
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
}) {
  const style =
    tone === "primary"
      ? "border-brand bg-brand text-white hover:bg-brand-dark"
      : tone === "danger"
        ? "border-red-200 text-red-600 hover:bg-red-50"
        : "text-gray-700 hover:bg-gray-50";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${style}`}>
      {icon}
      {children}
    </button>
  );
}

/** Các nút thao tác của một phiếu tạm ứng. */
export function CashAdvanceActionBar({
  advance,
  actions,
}: {
  advance: CashAdvance;
  actions: CashAdvanceActions;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        icon={<Printer className="h-4 w-4" />}
        onClick={() => actions.print(advance)}>
        In phiếu
      </ActionButton>
      {actions.canEdit(advance) && (
        <ActionButton
          icon={<Pencil className="h-4 w-4" />}
          onClick={() => actions.edit(advance)}>
          Sửa
        </ActionButton>
      )}
      {actions.canConfirm(advance) && (
        <ActionButton
          tone="primary"
          disabled={actions.busy}
          icon={<Wallet className="h-4 w-4" />}
          onClick={() => actions.confirm(advance)}>
          Xác nhận giao tiền
        </ActionButton>
      )}
      {actions.canUploadSigned(advance) && (
        <ActionButton
          tone={advance.status === "CONFIRMING" ? "primary" : "default"}
          icon={<FileSignature className="h-4 w-4" />}
          onClick={() => actions.uploadSigned(advance)}>
          {advance.status === "CONFIRMING"
            ? "Upload phiếu đã ký"
            : "Thêm phiếu đã ký"}
        </ActionButton>
      )}
      {actions.canRefund(advance) && (
        <ActionButton
          icon={<Undo2 className="h-4 w-4" />}
          onClick={() => actions.createRefund(advance)}>
          Tạo hoàn ứng
        </ActionButton>
      )}
      {actions.canCancel(advance) && (
        <ActionButton
          tone="danger"
          disabled={actions.busy}
          icon={<Ban className="h-4 w-4" />}
          onClick={() => actions.cancel(advance)}>
          Hủy phiếu
        </ActionButton>
      )}
    </div>
  );
}

function Timeline({ advance }: { advance: Detail }) {
  const steps = [
    {
      label: "Tạo phiếu tạm",
      at: advance.createdAt,
      by: advance.creator?.name,
      done: true,
    },
    {
      label: "Xác nhận giao tiền",
      at: advance.confirmedAt,
      by: advance.confirmer?.name,
      done: Boolean(advance.confirmedAt),
    },
    {
      label: "Upload phiếu đã ký",
      at: advance.completedAt,
      by: advance.completer?.name,
      done: Boolean(advance.completedAt),
    },
  ];
  return (
    <ol className="space-y-1.5 text-xs">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-2">
          <CheckCircle2
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              step.done ? "text-green-600" : "text-gray-300"
            }`}
          />
          <span className={step.done ? "text-gray-800" : "text-gray-400"}>
            {step.label}
            {step.done && step.at && (
              <span className="text-gray-500">
                {" "}
                · {formatVnDateTime(step.at)}
                {step.by ? ` · ${step.by}` : ""}
              </span>
            )}
          </span>
        </li>
      ))}
      {advance.status === "CANCELLED" && (
        <li className="flex items-start gap-2 text-red-600">
          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Đã hủy · {formatVnDateTime(advance.cancelledAt)}
            {advance.canceller?.name ? ` · ${advance.canceller.name}` : ""}
            {advance.cancelReason ? ` · ${advance.cancelReason}` : ""}
          </span>
        </li>
      )}
    </ol>
  );
}

/** Chi tiết phiếu tạm ứng: thông tin, đối chiếu và danh sách phiếu chi kho. */
export function CashAdvanceDetail({
  id,
  actions,
}: {
  id: number;
  actions: CashAdvanceActions;
}) {
  const query = useCashAdvance(id);
  const advance = query.data;
  if (query.isLoading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
      </div>
    );
  if (!advance)
    return (
      <div className="py-6 text-center text-sm text-red-600">
        {query.error instanceof Error
          ? query.error.message
          : "Không tải được phiếu tạm ứng"}
      </div>
    );
  const { locked, projected, outside } = advance.expenses;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-brand">
              {advance.code}
            </span>
            <CashAdvanceStatusBadge status={advance.status} />
            <RefundStateBadge
              needsRefund={advance.needsRefund}
              overdue={advance.overdue}
            />
          </div>
          <div className="text-gray-700">{advance.description}</div>
          <div className="text-xs text-gray-500">
            {advance.branch?.name} · Người nhận{" "}
            <strong>{advance.recipient.name}</strong> · Ngày tạm ứng{" "}
            {formatDateKey(advance.advanceDate)} · Kỳ {advance.periodLabel} ·
            Hạn hoàn ứng {formatDateKey(advance.refundDueDate)}
          </div>
          {advance.fundTransaction && (
            <div className="text-xs text-gray-500">
              Dòng quỹ:{" "}
              <Link
                href={`/tai-chinh/quy-noi-bo?search=${encodeURIComponent(advance.code)}`}
                className="text-brand hover:underline">
                {advance.fundTransaction.status === "CANCELLED"
                  ? "đã hủy"
                  : `chi ${formatCurrency(advance.fundTransaction.amount)} đ lúc ${formatVnDateTime(advance.fundTransaction.occurredAt)}`}
              </Link>
            </div>
          )}
        </div>
        <CashAdvanceActionBar advance={advance} actions={actions} />
      </div>
      <UsageSummary advance={advance} />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <ExpenseTable
            title="Đã chi từ tạm ứng này (đã tick Đã chi)"
            rows={locked}
            empty="Chưa có phiếu chi kho nào Đã chi từ tạm ứng này"
            action={
              actions.canReleaseExpense(advance.branchId)
                ? (row) => (
                    <button
                      type="button"
                      onClick={() => actions.releaseExpense(row)}
                      className="text-[11px] font-medium text-red-600 hover:underline">
                      Bỏ Đã chi
                    </button>
                  )
                : undefined
            }
          />
          <ExpenseTable
            title="Dự kiến trừ vào tạm ứng này (chưa Đã chi)"
            rows={projected}
            empty={
              isPostedAdvance(advance.status)
                ? "Không còn phiếu chi kho chưa Đã chi trong kỳ"
                : "Tạm ứng chưa giao tiền nên chưa trừ phiếu chi nào"
            }
          />
          <ExpenseTable
            title="Phiếu chi kho trong kỳ không thuộc tạm ứng này"
            rows={outside}
            empty="Không có"
            extra={(row) => (
              <span className="text-[11px] text-gray-500">
                {row.reason
                  ? OUTSIDE_REASON_LABELS[
                      row.reason as keyof typeof OUTSIDE_REASON_LABELS
                    ] || row.reason
                  : ""}
                {row.advanceCodes?.length
                  ? ` (${row.advanceCodes.join(", ")})`
                  : ""}
              </span>
            )}
          />
        </div>
        <div className="space-y-3">
          <Timeline advance={advance} />
          <AttachmentStrip
            label="Chứng từ tạm ứng"
            files={advance.attachments.filter((file) => file.kind !== "SIGNED")}
          />
          <AttachmentStrip
            label="Phiếu đã ký"
            files={advance.attachments.filter((file) => file.kind === "SIGNED")}
          />
          {advance.refunds.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">
                Phiếu hoàn ứng
              </div>
              <ul className="space-y-1 text-xs">
                {advance.refunds.map((refund) => (
                  <li key={refund.id} className="flex items-center gap-2">
                    <Link
                      href={`/tai-chinh/hoan-ung?Code=${encodeURIComponent(refund.code)}`}
                      className="font-mono text-brand hover:underline">
                      {refund.code}
                    </Link>
                    <span>{formatCurrency(refund.amount)} đ</span>
                    <CashAdvanceStatusBadge status={refund.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
