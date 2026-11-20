"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { HandCoins, X } from "lucide-react";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { NumericInput } from "@/components/ui/NumericInput";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useCreateFuelAdvanceEntry } from "@/lib/hooks/useInternalFinance";

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
const todayKey = () =>
  new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Nhập khoản ứng xăng Kho HN đã đi tiền ngoài đơn PHIẾU CHI Lark: chỉ cộng vào
 * tiền ứng, không ghi quỹ.
 */
export function FuelAdvanceEntryModal({
  startDate,
  onClose,
}: {
  /** Ngày bắt đầu tính tiền ứng (YYYY-MM-DD): không chọn được ngày trước đó. */
  startDate: string;
  onClose: () => void;
}) {
  const today = todayKey();
  const [occurredAt, setOccurredAt] = useState(
    today < startDate ? startDate : today,
  );
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const create = useCreateFuelAdvanceEntry();

  const submit = () => {
    if (!occurredAt) return toast.error("Chọn ngày ứng");
    if (!(amount > 0)) return toast.error("Nhập số tiền ứng");
    create.mutate(
      { occurredAt, amount, note: note.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-lg bg-white"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HandCoins className="h-5 w-5 text-brand" />
            Nhập khoản ứng xăng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            Dùng cho tiền ứng xăng Kho Hà Nội đã đi tiền ngoài đơn PHIẾU CHI
            trên Lark. Khoản này chỉ cộng vào tiền ứng,{" "}
            <strong>không ghi quỹ</strong>. Khoản ứng có đơn PHIẾU CHI thì POS
            tự lấy khi đơn được duyệt, không cần nhập ở đây.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ngày ứng
              </label>
              <DatePickerInput
                value={occurredAt}
                onChange={setOccurredAt}
                minDate={startDate}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Số tiền
              </label>
              <NumericInput
                value={amount}
                onValueChange={setAmount}
                maxFractionDigits={0}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ví dụ: Ứng xăng tháng 11 trước khi lên POS"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          <LoadingButton
            loading={create.isPending}
            onClick={submit}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Lưu
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
