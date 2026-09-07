"use client";

import { Info } from "lucide-react";
import {
  DebtForm,
  DEBT_FORM_LABELS,
  DEBT_GRACE_DAYS,
  COMMON_TERM_DAYS,
  DebtRuleType,
  PaymentScheduleType,
  UpsertDebtPolicyPayload,
} from "@/lib/api/debt-tracking";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";

/**
 * Giá trị thiết lập công nợ dưới dạng chuỗi để bind trực tiếp vào input.
 * Chuyển đổi sang số chỉ thực hiện lúc submit.
 */
export interface DebtPolicyFormValue {
  debtRuleType: DebtRuleType;
  hasCreditLimit: boolean;
  creditLimit: string;
  hasTermDays: boolean;
  termDays: string;
  paymentFrequency: string;
  debtForm: DebtForm | "";
  salePicId: number | "";
  accountantPicId: number | "";
  requireFullPaymentForInvoice: boolean;
  paymentScheduleType: "MONTHLY" | "WEEKLY" | "";
  paymentScheduleDays: number[];
}

export const EMPTY_DEBT_POLICY_FORM: DebtPolicyFormValue = {
  debtRuleType: "NONE",
  hasCreditLimit: false,
  creditLimit: "",
  hasTermDays: false,
  termDays: "",
  paymentFrequency: "",
  debtForm: "",
  salePicId: "",
  accountantPicId: "",
  requireFullPaymentForInvoice: false,
  paymentScheduleType: "",
  paymentScheduleDays: [],
};

/**
 * Kiểm tra trước khi submit. Trả về thông báo lỗi đầu tiên, null nếu hợp lệ.
 * Dùng chung cho form khách hàng và các chỗ khác để luật không bị lệch.
 */
export function validateDebtPolicyForm(
  v: DebtPolicyFormValue
): string | null {
  if (v.debtRuleType === "TERM_DAYS" && (!v.termDays || Number(v.termDays) < 0)) {
    return "Vui lòng nhập số ngày công nợ";
  }
  if (
    v.debtRuleType === "CREDIT_LIMIT" &&
    (!v.creditLimit || parseNumberInput(v.creditLimit) <= 0)
  ) {
    return "Vui lòng nhập hạn mức công nợ";
  }
  if (
    (v.debtRuleType === "MONTHLY_SCHEDULE" ||
      v.debtRuleType === "WEEKLY_SCHEDULE") &&
    v.paymentScheduleDays.length === 0
  ) {
    return "Vui lòng chọn ít nhất một ngày/thứ thanh toán";
  }
  return null;
}

/** Chuyển giá trị form sang payload gửi API. */
export function toDebtPolicyPayload(
  v: DebtPolicyFormValue,
): UpsertDebtPolicyPayload {
  return {
    hasCreditLimit: v.debtRuleType === "CREDIT_LIMIT",
    ...(v.debtRuleType === "CREDIT_LIMIT"
      ? { creditLimit: parseNumberInput(v.creditLimit) }
      : {}),
    hasTermDays: v.debtRuleType === "TERM_DAYS",
    ...(v.debtRuleType === "TERM_DAYS" ? { termDays: Number(v.termDays) } : {}),
    paymentFrequency:
      v.debtRuleType === "MONTHLY_SCHEDULE" ||
      v.debtRuleType === "WEEKLY_SCHEDULE"
        ? v.paymentScheduleDays.length
        : v.paymentFrequency
          ? Number(v.paymentFrequency)
          : null,
    debtForm: v.debtForm || null,
    salePicId: v.salePicId || null,
    accountantPicId: v.accountantPicId || null,
    // Quy tắc mới là nguồn chân lý của chính sách thanh toán. Cờ này vẫn
    // được gửi để tương thích với policy cũ, nhưng không còn do người dùng
    // chỉnh trực tiếp trên giao diện.
    requireFullPaymentForInvoice: v.debtRuleType === "NONE",
    debtRuleType: v.debtRuleType,
    paymentScheduleType: (
      v.debtRuleType === "MONTHLY_SCHEDULE"
        ? "MONTHLY"
        : v.debtRuleType === "WEEKLY_SCHEDULE"
          ? "WEEKLY"
          : null
    ) as PaymentScheduleType | null,
    paymentScheduleDays:
      v.debtRuleType === "MONTHLY_SCHEDULE" ||
      v.debtRuleType === "WEEKLY_SCHEDULE"
        ? v.paymentScheduleDays
        : null,
  };
}

interface Props {
  value: DebtPolicyFormValue;
  onChange: (patch: Partial<DebtPolicyFormValue>) => void;
  users?: Array<{ id: number; name: string }>;
  /** Ẩn phần chọn người phụ trách khi chỗ dùng không cần. */
  showPic?: boolean;
}

/**
 * Phần thiết lập công nợ của một khách hàng.
 *
 * Đây là cấu hình dài hạn, thường chỉ đặt một lần khi tạo/sửa khách, nên
 * component này được nhúng thẳng vào form khách hàng.
 */
export function DebtPolicyFields({
  value,
  onChange,
  users = [],
  showPic = true,
}: Props) {
  const noPolicy = value.debtRuleType === "NONE";

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Hình Thức Công Nợ
        </label>
        <select
          value={value.debtForm}
          onChange={(e) =>
            onChange({ debtForm: e.target.value as DebtForm | "" })
          }
          className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
        >
          <option value="">— Chưa xác định —</option>
          {(Object.keys(DEBT_FORM_LABELS) as DebtForm[]).map((k) => (
            <option key={k} value={k}>
              {DEBT_FORM_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="border rounded-lg p-4 space-y-4 bg-gray-50/50">
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Mỗi khách hàng chỉ được chọn một loại quy tắc công nợ.</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Loại quy tắc công nợ
          </label>
          <select
            value={value.debtRuleType}
            onChange={(e) => {
              const debtRuleType = e.target.value as DebtRuleType;
              onChange({
                debtRuleType,
                hasCreditLimit: debtRuleType === "CREDIT_LIMIT",
                hasTermDays: debtRuleType === "TERM_DAYS",
                creditLimit: debtRuleType === "CREDIT_LIMIT" ? value.creditLimit : "",
                termDays: debtRuleType === "TERM_DAYS" ? value.termDays : "",
                paymentScheduleType:
                  debtRuleType === "MONTHLY_SCHEDULE"
                    ? "MONTHLY"
                    : debtRuleType === "WEEKLY_SCHEDULE"
                      ? "WEEKLY"
                      : "",
                paymentScheduleDays:
                  debtRuleType === "MONTHLY_SCHEDULE" ||
                  debtRuleType === "WEEKLY_SCHEDULE"
                    ? value.paymentScheduleDays
                    : [],
              });
            }}
            className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
          >
            <option value="NONE">Không công nợ</option>
            <option value="CREDIT_LIMIT">Hạn mức công nợ</option>
            <option value="TERM_DAYS">Công nợ theo số ngày</option>
            <option value="MONTHLY_SCHEDULE">Thanh toán cố định theo tháng</option>
            <option value="WEEKLY_SCHEDULE">Thanh toán cố định theo tuần</option>
          </select>
          {value.debtRuleType === "CREDIT_LIMIT" && (
            <div className="mt-2 ml-6">
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberInput(value.creditLimit)}
                onChange={(e) =>
                  onChange({ creditLimit: formatNumberInput(e.target.value) })
                }
                placeholder="VD: 500000000"
                className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
              />
              {value.creditLimit && parseNumberInput(value.creditLimit) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(parseNumberInput(value.creditLimit))} đ — khi
                  vượt mức, số cần thu là phần vượt.
                </p>
              )}
            </div>
          )}
        </div>

        {value.debtRuleType === "TERM_DAYS" && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Số ngày công nợ
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TERM_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ termDays: String(d) })}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    value.termDays === String(d)
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
              value={value.termDays}
              onChange={(e) => onChange({ termDays: e.target.value })}
              placeholder="Hoặc nhập số ngày khác"
              className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tính từ ngày báo đơn giao hàng; sau đó cộng thêm {DEBT_GRACE_DAYS} ngày ân hạn.
            </p>
          </div>
        )}

        {(value.debtRuleType === "MONTHLY_SCHEDULE" ||
          value.debtRuleType === "WEEKLY_SCHEDULE") && (
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {value.debtRuleType === "MONTHLY_SCHEDULE"
                ? "Ngày thanh toán cố định trong tháng"
                : "Thứ thanh toán cố định trong tuần"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(value.debtRuleType === "MONTHLY_SCHEDULE"
                ? Array.from({ length: 31 }, (_, i) => i + 1)
                : [1, 2, 3, 4, 5, 6, 7]
              ).map((day) => {
                const selected = value.paymentScheduleDays.includes(day);
                const label =
                  value.debtRuleType === "MONTHLY_SCHEDULE"
                    ? String(day)
                    : day === 7
                      ? "CN"
                      : `T${day + 1}`;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      onChange({
                        paymentScheduleDays: selected
                          ? value.paymentScheduleDays.filter((d) => d !== day)
                          : [...value.paymentScheduleDays, day].sort((a, b) => a - b),
                      })
                    }
                    className={`min-w-9 px-2 py-1 rounded text-xs border ${
                      selected
                        ? "bg-brand text-white border-brand"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Đã chọn {value.paymentScheduleDays.length} kỳ. Ngày 30/31 trong tháng ngắn sẽ tính vào ngày cuối tháng.
            </p>
          </div>
        )}

        {noPolicy && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
            Khách không được phép phát sinh công nợ. Phải thanh toán đủ trên
            đơn hàng trước khi xuất hóa đơn.
          </p>
        )}
      </div>

      {showPic && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Sale PIC</label>
            <select
              value={value.salePicId}
              onChange={(e) =>
                onChange({
                  salePicId: e.target.value ? Number(e.target.value) : "",
                })
              }
              className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
            >
              <option value="">— Chưa gán —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Kế Toán Công Nợ PIC
            </label>
            <select
              value={value.accountantPicId}
              onChange={(e) =>
                onChange({
                  accountantPicId: e.target.value
                    ? Number(e.target.value)
                    : "",
                })
              }
              className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
            >
              <option value="">— Chưa gán —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
