"use client";

import {
  Info,
  Ban,
  Wallet,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ShieldCheck,
  FileSignature,
  Truck,
  Banknote,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
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
  requireFullPaymentForInvoice: false,
  paymentScheduleType: "",
  paymentScheduleDays: [],
};

/**
 * Kiểm tra trước khi submit. Trả về thông báo lỗi đầu tiên, null nếu hợp lệ.
 * Dùng chung cho form khách hàng và các chỗ khác để luật không bị lệch.
 */
export function validateDebtPolicyForm(v: DebtPolicyFormValue): string | null {
  if (
    v.debtRuleType === "TERM_DAYS" &&
    (!v.termDays || Number(v.termDays) < 0)
  ) {
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
    // Quy tắc mới là nguồn chân lý của chính sách thanh toán. Cờ này vẫn
    // được gửi để tương thích với policy cũ, nhưng không còn do người dùng
    // chỉnh trực tiếp trên giao diện.
    requireFullPaymentForInvoice: v.debtRuleType === "NONE",
    debtRuleType: v.debtRuleType,
    paymentScheduleType: (v.debtRuleType === "MONTHLY_SCHEDULE"
      ? "MONTHLY"
      : v.debtRuleType === "WEEKLY_SCHEDULE"
        ? "WEEKLY"
        : null) as PaymentScheduleType | null,
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
}

const DEBT_FORM_ICONS: Record<DebtForm, LucideIcon> = {
  TRUST: ShieldCheck,
  CONTRACT: FileSignature,
  COD: Truck,
  PREPAID: Banknote,
};

const DEBT_RULES: {
  value: DebtRuleType;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    value: "NONE",
    label: "Không công nợ",
    description: "Thanh toán đủ trên đơn trước khi xuất hóa đơn",
    Icon: Ban,
  },
  {
    value: "CREDIT_LIMIT",
    label: "Hạn mức công nợ",
    description: "Cho nợ tối đa một số tiền",
    Icon: Wallet,
  },
  {
    value: "TERM_DAYS",
    label: "Theo số ngày",
    description: "Thanh toán trong N ngày kể từ ngày giao",
    Icon: CalendarClock,
  },
  {
    value: "MONTHLY_SCHEDULE",
    label: "Cố định theo tháng",
    description: "Thanh toán vào các ngày chọn trong tháng",
    Icon: CalendarDays,
  },
  {
    value: "WEEKLY_SCHEDULE",
    label: "Cố định theo tuần",
    description: "Thanh toán vào các thứ chọn trong tuần",
    Icon: CalendarRange,
  },
];

const WEEKDAY_LABEL = (day: number) => (day === 7 ? "CN" : `T${day + 1}`);

const INPUT_CLASS =
  "h-[42px] w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--dt-color-primary-ring)]";

const optionCardClass = (selected: boolean) =>
  `flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
    selected
      ? "border-brand bg-brand-soft shadow-[0_0_0_1px_var(--dt-color-primary)]"
      : "bg-white hover:border-brand-border-strong hover:bg-gray-50"
  }`;

const iconBoxClass = (selected: boolean) =>
  `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
    selected ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
  }`;

function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Phần thiết lập công nợ của một khách hàng.
 *
 * Đây là cấu hình dài hạn, thường chỉ đặt một lần khi tạo/sửa khách, nên
 * component này được nhúng thẳng vào form khách hàng.
 */
export function DebtPolicyFields({ value, onChange }: Props) {
  const isSchedule =
    value.debtRuleType === "MONTHLY_SCHEDULE" ||
    value.debtRuleType === "WEEKLY_SCHEDULE";
  const activeRule = DEBT_RULES.find((r) => r.value === value.debtRuleType);

  const selectRule = (debtRuleType: DebtRuleType) =>
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

  const toggleScheduleDay = (day: number) => {
    const selected = value.paymentScheduleDays.includes(day);
    onChange({
      paymentScheduleDays: selected
        ? value.paymentScheduleDays.filter((d) => d !== day)
        : [...value.paymentScheduleDays, day].sort((a, b) => a - b),
    });
  };

  const creditLimitNumber = parseNumberInput(value.creditLimit);

  return (
    <div className="space-y-6">
      {/* ===== Hình thức công nợ ===== */}
      <div>
        <SectionHead
          title="Hình thức công nợ"
          hint="Cách khách thường thanh toán"
          action={
            value.debtForm ? (
              <button
                type="button"
                onClick={() => onChange({ debtForm: "" })}
                className="text-xs font-medium text-gray-500 transition-colors hover:text-brand">
                Bỏ chọn
              </button>
            ) : (
              <span className="text-xs text-gray-400">Chưa xác định</span>
            )
          }
        />
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {(Object.keys(DEBT_FORM_LABELS) as DebtForm[]).map((k) => {
            const selected = value.debtForm === k;
            const Icon = DEBT_FORM_ICONS[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ debtForm: selected ? "" : k })}
                className={optionCardClass(selected)}>
                <span className={iconBoxClass(selected)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                  {DEBT_FORM_LABELS[k]}
                </span>
                {selected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Quy tắc công nợ ===== */}
      <div>
        <SectionHead
          title="Quy tắc công nợ"
          hint="Mỗi khách hàng chỉ áp dụng một quy tắc"
        />
        <div
          role="radiogroup"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEBT_RULES.map(({ value: rule, label, description, Icon }) => {
            const selected = value.debtRuleType === rule;
            return (
              <button
                key={rule}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectRule(rule)}
                className={`${optionCardClass(selected)} ${
                  rule === "NONE" ? "sm:col-span-2" : ""
                }`}>
                <span className={iconBoxClass(selected)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900">
                    {label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {description}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-brand" : "border-gray-300"
                  }`}>
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-brand" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Cấu hình chi tiết theo quy tắc ── */}
        {value.debtRuleType === "NONE" ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Khách không được phép phát sinh công nợ. Phải thanh toán đủ trên
              đơn hàng trước khi xuất hóa đơn.
            </span>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border bg-gray-50 p-4">
            {activeRule && (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <activeRule.Icon className="h-3.5 w-3.5" />
                {activeRule.label}
              </p>
            )}

            {value.debtRuleType === "CREDIT_LIMIT" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Hạn mức tối đa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(value.creditLimit)}
                    onChange={(e) =>
                      onChange({
                        creditLimit: formatNumberInput(e.target.value),
                      })
                    }
                    placeholder="VD: 500,000,000"
                    className={`${INPUT_CLASS} pr-9 text-right font-medium tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    đ
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {creditLimitNumber > 0
                    ? `${formatCurrency(creditLimitNumber)} đ — khi vượt mức, số cần thu là phần vượt.`
                    : "Khi tổng nợ vượt hạn mức, số cần thu là phần vượt."}
                </p>
              </div>
            )}

            {value.debtRuleType === "TERM_DAYS" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Số ngày công nợ
                </label>
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {COMMON_TERM_DAYS.map((d) => {
                    const selected = value.termDays === String(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onChange({ termDays: String(d) })}
                        className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                          selected
                            ? "border-brand bg-brand text-white"
                            : "bg-white text-gray-700 hover:border-brand-border-strong"
                        }`}>
                        {d} ngày
                      </button>
                    );
                  })}
                </div>
                <div className="relative max-w-[220px]">
                  <input
                    type="number"
                    min={0}
                    value={value.termDays}
                    onChange={(e) => onChange({ termDays: e.target.value })}
                    placeholder="Số ngày khác"
                    className={`${INPUT_CLASS} pr-14 tabular-nums`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    ngày
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Tính từ ngày báo đơn giao hàng; sau đó cộng thêm{" "}
                  {DEBT_GRACE_DAYS} ngày ân hạn.
                </p>
              </div>
            )}

            {isSchedule && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    {value.debtRuleType === "MONTHLY_SCHEDULE"
                      ? "Ngày thanh toán trong tháng"
                      : "Thứ thanh toán trong tuần"}
                  </label>
                  {value.paymentScheduleDays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ paymentScheduleDays: [] })}
                      className="text-xs font-medium text-gray-500 transition-colors hover:text-brand">
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
                <div className="grid max-w-md grid-cols-7 gap-1.5">
                  {(value.debtRuleType === "MONTHLY_SCHEDULE"
                    ? Array.from({ length: 31 }, (_, i) => i + 1)
                    : [1, 2, 3, 4, 5, 6, 7]
                  ).map((day) => {
                    const selected = value.paymentScheduleDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleScheduleDay(day)}
                        className={`h-9 rounded-lg border text-sm font-medium tabular-nums transition-colors ${
                          selected
                            ? "border-brand bg-brand text-white"
                            : "bg-white text-gray-700 hover:border-brand-border-strong hover:bg-gray-50"
                        }`}>
                        {value.debtRuleType === "MONTHLY_SCHEDULE"
                          ? day
                          : WEEKDAY_LABEL(day)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {value.paymentScheduleDays.length > 0 ? (
                    <>
                      Đã chọn {value.paymentScheduleDays.length} kỳ:{" "}
                      <span className="font-medium text-gray-700">
                        {value.paymentScheduleDays
                          .map((d) =>
                            value.debtRuleType === "MONTHLY_SCHEDULE"
                              ? `ngày ${d}`
                              : WEEKDAY_LABEL(d),
                          )
                          .join(", ")}
                      </span>
                    </>
                  ) : (
                    "Chưa chọn kỳ nào."
                  )}
                  {value.debtRuleType === "MONTHLY_SCHEDULE" &&
                    " Ngày 30/31 trong tháng ngắn sẽ tính vào ngày cuối tháng."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
