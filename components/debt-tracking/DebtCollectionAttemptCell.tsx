"use client";

import { useState } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import {
  CollectionAttempt,
  CollectionAttemptRole,
} from "@/lib/api/debt-tracking";
import {
  useCreateCollectionAttempt,
  useEditCollectionAttempt,
} from "@/lib/hooks/useDebtTracking";

const ROLE_LABELS: Record<CollectionAttemptRole, string> = {
  ACCOUNTANT: "kế toán",
  SALES: "sale",
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function addDays(value: string | undefined, days: number) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DebtCollectionAttemptCell({
  customerId,
  role,
  attempts,
}: {
  customerId: number;
  role: CollectionAttemptRole;
  attempts: CollectionAttempt[];
}) {
  const [calendar, setCalendar] = useState<{
    mode: "create" | "edit";
    attempt?: CollectionAttempt;
  } | null>(null);
  const createAttempt = useCreateCollectionAttempt();
  const editAttempt = useEditCollectionAttempt();
  const pending = createAttempt.isPending || editAttempt.isPending;
  const lastDate = attempts.at(-1)?.attemptDate;
  const currentDate = calendar?.attempt?.attemptDate;
  const currentIndex = currentDate
    ? attempts.findIndex((attempt) => attempt.id === calendar?.attempt?.id)
    : -1;
  const previousDate =
    currentIndex > 0
      ? addDays(attempts[currentIndex - 1]?.attemptDate, 1)
      : undefined;
  const nextDate =
    currentIndex >= 0 && currentIndex < attempts.length - 1
      ? addDays(attempts[currentIndex + 1]?.attemptDate, -1)
      : undefined;
  const createMinDate = addDays(lastDate, 1);

  const handleDateChange = async (attemptDate: string) => {
    if (!calendar || pending) return;
    if (calendar.mode === "create") {
      createAttempt.mutate(
        { customerId, role, attemptDate },
        { onSettled: () => setCalendar(null) },
      );
      return;
    }

    const result = await Swal.fire({
      title: "Chỉnh sửa ngày đòi nợ",
      text: "Ngày cũ vẫn được giữ lại trong lịch sử.",
      input: "textarea",
      inputPlaceholder: "Lý do chỉnh sửa…",
      showCancelButton: true,
      confirmButtonText: "Lưu chỉnh sửa",
      cancelButtonText: "Hủy",
      inputValidator: (value) =>
        !value?.trim() ? "Vui lòng nhập lý do chỉnh sửa" : undefined,
    });
    if (!result.isConfirmed || !result.value) return;

    editAttempt.mutate(
      {
        customerId,
        attemptId: calendar.attempt!.id,
        attemptDate,
        reason: result.value,
      },
      { onSettled: () => setCalendar(null) },
    );
  };

  return (
    <div className="relative min-w-[150px]">
      <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
        {attempts.map((attempt, index) => (
          <div
            key={attempt.id}
            className="group flex items-center gap-1 text-xs text-gray-700 whitespace-nowrap"
            title={`Ghi nhận bởi ${attempt.recordedBy.name} lúc ${new Date(
              attempt.recordedAt,
            ).toLocaleString("vi-VN")}`}>
            <button
              type="button"
              onClick={() => setCalendar({ mode: "edit", attempt })}
              disabled={pending}
              className="hover:text-brand hover:underline text-left">
              Lần {index + 1}: {displayDate(attempt.attemptDate)}
            </button>
            <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setCalendar({ mode: "create" })}
        disabled={pending}
        className="mt-1 inline-flex items-center gap-0.5 text-xs text-brand hover:underline disabled:opacity-50">
        {pending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-3 h-3" />
        )}
        Thêm
      </button>
      {calendar && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64">
          <MiniCalendar
            value={calendar.attempt?.attemptDate ?? lastDate ?? todayKey()}
            minDate={
              calendar.mode === "create" ? createMinDate : previousDate
            }
            maxDate={nextDate ?? todayKey()}
            onChange={(value) => void handleDateChange(value)}
            onClose={() => setCalendar(null)}
          />
        </div>
      )}
      <span className="sr-only">Theo dõi lần đòi nợ {ROLE_LABELS[role]}</span>
    </div>
  );
}
