"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { displayDescription } from "@/lib/internal-finance/display";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateWarehouseExpenseApproval,
  usePrepareWarehouseExpenseBatch,
  useWarehouseExpenseBatch,
  useWarehouseExpenseBatches,
  useWarehouseExpenseCarryOver,
  useAddWeeklyBatchEntries,
  useRemoveWeeklyBatchEntries,
} from "@/lib/hooks/useInternalFinance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { CancelWeeklyBatchDialog } from "./CancelWeeklyBatchDialog";
import {
  approvalStepTime,
  canCancelBatch,
} from "@/lib/internal-finance/weekly-batch";
import { ApprovalHistoryList } from "./WeeklyBatchNotes";
import { WeeklyBatchEntryGroups } from "./WeeklyBatchEntryGroups";
import {
  isoWeekOf,
  isoWeekRange,
  isoWeeksInYear,
  toDateInput,
  vnDateKey,
} from "@/lib/internal-finance/dates";

const shortDate = (dateKey: string) => dateKey.split("-").reverse().join("/");

const nextDayKey = (dateKey: string) =>
  new Date(Date.parse(`${dateKey}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

const BRANCH_IDS = [6, 1];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng tạo Approval",
  IN_APPROVAL: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  POSTED: "Đã xử lý",
};

const STATUS_TONES: Record<string, string> = {
  READY: "bg-brand-soft text-brand",
  IN_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  POSTED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${
        STATUS_TONES[status] || "bg-gray-100 text-gray-600"
      }`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function asBranches(payload: unknown) {
  if (Array.isArray(payload))
    return payload as Array<{ id: number; name: string }>;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Array<{ id: number; name: string }> }).data;
  }
  return [];
}

export function InternalFinanceWeeklyPanel({
  onClose,
  initialBatchId,
}: {
  onClose: () => void;
  initialBatchId?: number | null;
}) {
  const { data: branchData } = useBranches();
  const access = useFinanceAccess();
  const can = (action: string, id: number) =>
    access.can("weekly_approval", action, id);
  const allowedIds = access.branches("weekly_approval", "view", BRANCH_IDS);
  const branches = useMemo(
    () =>
      asBranches(branchData).filter((branch) => allowedIds.includes(branch.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branchData, allowedIds.join(",")],
  );
  const today = useMemo(() => new Date(), []);
  const [pickedBranchId, setBranchId] = useState<number | null>(null);
  // Mặc định là kho đầu tiên user được phép.
  const branchId = pickedBranchId ?? allowedIds[0] ?? 6;
  // Tuần tổng hợp luôn là một tuần ISO Thứ hai–Chủ nhật: người dùng chọn số
  // tuần, khoảng ngày tự tính. Phiếu tuần trước gộp qua "Phiếu sót tuần trước".
  const [isoWeek, setIsoWeek] = useState(() => isoWeekOf(toDateInput(today)));
  // Đã tự chọn tuần thì không ghi đè bằng gợi ý nữa.
  const [weekTouched, setWeekTouched] = useState(false);
  const [weekText, setWeekText] = useState(String(isoWeek.week));
  const { from: weekStart, to: weekEnd } = isoWeekRange(
    isoWeek.year,
    isoWeek.week,
  );
  const maxWeek = isoWeeksInYear(isoWeek.year);
  const changeWeek = (next: { year: number; week: number }) => {
    setIsoWeek(next);
    setWeekText(String(next.week));
  };
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(
    initialBatchId || null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showCarryOver, setShowCarryOver] = useState(false);
  // Mở từ một dòng batch thì thu gọn form chọn tuần, để phần batch lên đầu.
  const [weekFormOpen, setWeekFormOpen] = useState(!initialBatchId);
  const showWeekForm = weekFormOpen || !selectedBatchId;

  const canPrepare = can("prepare", branchId);
  const carryOver = useWarehouseExpenseCarryOver(
    branchId,
    weekStart,
    canPrepare,
  );
  const carryOverCount = carryOver.data?.data.length || 0;
  const addEntries = useAddWeeklyBatchEntries();
  const removeEntries = useRemoveWeeklyBatchEntries();
  const batches = useWarehouseExpenseBatches({
    branchIds: [branchId],
    fromDate: weekStart,
    toDate: weekEnd,
    limit: 20,
  });
  const selectedBatch = useWarehouseExpenseBatch(selectedBatchId);
  // Gợi ý tuần kế tiếp sau batch (chưa hủy) gần nhất của chi nhánh.
  const recentBatches = useWarehouseExpenseBatches({
    branchIds: [branchId],
    limit: 10,
  });
  const lastBatch = (recentBatches.data || []).find(
    (batch) => batch.status !== "CANCELLED",
  );
  const suggestedWeek = lastBatch
    ? isoWeekOf(nextDayKey(vnDateKey(lastBatch.weekEnd)))
    : null;
  const lastBatchWeek = lastBatch
    ? isoWeekOf(vnDateKey(lastBatch.weekStart))
    : null;
  // Batch của đúng khoảng ngày đang chọn, chưa gửi Lark: nơi thêm phiếu sót.
  const targetBatch = (batches.data || []).find(
    (batch) =>
      batch.status === "READY" &&
      !batch.approvalRequestId &&
      vnDateKey(batch.weekStart) === weekStart &&
      vnDateKey(batch.weekEnd) === weekEnd,
  );
  const prepare = usePrepareWarehouseExpenseBatch();
  // Đang xem batch đã hủy: chỉ xem, ẩn phần tổng hợp tuần để không nhầm là
  // thao tác trên batch đó. Muốn gom lại thì bấm "Tổng hợp lại tuần này".
  const viewingCancelled = selectedBatch.data?.status === "CANCELLED";
  const createApproval = useCreateWarehouseExpenseApproval();

  // Mở/chọn một batch thì chi nhánh và khoảng ngày theo batch đó, để hủy xong
  // bấm "Chuẩn bị tổng hợp tuần" là gom lại đúng tuần vừa hủy.
  const loadedBatch = selectedBatch.data;
  useEffect(() => {
    if (!loadedBatch) return;
    setBranchId(loadedBatch.branchId);
    changeWeek(isoWeekOf(vnDateKey(loadedBatch.weekStart)));
    setWeekTouched(true);
    // Chỉ đồng bộ khi đổi batch, người dùng vẫn đổi tuần tay được.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedBatch?.id]);

  useEffect(() => {
    if (weekTouched || selectedBatchId || !suggestedWeek) return;
    changeWeek(suggestedWeek);
    // Chỉ gợi ý khi đổi chi nhánh / có batch gần nhất mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, lastBatch?.id, weekTouched, selectedBatchId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const prepareBatch = () => {
    prepare.mutate(
      { branchId, weekStart, weekEnd },
      {
        onSuccess: (batch) => {
          setSelectedBatchId(batch.id);
          setWeekFormOpen(false);
        },
      },
    );
  };

  const createWeeklyApproval = (batchId: number) => {
    createApproval.mutate(
      { id: batchId },
      {
        onSuccess: () => setSelectedBatchId(batchId),
      },
    );
  };

  const batch = selectedBatch.data;
  const branchName =
    branches.find((branch) => branch.id === branchId)?.name ||
    batch?.branch?.name ||
    "";
  const otherBatches = (batches.data || []).filter(
    (row) => row.id !== selectedBatchId,
  );
  // Đang xem đúng batch duy nhất của tuần thì không cần danh sách batch.
  const showBatchList = batch
    ? otherBatches.length > 0
    : !(selectedBatchId && selectedBatch.isLoading);
  const batchWeek = batch ? isoWeekOf(vnDateKey(batch.weekStart)) : null;
  const canRemoveEntries =
    !!batch &&
    batch.status === "READY" &&
    !batch.approvalRequestId &&
    can("prepare", batch.branchId);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/25"
      // Chỉ đóng khi bấm đúng vào nền mờ, không phải bên trong bảng.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="flex h-full w-full max-w-xl flex-col border-l bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Tổng hợp Approval tuần
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Chỉ gom phiếu chi đã được cả Quản lý kho và Kế toán kho tick.
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!viewingCancelled && (
            <div className="border-b p-5">
              {showWeekForm ? (
                <div className="space-y-3">
                  {selectedBatchId && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Chọn tuần tổng hợp
                      </span>
                      <button
                        type="button"
                        onClick={() => setWeekFormOpen(false)}
                        className="text-xs font-medium text-brand hover:underline">
                        Thu gọn
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Chi nhánh
                    </label>
                    <FilterSearchableSelect
                      options={branches.map((branch) => ({
                        value: String(branch.id),
                        label: branch.name,
                      }))}
                      value={String(branchId)}
                      onChange={(value) => {
                        if (!value) return;
                        setBranchId(Number(value));
                        setSelectedBatchId(null);
                      }}
                      searchable={false}
                      allowDeselect={false}
                      showClearOption={false}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Năm
                      </label>
                      <FilterSearchableSelect
                        options={[-1, 0, 1].map((offset) => {
                          const year = today.getFullYear() + offset;
                          return { value: String(year), label: String(year) };
                        })}
                        value={String(isoWeek.year)}
                        onChange={(value) => {
                          if (!value) return;
                          const year = Number(value);
                          setWeekTouched(true);
                          changeWeek({
                            year,
                            week: Math.min(isoWeek.week, isoWeeksInYear(year)),
                          });
                        }}
                        searchable={false}
                        allowDeselect={false}
                        showClearOption={false}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Tuần số
                      </label>
                      {/* Cùng khung với ô chọn Năm: nhập số tuần, hai nút lùi/tới. */}
                      <div className="flex items-center gap-1 rounded-lg border bg-white px-1 py-1 text-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft hover:border-gray-400">
                        <button
                          type="button"
                          title="Tuần trước"
                          disabled={isoWeek.week <= 1}
                          onClick={() => {
                            setWeekTouched(true);
                            changeWeek({ ...isoWeek, week: isoWeek.week - 1 });
                          }}
                          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={`1–${maxWeek}`}
                          value={weekText}
                          onChange={(event) => {
                            // Chỉ nhận chữ số; đủ hợp lệ thì đổi tuần ngay.
                            const digits = event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 2);
                            setWeekText(digits);
                            const week = Number(digits);
                            if (digits && week >= 1 && week <= maxWeek) {
                              setWeekTouched(true);
                              setIsoWeek({ year: isoWeek.year, week });
                            }
                          }}
                          onBlur={() => setWeekText(String(isoWeek.week))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter")
                              (event.target as HTMLInputElement).blur();
                          }}
                          className="w-full min-w-0 bg-transparent text-center font-medium text-gray-800 outline-none placeholder:text-gray-300"
                        />
                        <button
                          type="button"
                          title="Tuần sau"
                          disabled={isoWeek.week >= maxWeek}
                          onClick={() => {
                            setWeekTouched(true);
                            changeWeek({ ...isoWeek, week: isoWeek.week + 1 });
                          }}
                          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    Tuần {isoWeek.week}/{isoWeek.year}: Thứ hai{" "}
                    <strong>{shortDate(weekStart)}</strong> → Chủ nhật{" "}
                    <strong>{shortDate(weekEnd)}</strong>
                    {lastBatchWeek && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        Batch gần nhất: tuần {lastBatchWeek.week}/
                        {lastBatchWeek.year}
                        {suggestedWeek &&
                          (suggestedWeek.week !== isoWeek.week ||
                            suggestedWeek.year !== isoWeek.year) && (
                            <>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => {
                                  setWeekTouched(true);
                                  changeWeek(suggestedWeek);
                                }}
                                className="font-medium text-brand hover:underline">
                                Chọn tuần kế tiếp ({suggestedWeek.week})
                              </button>
                            </>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {branchName} · Tuần {isoWeek.week}/{isoWeek.year}
                    </div>
                    <div className="text-xs text-gray-500">
                      Thứ hai {shortDate(weekStart)} → Chủ nhật{" "}
                      {shortDate(weekEnd)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekFormOpen(true)}
                    className="shrink-0 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400">
                    Chọn tuần khác
                  </button>
                </div>
              )}
              {carryOverCount > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <button
                    type="button"
                    onClick={() => setShowCarryOver((current) => !current)}
                    className="flex w-full items-center justify-between gap-2 text-left">
                    <span>
                      Phiếu sót tuần trước: <strong>{carryOverCount}</strong>{" "}
                      phiếu ·{" "}
                      <strong>
                        {formatCurrency(carryOver.data?.total || 0)}
                      </strong>
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        showCarryOver ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <p className="mt-1 text-xs text-amber-800">
                    Đã đủ hai tick nhưng chưa nằm trong Approval tuần nào.
                    {targetBatch
                      ? " Thêm từng phiếu hoặc thêm tất cả vào batch tuần này."
                      : " Bấm “Chuẩn bị tổng hợp tuần” trước, rồi thêm phiếu sót."}
                  </p>
                  {showCarryOver && (
                    <ul className="mt-2 max-h-40 divide-y divide-amber-100 overflow-y-auto rounded border border-amber-100 bg-white text-xs text-gray-700">
                      {carryOver.data?.data.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5">
                          <span className="min-w-0">
                            <span className="block font-mono">{row.code}</span>
                            <span className="block truncate text-gray-500">
                              {vnDateKey(row.occurredAt)
                                .split("-")
                                .reverse()
                                .join("/")}{" "}
                              · {displayDescription(row.description) || "-"}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-medium text-red-600">
                              {formatCurrency(row.amount)}
                            </span>
                            {targetBatch && (
                              <button
                                type="button"
                                disabled={addEntries.isPending}
                                onClick={() =>
                                  addEntries.mutate({
                                    batchId: targetBatch.id,
                                    entryIds: [row.id],
                                  })
                                }
                                className="whitespace-nowrap rounded border border-brand px-2 py-1 text-[11px] font-medium text-brand hover:bg-brand-soft disabled:opacity-50">
                                Thêm vào approval
                              </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {targetBatch && (
                    <button
                      type="button"
                      disabled={addEntries.isPending}
                      onClick={() =>
                        addEntries.mutate({
                          batchId: targetBatch.id,
                          entryIds:
                            carryOver.data?.data.map((row) => row.id) || [],
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                      {addEntries.isPending && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Thêm tất cả vào approval
                    </button>
                  )}
                </div>
              )}
              {showWeekForm && (
                <button
                  type="button"
                  onClick={prepareBatch}
                  disabled={!canPrepare || prepare.isPending}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {prepare.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Chuẩn bị tổng hợp tuần
                </button>
              )}
            </div>
          )}

          <div className="space-y-5 p-5">
            {showBatchList && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Batch của tuần {isoWeek.week}/{isoWeek.year}
                </div>
                {batches.isLoading ? (
                  <div className="flex justify-center py-10 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : batches.data?.length ? (
                  <div className="space-y-2">
                    {batches.data.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedBatchId(row.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          selectedBatchId === row.id
                            ? "border-brand bg-brand-soft"
                            : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-gray-700">
                            {row.code}
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {row._count?.entries || 0} phiếu ·{" "}
                            <span className="font-medium text-gray-700">
                              {formatCurrency(row.totalAmount)}
                            </span>
                          </span>
                        </span>
                        <span className="ml-3 flex shrink-0 items-center gap-2">
                          <StatusBadge status={row.status} />
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
                    Chưa có batch đủ điều kiện trong tuần này
                  </div>
                )}
              </div>
            )}

            {selectedBatchId && selectedBatch.isLoading && (
              <div className="flex justify-center py-10 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {batch && (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        Tuần {batchWeek?.week}/{batchWeek?.year}
                        {batch.branch?.name && ` · ${batch.branch.name}`}
                      </h3>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {shortDate(vnDateKey(batch.weekStart))} →{" "}
                        {shortDate(vnDateKey(batch.weekEnd))}
                      </div>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div className="mt-1 break-all font-mono text-[11px] text-gray-400">
                    {batch.code}
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t pt-3">
                    <div>
                      <div className="text-xs text-gray-500">Tổng chi</div>
                      <div className="text-2xl font-semibold tabular-nums text-red-600">
                        -{formatCurrency(batch.totalAmount)}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <strong className="text-gray-900">
                        {batch.entries?.length ?? batch._count?.entries ?? 0}
                      </strong>{" "}
                      phiếu
                    </div>
                  </div>
                  {((can("prepare", batch.branchId) && canCancelBatch(batch)) ||
                    (batch.status === "READY" &&
                      can("submit", batch.branchId))) && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {can("prepare", batch.branchId) &&
                        canCancelBatch(batch) && (
                          <button
                            type="button"
                            onClick={() => setCancelOpen(true)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                            Hủy batch
                          </button>
                        )}
                      {batch.status === "READY" &&
                        can("submit", batch.branchId) && (
                          <button
                            type="button"
                            onClick={() => createWeeklyApproval(batch.id)}
                            disabled={createApproval.isPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                            {createApproval.isPending && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            )}
                            Tạo approval Lark
                          </button>
                        )}
                    </div>
                  )}
                </div>
                {batch.status === "APPROVED" && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    <Check className="h-4 w-4 shrink-0" />
                    Approval đã duyệt. Các phiếu trong tuần đã tự động ghi Đã
                    chi.
                  </div>
                )}
                {batch.status === "CANCELLED" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <div>
                      Batch đã hủy
                      {batch.cancelledAt &&
                        ` lúc ${approvalStepTime(batch.cancelledAt)}`}{" "}
                      bởi {batch.canceller?.name || "hệ thống (Lark từ chối)"}.
                    </div>
                    {batch.cancelReason && (
                      <div className="mt-1 whitespace-pre-wrap break-words">
                        Lý do: {batch.cancelReason}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-red-700">
                      Danh sách dưới là các phiếu lúc hủy; phiếu đã trả về Phiếu
                      chi kho để tổng hợp lại.
                    </div>
                    {canPrepare && (
                      <button
                        type="button"
                        // Giữ chi nhánh và khoảng ngày của batch vừa xem.
                        onClick={() => setSelectedBatchId(null)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">
                        <Plus className="h-3.5 w-3.5" />
                        Tổng hợp lại tuần này
                      </button>
                    )}
                  </div>
                )}
                <ApprovalHistoryList
                  key={batch.id}
                  items={batch.approvalHistory}
                  // Đang chờ duyệt thì mở sẵn để theo dõi; còn lại xem bước cuối.
                  defaultOpen={batch.status === "IN_APPROVAL"}
                />
                <div className="pt-2">
                  <WeeklyBatchEntryGroups
                    key={batch.id}
                    entries={batch.entries || []}
                    weekStart={batch.weekStart}
                    renderAction={
                      canRemoveEntries
                        ? (entry) => (
                            // Thêm nhầm: bỏ ra khi batch chưa gửi Lark, giữ tick.
                            <button
                              type="button"
                              disabled={removeEntries.isPending}
                              onClick={() => {
                                const last = (batch.entries?.length || 0) <= 1;
                                removeEntries.mutate(
                                  { batchId: batch.id, entryIds: [entry.id] },
                                  {
                                    onSuccess: () => {
                                      if (last) setSelectedBatchId(null);
                                    },
                                  },
                                );
                              }}
                              className="whitespace-nowrap rounded border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                              Bỏ khỏi approval
                            </button>
                          )
                        : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {cancelOpen && batch && (
        <CancelWeeklyBatchDialog
          batch={batch}
          onClose={() => setCancelOpen(false)}
          // Giữ chi nhánh và khoảng ngày để chỉnh rồi tổng hợp lại.
          onCancelled={() => setSelectedBatchId(null)}
        />
      )}
    </div>
  );
}
