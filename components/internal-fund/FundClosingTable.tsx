"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { InternalFundDailyClosing } from "@/lib/api/internal-fund";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import {
  useCloseInternalFundDay,
  useInternalFundDailyClosing,
  useInternalFundSummary,
} from "@/lib/hooks/useInternalFund";
import { formatCurrency } from "@/lib/utils";

const dayLabel = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const money = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "-" : formatCurrency(value);

// Ô nhập tiền: chỉ giữ chữ số (và dấu âm), hiện kèm dấu phân cách hàng nghìn.
const formatInput = (value: string) => {
  const negative = value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${Number(digits).toLocaleString("vi-VN")}`;
};
const parseInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits) * (value.trim().startsWith("-") ? -1 : 1);
};
const toInput = (value: number | string | null | undefined) =>
  value === null || value === undefined
    ? ""
    : formatInput(String(Math.round(Number(value))));

const STATUS: Record<string, { label: string; className: string }> = {
  MATCHED: { label: "Khớp", className: "bg-green-100 text-green-700" },
  MISMATCHED: { label: "Lệch quỹ", className: "bg-red-100 text-red-700" },
  PENDING: { label: "Chưa nhập", className: "bg-gray-100 text-gray-500" },
};

const TH =
  "whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500";

/**
 * Chốt sổ quỹ hàng ngày: người dùng tạo dòng và nhập số của mình; số hệ
 * thống tính từ sổ quỹ đặt cạnh để đối soát.
 */
export function FundClosingTable({
  rows,
  isLoading,
  canEdit,
  branchId,
  creating,
  onCreateClose,
}: {
  rows: InternalFundDailyClosing[];
  isLoading: boolean;
  /** Được nhập số đối soát của kế toán. */
  canEdit: boolean;
  /** Quỹ đang xem; chốt sổ mới được tạo cho quỹ này. */
  branchId: number;
  /** Đang mở hộp "Tạo chốt sổ" (nút nằm ở thanh công cụ của trang). */
  creating: boolean;
  onCreateClose: () => void;
}) {
  const [editing, setEditing] = useState<InternalFundDailyClosing | null>(null);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th rowSpan={2} className={`${TH} text-left`}>
                Ngày
              </th>
              <th colSpan={4} className={`${TH} border-l text-center`}>
                Kế toán nhập
              </th>
              <th colSpan={4} className={`${TH} border-l text-center`}>
                Hệ thống
              </th>
              <th rowSpan={2} className={`${TH} border-l text-right`}>
                Chênh lệch
              </th>
              <th rowSpan={2} className={`${TH} text-left`}>
                Kiểm tra
              </th>
              <th rowSpan={2} className={`${TH} text-left`}>
                Ghi chú
              </th>
            </tr>
            <tr>
              {[0, 1].flatMap((group) =>
                ["Đầu kỳ", "Thu", "Chi", "Cuối kỳ"].map((label, index) => (
                  <th
                    key={`${group}-${label}`}
                    className={`${TH} text-right ${index === 0 ? "border-l" : ""}`}>
                    {label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-400">
                  Chưa có chốt sổ nào
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status =
                  STATUS[row.reconciliationStatus] || STATUS.PENDING;
                const diff =
                  row.actualClosingBalance === null
                    ? null
                    : Number(row.actualClosingBalance) -
                      Number(row.systemClosingBalance);
                return (
                  <tr
                    key={`${row.branchId}-${row.closingDate}`}
                    onClick={() => setEditing(row)}
                    className="cursor-pointer border-b transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">
                      {dayLabel(row.closingDate)}
                    </td>
                    {[
                      row.actualOpeningBalance,
                      row.actualReceipt,
                      row.actualExpense,
                      row.actualClosingBalance,
                    ].map((value, index) => (
                      <td
                        key={`a${index}`}
                        className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums ${
                          index === 0 ? "border-l" : ""
                        } ${index === 3 ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {money(value)}
                      </td>
                    ))}
                    {[
                      row.systemOpeningBalance,
                      row.systemReceipt,
                      row.systemExpense,
                      row.systemClosingBalance,
                    ].map((value, index) => (
                      <td
                        key={`s${index}`}
                        className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums ${
                          index === 0 ? "border-l" : ""
                        } ${index === 3 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                        {money(value)}
                      </td>
                    ))}
                    <td
                      className={`whitespace-nowrap border-l px-4 py-2.5 text-right tabular-nums ${
                        diff ? "font-semibold text-red-600" : "text-gray-500"
                      }`}>
                      {diff === null ? "-" : formatCurrency(diff)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-2.5 text-xs text-gray-600">
                      <div className="line-clamp-2 whitespace-pre-line">
                        {row.notes || "-"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <ClosingDialog
          key={`${editing.branchId}-${editing.closingDate}`}
          branchId={editing.branchId}
          row={editing}
          rows={rows}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && !editing && (
        <ClosingDialog
          branchId={branchId}
          row={null}
          rows={rows}
          canEdit={canEdit}
          onClose={onCreateClose}
        />
      )}
    </>
  );
}

const todayInput = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

/** Hộp tạo mới (row = null, có ô chọn ngày) hoặc sửa một chốt sổ đã có. */
function ClosingDialog({
  branchId,
  row,
  rows,
  canEdit,
  onClose,
}: {
  branchId: number;
  row: InternalFundDailyClosing | null;
  rows: InternalFundDailyClosing[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const save = useCloseInternalFundDay();
  const originalDate = row?.closingDate.slice(0, 10);
  const [date, setDate] = useState(originalDate || todayInput());
  const sameDay =
    rows.find(
      (item) =>
        item.branchId === branchId && item.closingDate.slice(0, 10) === date,
    ) || null;
  // Ngày đang chọn đã có chốt sổ thì sửa dòng đó thay vì tạo dòng thứ hai.
  const existing = row || sameDay;
  // Dời chốt sổ đang sửa sang ngày khác: ngày đó phải còn trống.
  const moved = Boolean(row) && date !== originalDate;
  const conflict = moved && sameDay !== null;
  const saved = useInternalFundDailyClosing(existing?.id ?? null);
  // Số hệ thống của ngày đang chọn, tính trực tiếp từ sổ quỹ.
  const summary = useInternalFundSummary({ branchId, fromDate: date });
  const system = summary.data?.[0];
  const [opening, setOpening] = useState(toInput(row?.actualOpeningBalance));
  const [receipt, setReceipt] = useState(toInput(row?.actualReceipt));
  const [expense, setExpense] = useState(toInput(row?.actualExpense));
  const [notes, setNotes] = useState(row?.notes || "");
  const pickDate = (next: string) => {
    setDate(next);
    const found = rows.find(
      (item) =>
        item.branchId === branchId && item.closingDate.slice(0, 10) === next,
    );
    setOpening(toInput(found?.actualOpeningBalance));
    setReceipt(toInput(found?.actualReceipt));
    setExpense(toInput(found?.actualExpense));
    setNotes(found?.notes || "");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const values = [opening, receipt, expense].map(parseInput);
  const complete = values.every((value) => value !== undefined);
  const closing = complete ? values[0]! + values[1]! - values[2]! : null;
  const diff =
    closing === null || !system ? null : closing - Number(system.closing);
  const fields: Array<
    [string, string, (value: string) => void, string | undefined]
  > = [
    ["Đầu kỳ", opening, setOpening, system?.opening],
    ["Thu", receipt, setReceipt, system?.receipt],
    ["Chi", expense, setExpense, system?.expense],
  ];
  const log = saved.data?.log || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <form
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (conflict) return;
          save.mutate(
            {
              id: row?.id,
              branchId,
              closingDate: date,
              actualOpeningBalance: values[0],
              actualReceipt: values[1],
              actualExpense: values[2],
              notes,
            },
            { onSuccess: onClose },
          );
        }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {originalDate
              ? `Chốt sổ ngày ${dayLabel(originalDate)}`
              : "Tạo chốt sổ"}
          </h2>
          <button type="button" title="Đóng" onClick={onClose}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {(!row || canEdit) && (
          <div className="mb-3 max-w-[220px]">
            <InternalFinanceDateField
              variant="filter"
              label="Ngày"
              value={date}
              maxDate={todayInput()}
              // Khi sửa chỉ đổi ngày, giữ nguyên số đang nhập.
              onChange={(value) =>
                value && (row ? setDate(value) : pickDate(value))
              }
            />
            {conflict ? (
              <p className="mt-1 text-xs text-red-600">
                Ngày này đã có chốt sổ khác.
              </p>
            ) : moved ? (
              <p className="mt-1 text-xs text-amber-600">
                Lưu sẽ chuyển chốt sổ sang ngày {dayLabel(date)}.
              </p>
            ) : (
              !row &&
              existing && (
                <p className="mt-1 text-xs text-amber-600">
                  Ngày này đã có chốt sổ, lưu sẽ cập nhật dòng đó.
                </p>
              )
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[110px_1fr_1fr] bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <span />
            <span>Kế toán nhập</span>
            <span className="text-right">Hệ thống</span>
          </div>
          {fields.map(([label, value, setValue, systemValue]) => (
            <div
              key={label}
              className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 border-t px-3 py-2 text-sm">
              <span className="font-medium text-gray-700">{label}</span>
              <input
                inputMode="numeric"
                value={value}
                disabled={!canEdit}
                onChange={(event) => setValue(formatInput(event.target.value))}
                placeholder="0"
                className="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50"
              />
              <span className="text-right tabular-nums text-gray-500">
                {money(systemValue)}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-3 border-t bg-gray-50 px-3 py-2 text-sm font-semibold">
            <span className="text-gray-700">Cuối kỳ</span>
            <span className="pr-2 text-right tabular-nums text-gray-900">
              {closing === null ? "-" : formatCurrency(closing)}
            </span>
            <span className="text-right tabular-nums text-gray-900">
              {money(system?.closing)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Chênh lệch:{" "}
            <strong className={diff ? "text-red-600" : "text-green-700"}>
              {diff === null ? "-" : formatCurrency(diff)}
            </strong>
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setOpening(toInput(system?.opening));
                setReceipt(toInput(system?.receipt));
                setExpense(toInput(system?.expense));
              }}
              className="text-sm font-medium text-brand hover:underline">
              Điền theo số hệ thống
            </button>
          )}
        </div>

        <label className="mt-3 block text-sm font-medium text-gray-700">
          Ghi chú
          <textarea
            value={notes}
            disabled={!canEdit}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border px-2 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50"
          />
        </label>

        {log.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Lịch sử lưu
            </h3>
            <div className="mt-1 divide-y text-xs text-gray-600">
              {log.map((item, index) => {
                const entry = item as Record<string, unknown>;
                const actual = Array.isArray(entry.actual) ? entry.actual : [];
                const system = Array.isArray(entry.system) ? entry.system : [];
                return (
                  <div
                    key={index}
                    className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span>
                      {entry.capturedAt
                        ? new Date(String(entry.capturedAt)).toLocaleString(
                            "vi-VN",
                          )
                        : ""}
                    </span>
                    <span>
                      Kế toán {money(actual[3] as number | null)} · Hệ thống{" "}
                      {money(system[3] as number | null)}
                      {typeof entry.movedFrom === "string" &&
                        ` · Đổi từ ngày ${dayLabel(entry.movedFrom)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          {canEdit && (
            <button
              type="submit"
              disabled={save.isPending || conflict}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Lưu
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
