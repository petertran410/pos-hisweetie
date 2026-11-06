"use client";

// Khối dùng chung nhỏ cho các trang Chuyển Kho / Thu Mua.

import type { ReactNode } from "react";

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="dt-panel p-6 text-center text-[13px] text-red-600">
      Không tải được báo cáo:{" "}
      {(error as Error)?.message ?? "Lỗi không xác định"}
    </div>
  );
}

export function LoadingBlock({ blocks = 1 }: { blocks?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="dt-sk h-[360px] rounded-xl" />
      ))}
    </div>
  );
}

export function UpdatedAt({ at, count }: { at: string; count?: number }) {
  return (
    <div
      className="text-[11.5px] text-right mt-2"
      style={{ color: "var(--dt-text-muted)" }}>
      {count !== undefined && <>{count.toLocaleString("vi-VN")} dòng · </>}
      Dữ liệu cập nhật lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}

/** Panel thông báo khi thiếu nguồn dữ liệu / ghi chú khác Power BI. */
export function NoteBox({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[12.5px] px-3 py-2 rounded-lg"
      style={{ background: "#FBF3DF", color: "#7A5F1E" }}>
      {children}
    </div>
  );
}
