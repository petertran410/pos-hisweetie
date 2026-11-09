"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Database } from "lucide-react";
import { C } from "./kdFormat";

// Các khối giao diện nhỏ dùng chung cho các trang Kinh Doanh.

/** Nút chuyển trạng thái (thay bookmark navigator của Power BI). */
export function ViewTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}) {
  return (
    <div className="dt-seg flex-wrap">
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

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[12px] font-bold tracking-wide uppercase"
      style={{ color: C.primary }}>
      ● {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = C.primary,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white px-4 py-3 min-w-0 ${className}`}
      style={{ borderColor: C.line }}>
      <div className="text-[12px]" style={{ color: C.muted }}>
        {label}
      </div>
      <div
        className="text-[22px] font-semibold leading-tight mt-0.5 truncate"
        style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[12px] mt-0.5" style={{ color: C.muted }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/** Thanh ngang + số (cột "bar = …" trong các bảng HTML). */
export function BarCell({
  width,
  text,
  color = C.primary,
  minText = 90,
}: {
  width: number | null | undefined;
  text: ReactNode;
  color?: string;
  minText?: number;
}) {
  const w = Math.max(0, Math.min(100, width ?? 0));
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[40px]"
        style={{ background: C.track }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${w}%`, background: color }}
        />
      </div>
      <span
        className="dt-mono text-right whitespace-nowrap"
        style={{ minWidth: minText }}>
        {text}
      </span>
    </div>
  );
}

export function Pill({
  children,
  color,
  bg,
}: {
  children: ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-block text-[11.5px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
      style={{ color, background: bg }}>
      {children}
    </span>
  );
}

/** Bảng HTML gọn (thay các bảng trong measure htmlContent). */
export function MiniTable({
  head,
  rows,
  empty = "Không có dữ liệu",
}: {
  head: { label: ReactNode; align?: "left" | "right"; width?: string }[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr style={{ background: C.line, color: C.muted }}>
            {head.map((h, i) => (
              <th
                key={i}
                className={`px-2.5 py-1.5 font-semibold whitespace-nowrap ${h.align === "right" ? "text-right" : "text-left"}`}
                style={{ width: h.width }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={head.length}
                className="p-4 text-center"
                style={{ color: C.muted }}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: C.line }}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`px-2.5 py-1.5 ${head[j]?.align === "right" ? "text-right dt-mono whitespace-nowrap" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Block({
  title,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 min-w-0 ${className}`}
      style={{ borderColor: C.line }}>
      {(title || right) && (
        <div className="flex items-center gap-2 mb-2">
          {title && (
            <span
              className="inline-block text-[11.5px] font-semibold px-2.5 py-1 rounded-md"
              style={{ background: C.line, color: C.primary }}>
              {title}
            </span>
          )}
          <div className="flex-1" />
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

/** Panel cho biểu đồ Power BI chưa có nguồn dữ liệu trong POS. */
export function Unavailable({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <div className="dt-panel p-4">
      <div className="text-[14px] font-bold mb-1">{title}</div>
      <div
        className="flex items-start gap-2 text-[12.5px] rounded-lg px-3 py-2"
        style={{ background: "#FBF3DF", color: "#7A5F1E" }}>
        <Database className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Chưa có nguồn dữ liệu — {reason}</span>
      </div>
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="dt-panel p-6 text-center text-[13px] text-red-600 flex items-center justify-center gap-2">
      <AlertTriangle className="w-4 h-4" />
      Không tải được báo cáo: {(error as Error)?.message ?? String(error)}
    </div>
  );
}

export function Skeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="dt-sk h-[220px] rounded-xl" />
      ))}
    </div>
  );
}

export function UpdatedAt({ at }: { at?: string }) {
  if (!at) return null;
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}
