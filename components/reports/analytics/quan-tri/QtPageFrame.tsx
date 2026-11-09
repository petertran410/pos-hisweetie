"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { QtPeriod } from "@/lib/api/analytics-quan-tri";

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

/** Dòng "Kỳ: … · So với: …" ở góc phải thanh tab. */
export function QtPeriodInfo({
  period,
  compareRange,
  fetching,
}: {
  period?: QtPeriod | null;
  compareRange?: { from: string; to: string } | null;
  fetching?: boolean;
}) {
  return (
    <div
      className="text-[12px] flex items-center gap-2"
      style={{ color: "var(--dt-text-muted)" }}>
      {fetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {period && (
        <span>
          Kỳ: {fmtDate(period.from)} – {fmtDate(period.to)}
          {compareRange && (
            <>
              {" "}
              · So với: {fmtDate(compareRange.from)} –{" "}
              {fmtDate(compareRange.to)}
            </>
          )}
        </span>
      )}
    </div>
  );
}

/** Trạng thái tải / lỗi / kỳ rỗng chung cho các trang Quản Trị. */
export function QtBody({
  error,
  loading,
  emptyPeriod,
  year,
  children,
}: {
  error: unknown;
  loading: boolean;
  emptyPeriod: boolean;
  year: number;
  children: ReactNode;
}) {
  if (error) {
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dt-sk h-[132px] rounded-xl" />
          ))}
        </div>
        <div className="dt-sk h-[340px] rounded-xl" />
        <div className="dt-sk h-[340px] rounded-xl" />
      </div>
    );
  }
  if (emptyPeriod) {
    return (
      <div
        className="dt-panel p-8 text-center text-[13px]"
        style={{ color: "var(--dt-text-muted)" }}>
        Kỳ đã chọn chưa có ngày nào (năm {year} chưa bắt đầu).
      </div>
    );
  }
  return <>{children}</>;
}

export function QtUpdatedAt({ at }: { at?: string }) {
  if (!at) return null;
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}

/** Ghi chú khác biệt có chủ đích so với Power BI. */
export function QtNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[12px] px-3 py-2 rounded-lg"
      style={{ background: "#F3F8F9", color: "var(--dt-text-secondary)" }}>
      {children}
    </div>
  );
}
