"use client";

// Dòng "Nợ hiện tại" dưới ô khách ở giỏ bán hàng (OrderCart, InvoiceCart),
// kèm hình thức + quy tắc công nợ để người bán biết khách có được nợ không.

import { DEBT_FORM_LABELS, describeDebtRule } from "@/lib/api/debt-tracking";
import { useCustomerDebtPolicy } from "@/lib/hooks/useCustomers";

interface CustomerDebtLineProps {
  customerId?: number;
  totalDebt?: number | string | null;
}

export function CustomerDebtLine({
  customerId,
  totalDebt,
}: CustomerDebtLineProps) {
  const { data, isSuccess } = useCustomerDebtPolicy(customerId);
  const policy = data?.policy;
  const debt = Number(totalDebt) || 0;
  const rule = describeDebtRule(policy);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="text-gray-500">Nợ hiện tại:</span>
        <span
          className={`font-semibold tabular-nums ${
            debt > 0 ? "text-red-600" : "text-gray-400"
          }`}>
          {debt.toLocaleString("vi-VN")}
        </span>
      </span>

      {isSuccess && (
        <>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Hình thức công nợ:</span>
            <span
              className={
                policy?.debtForm ? "font-medium text-gray-700" : "text-gray-400"
              }>
              {policy?.debtForm
                ? DEBT_FORM_LABELS[policy.debtForm]
                : "Chưa xác định"}
            </span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Quy tắc công nợ:</span>
            <span
              className={
                rule.unset ? "text-gray-400" : "font-medium text-gray-700"
              }>
              {rule.label}
              {rule.detail && ` (${rule.detail})`}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
