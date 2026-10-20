"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { EvidenceUploadTiles } from "@/components/internal-finance/EvidenceUploadTiles";
import {
  FinanceFormActions,
  FinanceFormSheet,
} from "@/components/internal-finance/FinanceFormSheet";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type {
  CashAdvanceAttachment,
  CashAdvanceRefund,
} from "@/lib/api/cash-advances";
import {
  useCreateCashAdvanceRefund,
  useRefundableAdvances,
  useUpdateCashAdvanceRefund,
} from "@/lib/hooks/useCashAdvances";
import { toDateInput } from "@/lib/internal-finance/dates";
import { formatDateKey } from "@/lib/cash-advances/display";
import { uploadCashAdvanceFiles } from "@/lib/cash-advances/upload";
import { formatCurrency } from "@/lib/utils";

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : 0;
};

/** Tạo / sửa phiếu hoàn ứng cho một tạm ứng đã giao tiền. */
export function CashAdvanceRefundForm({
  refund,
  initialAdvanceId,
  onClose,
  onCreated,
}: {
  refund?: CashAdvanceRefund | null;
  initialAdvanceId?: number;
  onClose: () => void;
  onCreated?: (refund: CashAdvanceRefund) => void;
}) {
  const create = useCreateCashAdvanceRefund();
  const update = useUpdateCashAdvanceRefund();
  const advances = useRefundableAdvances({}, !refund);
  const [clientUuid] = useState(() => crypto.randomUUID());
  const [advanceId, setAdvanceId] = useState(
    refund
      ? String(refund.advanceId)
      : initialAdvanceId
        ? String(initialAdvanceId)
        : "",
  );
  const selected = (advances.data || []).find(
    (row) => String(row.id) === advanceId,
  );
  const [amount, setAmount] = useState(
    refund ? String(Math.round(refund.amount)) : "",
  );
  // Chọn tạm ứng xong thì điền sẵn số còn lại chưa dùng.
  const [prefilledFor, setPrefilledFor] = useState(refund ? advanceId : "");
  if (!refund && selected && prefilledFor !== advanceId) {
    setPrefilledFor(advanceId);
    setAmount(String(Math.round(selected.usage.suggestedRefund)));
  }
  const [refundDate, setRefundDate] = useState(
    refund?.refundDate || toDateInput(new Date()),
  );
  const [description, setDescription] = useState(refund?.description || "");
  const [attachments, setAttachments] = useState<CashAdvanceAttachment[]>(() =>
    (refund?.attachments || [])
      .filter((file) => file.kind !== "SIGNED")
      .map((file) => ({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
      })),
  );
  const [uploading, setUploading] = useState(false);
  const options = useMemo(
    () =>
      (advances.data || []).map((row) => ({
        value: String(row.id),
        label: `${row.code} · ${row.recipient.name} · còn ${formatCurrency(row.usage.remaining)}đ${row.overdue ? " · QUÁ HẠN" : ""}`,
      })),
    [advances.data],
  );
  const parsedAmount = parseAmount(amount);
  const maxRefund = selected?.usage.maxRefund;
  const suggested = selected?.usage.suggestedRefund;

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadCashAdvanceFiles(Array.from(files));
      setAttachments((current) => [...current, ...result.files]);
      if (result.errors.length)
        toast.error(`Có ${result.errors.length} file không upload được`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload chứng từ thất bại",
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!advanceId) return void toast.error("Cần chọn phiếu tạm ứng");
    if (parsedAmount <= 0)
      return void toast.error("Số tiền hoàn ứng không hợp lệ");
    if (maxRefund !== undefined && parsedAmount > maxRefund)
      return void toast.error(
        `Số tiền hoàn ứng tối đa ${formatCurrency(maxRefund)} đ`,
      );
    const fields = {
      amount: parsedAmount,
      refundDate,
      description: description.trim() || undefined,
      attachments,
    };
    if (refund) {
      update.mutate({ id: refund.id, payload: fields }, { onSuccess: onClose });
      return;
    }
    create.mutate(
      { ...fields, advanceId: Number(advanceId), clientUuid },
      {
        onSuccess: (row) => {
          onClose();
          onCreated?.(row);
        },
      },
    );
  };

  return (
    <FinanceFormSheet
      title={
        refund ? `Sửa phiếu hoàn ứng ${refund.code}` : "Tạo phiếu hoàn ứng"
      }
      subtitle="Trả lại quỹ kho phần tạm ứng chưa dùng. Tiền vào quỹ khi bấm Xác nhận nhận tiền."
      onClose={onClose}
      onSubmit={submit}
      footer={
        <FinanceFormActions
          onCancel={onClose}
          pending={create.isPending || update.isPending}
          disabled={uploading}
          submitLabel={refund ? "Lưu thay đổi" : "Tạo & in phiếu"}
          summary={
            parsedAmount ? `${formatCurrency(parsedAmount)} đ` : undefined
          }
        />
      }>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
        Phiếu tạm ứng
        {refund ? (
          <div className="dt-input flex h-10 items-center bg-gray-50">
            {refund.advance.code} · {refund.advance.recipient.name}
          </div>
        ) : (
          <FilterSearchableSelect
            options={options}
            value={advanceId}
            onChange={setAdvanceId}
            placeholder={
              advances.isLoading
                ? "Đang tải..."
                : options.length
                  ? "Chọn tạm ứng còn tiền chưa dùng"
                  : "Không có tạm ứng nào còn tiền để hoàn"
            }
            searchPlaceholder="Tìm mã, người tạm ứng..."
            allowDeselect={false}
            showClearOption={false}
            size="form"
            wrapOptions
          />
        )}
      </div>
      {selected && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:col-span-2 sm:grid-cols-4">
          <span>
            Tạm ứng
            <br />
            <strong className="text-gray-900">
              {formatCurrency(selected.amount)}
            </strong>
          </span>
          <span>
            Đã dùng
            <br />
            <strong className="text-red-600">
              {formatCurrency(selected.usage.used)}
            </strong>
          </span>
          <span>
            Đã hoàn
            <br />
            <strong className="text-blue-700">
              {formatCurrency(selected.usage.refunded)}
            </strong>
          </span>
          <span>
            Còn lại
            <br />
            <strong className="text-green-700">
              {formatCurrency(selected.usage.remaining)}
            </strong>
          </span>
          <span className="col-span-2 text-gray-500 sm:col-span-4">
            Kỳ {selected.periodLabel} · Hạn hoàn ứng{" "}
            {formatDateKey(selected.refundDueDate)}
          </span>
        </div>
      )}
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
        Số tiền hoàn ứng
        <input
          inputMode="numeric"
          value={amount ? formatCurrency(parsedAmount) : ""}
          onChange={(event) => setAmount(event.target.value)}
          className="dt-input h-10 w-full"
          placeholder="0"
          required
        />
      </label>
      <InternalFinanceDateField
        label="Ngày hoàn ứng"
        value={refundDate}
        onChange={(value) => value && setRefundDate(value)}
      />
      {suggested !== undefined && parsedAmount > suggested && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Số hoàn ứng lớn hơn phần chưa dùng ({formatCurrency(suggested)} đ):
          các phiếu chi kho dự kiến trừ vào tạm ứng sẽ chuyển sang trừ quỹ khi
          tick Đã chi.
        </div>
      )}
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
        Nội dung
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          maxLength={1000}
          className="dt-input w-full"
        />
      </label>
      <EvidenceUploadTiles
        label="Chứng từ hoàn ứng"
        files={attachments}
        uploading={uploading}
        onFiles={(files) => void handleUpload(files)}
        onRemove={(file) =>
          setAttachments((current) =>
            current.filter((item) => item.fileUrl !== file.fileUrl),
          )
        }
      />
    </FinanceFormSheet>
  );
}
