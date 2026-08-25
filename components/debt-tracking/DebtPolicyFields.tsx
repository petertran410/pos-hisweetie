"use client";

import { Info } from "lucide-react";
import {
  DebtForm,
  DEBT_FORM_LABELS,
  DEBT_GRACE_DAYS,
  COMMON_TERM_DAYS,
} from "@/lib/api/debt-tracking";

/**
 * Giá trị thiết lập công nợ dưới dạng chuỗi để bind trực tiếp vào input.
 * Chuyển đổi sang số chỉ thực hiện lúc submit.
 */
export interface DebtPolicyFormValue {
  hasCreditLimit: boolean;
  creditLimit: string;
  hasTermDays: boolean;
  termDays: string;
  paymentFrequency: string;
  debtForm: DebtForm | "";
  salePicId: number | "";
  accountantPicId: number | "";
}

export const EMPTY_DEBT_POLICY_FORM: DebtPolicyFormValue = {
  hasCreditLimit: false,
  creditLimit: "",
  hasTermDays: false,
  termDays: "",
  paymentFrequency: "",
  debtForm: "",
  salePicId: "",
  accountantPicId: "",
};

/**
 * Kiểm tra trước khi submit. Trả về thông báo lỗi đầu tiên, null nếu hợp lệ.
 * Dùng chung cho form khách hàng và các chỗ khác để luật không bị lệch.
 */
export function validateDebtPolicyForm(
  v: DebtPolicyFormValue
): string | null {
  if (v.hasTermDays && (!v.termDays || Number(v.termDays) < 0)) {
    return "Vui lòng nhập số ngày công nợ";
  }
  if (v.hasCreditLimit && (!v.creditLimit || Number(v.creditLimit) <= 0)) {
    return "Vui lòng nhập hạn mức công nợ";
  }
  return null;
}

/** Chuyển giá trị form sang payload gửi API. */
export function toDebtPolicyPayload(v: DebtPolicyFormValue) {
  return {
    hasCreditLimit: v.hasCreditLimit,
    ...(v.hasCreditLimit ? { creditLimit: Number(v.creditLimit) } : {}),
    hasTermDays: v.hasTermDays,
    ...(v.hasTermDays ? { termDays: Number(v.termDays) } : {}),
    paymentFrequency: v.paymentFrequency ? Number(v.paymentFrequency) : null,
    debtForm: v.debtForm || null,
    salePicId: v.salePicId || null,
    accountantPicId: v.accountantPicId || null,
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
  const noPolicy = !value.hasCreditLimit && !value.hasTermDays;

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
          <span>
            Hai chiều dưới đây <b>độc lập</b>, có thể bật một hoặc cả hai. Bật
            cả hai thì khách chỉ bị tính quá hạn khi thỏa <b>ĐỒNG THỜI</b> cả
            hai điều kiện. Tắt cả hai = không công nợ.
          </span>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.hasCreditLimit}
              onChange={(e) => onChange({ hasCreditLimit: e.target.checked })}
            />
            <span className="text-sm font-medium">Hạn Mức Công Nợ</span>
          </label>
          {value.hasCreditLimit && (
            <div className="mt-2 ml-6">
              <input
                type="number"
                min={0}
                step={1000}
                value={value.creditLimit}
                onChange={(e) => onChange({ creditLimit: e.target.value })}
                placeholder="VD: 500000000"
                className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
              />
              {value.creditLimit && Number(value.creditLimit) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {Number(value.creditLimit).toLocaleString("vi-VN")} đ — nợ
                  chạm mức này là phải thanh toán.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.hasTermDays}
              onChange={(e) => onChange({ hasTermDays: e.target.checked })}
            />
            <span className="text-sm font-medium">Công Nợ Theo Số Ngày</span>
          </label>
          {value.hasTermDays && (
            <div className="mt-2 ml-6">
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
                Tính từ ngày <b>báo đơn giao hàng</b> đầu tiên của mỗi hóa đơn,
                cộng thêm {DEBT_GRACE_DAYS} ngày ân hạn.
              </p>
            </div>
          )}
        </div>

        {noPolicy && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
            Chưa bật chiều nào — khách này sẽ không hiện trong danh sách theo
            dõi công nợ.
          </p>
        )}
      </div>

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
            value={value.paymentFrequency}
            onChange={(e) => onChange({ paymentFrequency: e.target.value })}
            placeholder="—"
            className="w-20 border rounded px-2 py-1.5 text-sm text-center"
          />
          <span className="text-sm text-gray-600">lần</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Chỉ dùng để <b>đếm số lần đã trả</b> trong tháng và nhắc khi chưa đạt.
          Không sinh hạn thanh toán, vì khách không báo ngày cụ thể.
        </p>
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
