"use client";

import { useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import {
  DebtForm,
  DEBT_FORM_LABELS,
  DEBT_GRACE_DAYS,
  COMMON_TERM_DAYS,
} from "@/lib/api/debt-tracking";
import { useDebtPolicy, useUpsertDebtPolicy } from "@/lib/hooks/useDebtTracking";

export function DebtPolicyModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: number;
  customerName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useDebtPolicy(customerId);
  const upsert = useUpsertDebtPolicy();

  const [hasCreditLimit, setHasCreditLimit] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [hasTermDays, setHasTermDays] = useState(false);
  const [termDays, setTermDays] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState("");
  const [debtForm, setDebtForm] = useState<DebtForm | "">("");
  const [salePicId, setSalePicId] = useState<number | "">("");
  const [accountantPicId, setAccountantPicId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  // Nạp giá trị hiện có đúng MỘT lần khi dữ liệu về, theo pattern "điều chỉnh
  // state khi render" của React (không dùng effect → không render thừa).
  const policy = data?.policy;
  if (policy && loadedId !== policy.id) {
    setLoadedId(policy.id);
    setHasCreditLimit(policy.hasCreditLimit);
    setCreditLimit(
      policy.creditLimit != null ? String(Number(policy.creditLimit)) : ""
    );
    setHasTermDays(policy.hasTermDays);
    setTermDays(policy.termDays != null ? String(policy.termDays) : "");
    setPaymentFrequency(
      policy.paymentFrequency != null ? String(policy.paymentFrequency) : ""
    );
    setDebtForm(policy.debtForm ?? "");
    setSalePicId(policy.salePicId ?? "");
    setAccountantPicId(policy.accountantPicId ?? "");
  }

  const handleSave = () => {
    setError(null);

    if (hasTermDays && (!termDays || Number(termDays) < 0)) {
      setError("Vui lòng nhập số ngày công nợ");
      return;
    }
    if (hasCreditLimit && (!creditLimit || Number(creditLimit) <= 0)) {
      setError("Vui lòng nhập hạn mức công nợ");
      return;
    }

    upsert.mutate(
      {
        customerId,
        payload: {
          hasCreditLimit,
          ...(hasCreditLimit ? { creditLimit: Number(creditLimit) } : {}),
          hasTermDays,
          ...(hasTermDays ? { termDays: Number(termDays) } : {}),
          paymentFrequency: paymentFrequency ? Number(paymentFrequency) : null,
          debtForm: debtForm || null,
          salePicId: salePicId || null,
          accountantPicId: accountantPicId || null,
        },
      },
      { onSuccess: onClose }
    );
  };

  const noPolicy = !hasCreditLimit && !hasTermDays;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-semibold">Thiết lập công nợ</h3>
            <p className="text-xs text-gray-500 mt-0.5">{customerName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5 overflow-auto flex-1">
            {/* Hình thức công nợ */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Hình Thức Công Nợ
              </label>
              <select
                value={debtForm}
                onChange={(e) => setDebtForm(e.target.value as DebtForm | "")}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">— Chưa xác định —</option>
                {(
                  Object.keys(DEBT_FORM_LABELS) as DebtForm[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {DEBT_FORM_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            {/* Hai chiều công nợ */}
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50/50">
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Hai chiều dưới đây <b>độc lập</b>, có thể bật một hoặc cả hai.
                  Bật cả hai thì khách chỉ bị tính quá hạn khi thỏa{" "}
                  <b>ĐỒNG THỜI</b> cả hai điều kiện. Tắt cả hai = không công nợ.
                </span>
              </div>

              {/* Hạn mức */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasCreditLimit}
                    onChange={(e) => setHasCreditLimit(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Hạn Mức Công Nợ</span>
                </label>
                {hasCreditLimit && (
                  <div className="mt-2 ml-6">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="VD: 500000000"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    {creditLimit && Number(creditLimit) > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Number(creditLimit).toLocaleString("vi-VN")} đ — nợ
                        chạm mức này là phải thanh toán.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Số ngày */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasTermDays}
                    onChange={(e) => setHasTermDays(e.target.checked)}
                  />
                  <span className="text-sm font-medium">
                    Công Nợ Theo Số Ngày
                  </span>
                </label>
                {hasTermDays && (
                  <div className="mt-2 ml-6">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_TERM_DAYS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTermDays(String(d))}
                          className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                            termDays === String(d)
                              ? "bg-brand text-white border-brand"
                              : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          {d} ngày
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={termDays}
                      onChange={(e) => setTermDays(e.target.value)}
                      placeholder="Hoặc nhập số ngày khác"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tính từ ngày <b>báo đơn giao hàng</b> đầu tiên của mỗi hóa
                      đơn, cộng thêm {DEBT_GRACE_DAYS} ngày ân hạn.
                    </p>
                  </div>
                )}
              </div>

              {noPolicy && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  Chưa bật chiều nào — khách này sẽ không hiện trong danh sách
                  theo dõi công nợ.
                </p>
              )}
            </div>

            {/* Tần suất */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Cam Kết Tần Suất Trả Tiền
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">1 tháng</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value)}
                  placeholder="—"
                  className="w-20 border rounded px-2 py-1.5 text-sm text-center"
                />
                <span className="text-sm text-gray-600">lần</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Chỉ dùng để <b>đếm số lần đã trả</b> trong tháng và nhắc khi
                chưa đạt. Không sinh hạn thanh toán, vì khách không báo ngày cụ
                thể.
              </p>
            </div>


            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={upsert.isPending}
            className="px-4 py-2 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
