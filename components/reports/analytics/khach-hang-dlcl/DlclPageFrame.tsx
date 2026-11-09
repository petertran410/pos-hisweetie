"use client";

import type { ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";
import type { DlclPeriod } from "@/lib/api/analytics-khach-hang-dlcl";
import { periodText } from "./dlclFormat";

/** Phần "Kỳ: …" ở góc phải thanh tab (giống trang Tổng Quan). */
export function DlclPeriodBadge({
  period,
  fetching,
}: {
  period?: DlclPeriod | null;
  fetching?: boolean;
}) {
  return (
    <div
      className="text-[12px] flex items-center gap-2"
      style={{ color: "var(--dt-text-muted)" }}>
      {fetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {period && <span>Kỳ: {periodText(period)}</span>}
    </div>
  );
}

/** Trạng thái tải / lỗi / kỳ rỗng; có dữ liệu thì vẽ children(data). */
export function DlclBody<
  T extends { period: DlclPeriod | null; updatedAt?: string },
>({
  data,
  isLoading,
  error,
  year,
  children,
}: {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  year: number;
  children: (data: T) => ReactNode;
}) {
  if (error) {
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="dt-sk h-[300px] rounded-xl" />
        <div className="dt-sk h-[300px] rounded-xl" />
      </div>
    );
  }
  if (!data.period) {
    return (
      <div
        className="dt-panel p-8 text-center text-[13px]"
        style={{ color: "var(--dt-text-muted)" }}>
        Kỳ đã chọn chưa có ngày nào (năm {year} chưa bắt đầu).
      </div>
    );
  }
  return (
    <>
      {children(data)}
      {data.updatedAt && (
        <div
          className="text-[11.5px] text-right"
          style={{ color: "var(--dt-text-muted)" }}>
          Dữ liệu cập nhật vào lúc{" "}
          {new Date(data.updatedAt).toLocaleString("vi-VN")}
        </div>
      )}
    </>
  );
}

/** Ghi chú nhỏ (lọc cố định của trang, nguồn khách chương trình…). */
export function DlclNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 text-[12.5px] px-3 py-2 rounded-lg"
      style={{ background: "#EEF7F8", color: "#1A5F6A" }}>
      <Info className="w-4 h-4 shrink-0 mt-px" />
      <div>{children}</div>
    </div>
  );
}

/** Nút chọn trục Ngày / Thứ / Tháng (auto_period). */
export function AxisSeg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="dt-seg dt-seg-sm">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          data-on={value === o.key}
          onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const AXIS_OPTIONS = [
  { key: "day" as const, label: "Ngày" },
  { key: "weekday" as const, label: "Thứ" },
  { key: "month" as const, label: "Tháng" },
];
