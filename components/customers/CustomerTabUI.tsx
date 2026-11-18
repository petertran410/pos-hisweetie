"use client";

// Thành phần giao diện dùng chung cho mọi màn khách hàng (trang Khách hàng,
// modal khách ở trang Bán hàng, form tạo/sửa): bảng, thẻ thông tin, ô nhập…

import type { ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  type LucideIcon,
} from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

type Align = "left" | "right" | "center";
const alignClass = (a: Align = "left") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

/** Khung bảng: bo góc, cuộn ngang khi hẹp. */
export function TabTable({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
      {footer}
    </div>
  );
}

export function Th({
  children,
  align,
  className,
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
}) {
  return (
    <th
      className={cx(
        "whitespace-nowrap border-b bg-gray-50 px-3 py-2.5 text-xs sm:px-4 font-medium uppercase tracking-wide text-gray-500",
        alignClass(align),
        className,
      )}>
      {children}
    </th>
  );
}

export function Td({
  children,
  align,
  className,
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "border-b px-3 py-2.5 align-middle sm:px-4 text-gray-700 group-last/row:border-b-0",
        alignClass(align),
        className,
      )}>
      {children}
    </td>
  );
}

/** Dòng bảng — dùng cùng Td để dòng cuối không có viền dưới. */
export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="group/row transition-colors hover:bg-gray-50">{children}</tr>
  );
}

/** Ngày + giờ hiển thị 2 dòng gọn. */
export function DateCell({ value }: { value: string | Date }) {
  const d = new Date(value);
  return (
    <div className="whitespace-nowrap leading-tight">
      <div className="text-gray-900">{d.toLocaleDateString("vi-VN")}</div>
      <div className="text-xs text-gray-500">
        {d.toLocaleTimeString("vi-VN")}
      </div>
    </div>
  );
}

/** Nhãn trạng thái dạng viên thuốc. `colorClass` là cặp bg-/text- có sẵn. */
export function StatusPill({
  children,
  colorClass = "bg-gray-100 text-gray-700",
}: {
  children: ReactNode;
  colorClass?: string;
}) {
  return (
    <span
      className={cx(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        colorClass,
      )}>
      {children}
    </span>
  );
}

/** Thanh phân trang đặt dưới bảng. Ẩn khi chỉ có 1 trang. */
export function TabPagination({
  page,
  totalPages,
  total,
  unit,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  unit: string;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-2 border-t bg-white px-4 py-2.5">
      <span className="text-xs text-gray-500">
        Tổng {total} {unit}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Trang trước"
          className={btn}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[48px] text-center text-xs font-medium tabular-nums text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Trang sau"
          className={btn}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Trạng thái trống có icon — dùng chung cho mọi tab. */
export function TabEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-4 py-10 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TabLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand" />
      Đang tải...
    </div>
  );
}

/** Nút phụ (viền) và nút chính cùng kích thước cho thanh công cụ của tab. */
export const TAB_BUTTON_SECONDARY =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50";
export const TAB_BUTTON_PRIMARY =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50";

/** Số tiền: tăng (+) màu chữ thường, giảm (−) màu xanh — thống nhất giữa các tab. */
export function MoneyChange({
  direction,
  formatted,
}: {
  direction: "increase" | "decrease";
  formatted: string;
}) {
  return (
    <span
      className={cx(
        "whitespace-nowrap font-medium tabular-nums",
        direction === "increase" ? "text-gray-900" : "text-green-600",
      )}>
      {direction === "increase" ? "+" : "−"}
      {formatted}
    </span>
  );
}

// ───────────────────────── Form & thẻ thông tin ─────────────────────────

export const FOCUS_RING =
  "focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_var(--dt-color-primary-ring)]";
export const ERROR_RING =
  "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";

/** Ô nhập chuẩn (cao 42px) dùng cho mọi form khách hàng. */
export const inputClass = (hasError?: boolean) =>
  cx(
    "h-[42px] w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors",
    hasError ? ERROR_RING : FOCUS_RING,
  );

export const CUSTOMER_TYPES = [
  {
    value: "0",
    label: "Cá nhân",
    description: "Khách lẻ, người tiêu dùng",
    Icon: User,
  },
  {
    value: "1",
    label: "Tổ chức/Hộ kinh doanh",
    description: "Công ty, cửa hàng, đại lý",
    Icon: Building2,
  },
] as const;

/** Chọn loại khách hàng bằng 2 thẻ có icon. */
export function CustomerTypeCards({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: "0" | "1") => void;
  error?: string | false | null;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {CUSTOMER_TYPES.map(({ value: v, label, description, Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(v)}
              className={cx(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors sm:gap-3 sm:px-3 sm:py-2.5",
                selected
                  ? "border-brand bg-brand-soft shadow-[0_0_0_1px_var(--dt-color-primary)]"
                  : "bg-white hover:border-brand-border-strong hover:bg-gray-50",
                error && "border-red-400",
              )}>
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
                  selected
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-500",
                )}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight text-gray-900">
                  {label}
                </span>
                <span className="mt-0.5 hidden truncate text-xs text-gray-500 sm:block">
                  {description}
                </span>
              </span>
              {selected && (
                <CheckCircle2 className="hidden h-5 w-5 shrink-0 text-brand sm:block" />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Khối có tiêu đề nhỏ in hoa — dùng trong form tạo/sửa khách. */
export function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Nhãn + ô nhập + dòng lỗi. */
export function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string | false | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function StatBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "muted";
}) {
  return (
    <div className="min-w-[120px] rounded-lg border bg-gray-50 px-3 py-1.5">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums ${
          tone === "warn"
            ? "text-orange-600"
            : tone === "danger"
              ? "text-red-600"
              : tone === "muted"
                ? "text-gray-500"
                : "text-gray-900"
        }`}>
        {value}
      </div>
    </div>
  );
}

export function InfoCard({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border bg-white p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InfoItem({
  label,
  value,
  icon: Icon,
  className = "",
}: {
  label: string;
  value?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const empty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim());
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="mb-0.5 flex items-center gap-1 text-xs text-gray-500">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd
        className={`break-words text-sm ${
          empty ? "text-gray-400" : "text-gray-900"
        }`}>
        {empty ? "Chưa có" : value}
      </dd>
    </div>
  );
}
