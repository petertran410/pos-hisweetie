"use client";

import { AlertCircle, Inbox, RotateCcw } from "lucide-react";

const sk = (h: number, extra = "") => (
  <div className={`dt-sk ${extra}`} style={{ height: h }} />
);

/** Skeleton cùng bố cục với dashboard thật để trang không "nhảy" khi dữ liệu về. */
export function LeadDashboardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải dashboard Lead">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dt-panel p-[18px] space-y-3">
            <div className="flex items-center gap-2">
              {sk(34, "w-[34px]")}
              {sk(12, "flex-1")}
            </div>
            {sk(28, "w-2/3")}
            {sk(10, "w-1/2")}
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dt-panel p-4 space-y-3">
            {sk(16, "w-1/2")}
            {sk(44)}
            {sk(44)}
            {sk(44)}
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="dt-panel p-4 space-y-3">
          {sk(16, "w-1/3")}
          {sk(36)}
          {sk(36, "w-5/6")}
          {sk(36, "w-2/3")}
          {sk(36, "w-1/2")}
          {sk(36, "w-1/3")}
        </div>
        <div className="dt-panel p-4 space-y-3">
          {sk(16, "w-1/3")}
          {sk(268)}
        </div>
      </div>
      <div className="dt-panel p-4 space-y-3">
        {sk(16, "w-1/4")}
        {sk(260)}
      </div>
      <div className="dt-panel p-4 space-y-3">
        {sk(16, "w-1/4")}
        {sk(36)}
        {sk(36)}
        {sk(36)}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dt-panel min-h-[360px] grid place-items-center p-8 text-center"
      role="status">
      <div className="max-w-sm">{children}</div>
    </div>
  );
}

export function LeadEmpty({ onReset }: { onReset?: () => void }) {
  return (
    <Center>
      <Inbox className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--dt-cyan-soft)" }} />
      <p className="font-semibold mb-1">Không có lead trong kỳ này</p>
      <p className="text-sm mb-4" style={{ color: "var(--dt-text-muted)" }}>
        Thử mở rộng khoảng thời gian hoặc bỏ bớt bộ lọc nguồn / phân loại / nhân sự.
      </p>
      {onReset && (
        <button type="button" onClick={onReset} className="dt-btn-ghost px-4 py-2 rounded-lg text-sm font-medium">
          Xoá bộ lọc
        </button>
      )}
    </Center>
  );
}

export function LeadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Center>
      <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--dt-error)" }} />
      <p className="font-semibold mb-1">Không tải được dashboard Lead</p>
      <p className="text-sm mb-4" style={{ color: "var(--dt-text-muted)" }}>
        Có lỗi khi lấy dữ liệu. Kiểm tra kết nối rồi thử lại.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ background: "var(--dt-primary)" }}>
        <RotateCcw className="w-4 h-4" />
        Thử lại
      </button>
    </Center>
  );
}
