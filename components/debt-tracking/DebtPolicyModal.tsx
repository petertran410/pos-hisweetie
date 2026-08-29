"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import {
  useDebtPolicy,
  useUpsertDebtPolicy,
} from "@/lib/hooks/useDebtTracking";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  DebtPolicyFields,
  EMPTY_DEBT_POLICY_FORM,
  toDebtPolicyPayload,
  validateDebtPolicyForm,
  type DebtPolicyFormValue,
} from "./DebtPolicyFields";

/**
 * Chỉnh nhanh thiết lập công nợ ngay trên danh sách theo dõi.
 *
 * Nơi thiết lập CHÍNH là form khách hàng (tab "Công nợ"); modal này chỉ để
 * kế toán sửa nhanh khi đang rà soát danh sách mà không phải rời trang.
 * Dùng chung DebtPolicyFields nên luật nhập liệu luôn giống nhau.
 */
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
  const { data: usersData } = useUsersForFilter();
  const upsert = useUpsertDebtPolicy();

  const [form, setForm] = useState<DebtPolicyFormValue>(EMPTY_DEBT_POLICY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const policy = data?.policy;
  if (policy && loadedId !== policy.id) {
    setLoadedId(policy.id);
    setForm({
      hasCreditLimit: policy.hasCreditLimit,
      creditLimit:
        policy.creditLimit != null ? String(Number(policy.creditLimit)) : "",
      hasTermDays: policy.hasTermDays,
      termDays: policy.termDays != null ? String(policy.termDays) : "",
      paymentFrequency:
        policy.paymentFrequency != null ? String(policy.paymentFrequency) : "",
      debtForm: policy.debtForm ?? "",
      salePicId: policy.salePicId ?? "",
      accountantPicId: policy.accountantPicId ?? "",
    });
  }

  const handleSave = () => {
    const err = validateDebtPolicyForm(form);
    setError(err);
    if (err) return;

    upsert.mutate(
      { customerId, payload: toDebtPolicyPayload(form) },
      { onSuccess: onClose }
    );
  };

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
          <div className="p-5 space-y-4 overflow-auto flex-1">
            <DebtPolicyFields
              value={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              users={usersData ?? []}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t">
          <a
            href="/khach-hang"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand">
            <ExternalLink className="w-3.5 h-3.5" />
            Thiết lập đầy đủ ở trang Khách hàng
          </a>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={upsert.isPending}
              className="px-4 py-2 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
