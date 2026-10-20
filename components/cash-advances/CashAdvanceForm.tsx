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
import {
  IsoWeekPicker,
  type IsoWeek,
} from "@/components/internal-finance/IsoWeekPicker";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type {
  CashAdvance,
  CashAdvanceAttachment,
  CashAdvancePeriodMode,
} from "@/lib/api/cash-advances";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateCashAdvance,
  useRecipientAdvanceStatus,
  useUpdateCashAdvance,
} from "@/lib/hooks/useCashAdvances";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  isoWeekOf,
  isoWeekRange,
  toDateInput,
} from "@/lib/internal-finance/dates";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  CASH_ADVANCE_BRANCH_IDS,
  CASH_ADVANCE_GRACE_DAYS,
  formatDateKey,
} from "@/lib/cash-advances/display";
import { uploadCashAdvanceFiles } from "@/lib/cash-advances/upload";
import { formatCurrency } from "@/lib/utils";

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : 0;
};

const addDays = (key: string, days: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

function asBranches(payload: unknown) {
  if (Array.isArray(payload))
    return payload as Array<{ id: number; name: string }>;
  const data = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(data)
    ? (data as Array<{ id: number; name: string }>)
    : [];
}

/** Tạo / sửa phiếu tạm ứng (chỉ sửa khi còn là phiếu tạm). */
export function CashAdvanceForm({
  branchId,
  advance,
  onClose,
  onCreated,
}: {
  branchId: number;
  advance?: CashAdvance | null;
  onClose: () => void;
  /** Tạo xong: trang cha in phiếu tạm ứng. */
  onCreated?: (advance: CashAdvance) => void;
}) {
  const access = useFinanceAccess();
  const { data: branchData } = useBranches();
  const { data: users } = useUsersForFilter();
  const branches = useMemo(
    () =>
      asBranches(branchData).filter(
        (branch) =>
          CASH_ADVANCE_BRANCH_IDS.includes(branch.id) &&
          access.can("cash_advance", "create", branch.id),
      ),
    [access, branchData],
  );
  const create = useCreateCashAdvance();
  const update = useUpdateCashAdvance();
  const today = toDateInput(new Date());
  const [clientUuid] = useState(() => crypto.randomUUID());
  const [selectedBranchId, setSelectedBranchId] = useState(
    advance?.branchId ?? branchId,
  );
  if (
    !advance &&
    branches.length &&
    !branches.some((branch) => branch.id === selectedBranchId)
  )
    setSelectedBranchId(branches[0].id);
  const [recipientId, setRecipientId] = useState(
    advance ? String(advance.recipientId) : "",
  );
  const [amount, setAmount] = useState(
    advance ? String(Math.round(advance.amount)) : "",
  );
  const [advanceDate, setAdvanceDate] = useState(advance?.advanceDate || today);
  const [periodMode, setPeriodMode] = useState<CashAdvancePeriodMode>(
    advance?.periodMode || "WEEK",
  );
  const [week, setWeek] = useState<IsoWeek>(() =>
    advance?.periodYear && advance.periodWeek
      ? { year: advance.periodYear, week: advance.periodWeek }
      : isoWeekOf(today),
  );
  const [periodFrom, setPeriodFrom] = useState(advance?.periodFrom || today);
  const [periodTo, setPeriodTo] = useState(
    advance?.periodTo || addDays(today, 6),
  );
  const [description, setDescription] = useState(advance?.description || "");
  const [attachments, setAttachments] = useState<CashAdvanceAttachment[]>(() =>
    (advance?.attachments || [])
      .filter((file) => file.kind !== "SIGNED")
      .map((file) => ({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
      })),
  );
  const [uploading, setUploading] = useState(false);

  const recipientStatus = useRecipientAdvanceStatus(
    recipientId && Number(recipientId) !== advance?.recipientId
      ? Number(recipientId)
      : null,
  );
  const blocking = (recipientStatus.data?.advances || []).filter(
    (row) => row.id !== advance?.id,
  );
  const userOptions = useMemo(
    () =>
      (users || []).map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    [users],
  );
  const period =
    periodMode === "WEEK"
      ? isoWeekRange(week.year, week.week)
      : { from: periodFrom, to: periodTo };
  const parsedAmount = parseAmount(amount);

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
    if (!recipientId) return void toast.error("Cần chọn người tạm ứng");
    if (parsedAmount < 1000)
      return void toast.error("Số tiền tạm ứng không hợp lệ");
    if (!description.trim())
      return void toast.error("Cần nhập nội dung tạm ứng");
    if (period.from > period.to)
      return void toast.error("Từ ngày phải trước hoặc bằng đến ngày");
    if (blocking.length)
      return void toast.error("Người này cần làm hoàn ứng trước");
    const fields = {
      recipientId: Number(recipientId),
      amount: parsedAmount,
      advanceDate,
      periodMode,
      ...(periodMode === "WEEK"
        ? { periodYear: week.year, periodWeek: week.week }
        : { periodFrom, periodTo }),
      description: description.trim(),
      attachments,
    };
    if (advance) {
      update.mutate(
        { id: advance.id, payload: fields },
        { onSuccess: onClose },
      );
      return;
    }
    create.mutate(
      { ...fields, branchId: selectedBranchId, clientUuid },
      {
        onSuccess: (row) => {
          onClose();
          onCreated?.(row);
        },
      },
    );
  };

  const modeButton = (mode: CashAdvancePeriodMode, label: string) => (
    <button
      type="button"
      onClick={() => setPeriodMode(mode)}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
        periodMode === mode
          ? "bg-white text-brand shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}>
      {label}
    </button>
  );

  return (
    <FinanceFormSheet
      title={
        advance ? `Sửa phiếu tạm ứng ${advance.code}` : "Tạo phiếu tạm ứng"
      }
      subtitle="Tiền ra khỏi quỹ kho khi bấm Xác nhận giao tiền. Phiếu chi kho trong kỳ sẽ trừ dần vào số tạm ứng."
      onClose={onClose}
      onSubmit={submit}
      width="sm:max-w-2xl"
      footer={
        <FinanceFormActions
          onCancel={onClose}
          pending={create.isPending || update.isPending}
          disabled={uploading || blocking.length > 0}
          submitLabel={advance ? "Lưu thay đổi" : "Tạo & in phiếu"}
          summary={
            parsedAmount ? `${formatCurrency(parsedAmount)} đ` : undefined
          }
        />
      }>
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
        Kho (quỹ chi tiền)
        <select
          value={selectedBranchId}
          disabled={Boolean(advance)}
          onChange={(event) => setSelectedBranchId(Number(event.target.value))}
          className="dt-select h-10 w-full disabled:bg-gray-50">
          {(advance
            ? [{ id: advance.branchId, name: advance.branch?.name || "" }]
            : branches
          ).map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
        Người tạm ứng
        <FilterSearchableSelect
          options={userOptions}
          value={recipientId}
          onChange={setRecipientId}
          placeholder="Chọn nhân viên"
          searchPlaceholder="Tìm nhân viên..."
          allowDeselect={false}
          showClearOption={false}
          size="form"
        />
      </div>
      {blocking.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Người này còn tạm ứng quá hạn chưa làm hoàn ứng (quá{" "}
            {CASH_ADVANCE_GRACE_DAYS} ngày sau kỳ):{" "}
            {blocking
              .map(
                (row) =>
                  `${row.code} (hạn ${formatDateKey(row.refundDueDate)}, còn ${formatCurrency(row.remaining)}đ)`,
              )
              .join(", ")}
            . Cần làm phiếu hoàn ứng trước khi tạm ứng mới.
          </div>
        </div>
      )}
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600">
        Số tiền tạm ứng
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
        label="Ngày tạm ứng"
        value={advanceDate}
        onChange={(value) => value && setAdvanceDate(value)}
      />
      <div className="flex min-w-0 flex-col gap-2 text-xs font-medium text-gray-600 sm:col-span-2">
        Kỳ tạm ứng (so sánh với phiếu chi kho trong kỳ)
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {modeButton("WEEK", "Theo tuần số")}
          {modeButton("RANGE", "Từ ngày – đến ngày")}
        </div>
        {periodMode === "WEEK" ? (
          <IsoWeekPicker value={week} onChange={setWeek} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <InternalFinanceDateField
              label="Từ ngày"
              value={periodFrom}
              maxDate={periodTo}
              onChange={(value) => value && setPeriodFrom(value)}
            />
            <InternalFinanceDateField
              label="Đến ngày"
              value={periodTo}
              minDate={periodFrom}
              onChange={(value) => value && setPeriodTo(value)}
            />
          </div>
        )}
        <span className="font-normal text-gray-500">
          Hạn làm hoàn ứng:{" "}
          <strong>
            {formatDateKey(addDays(period.to, CASH_ADVANCE_GRACE_DAYS))}
          </strong>{" "}
          (hết kỳ + {CASH_ADVANCE_GRACE_DAYS} ngày ân hạn)
        </span>
      </div>
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-gray-600 sm:col-span-2">
        Nội dung tạm ứng
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={1000}
          className="dt-input w-full"
          required
        />
      </label>
      <EvidenceUploadTiles
        label="Chứng từ tạm ứng"
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
