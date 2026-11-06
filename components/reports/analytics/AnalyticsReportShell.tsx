"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import { AnalyticsTabs } from "./AnalyticsTabs";
import { findReport, reportHref } from "./reportRegistry";

/**
 * Khung chung cho mọi trang Phân tích:
 *  - kiểm tra quyền xem báo cáo (theo reportRegistry),
 *  - tab báo cáo (cấp 1) + tab trang con (cấp 2, như các trang của report Power BI),
 *  - vùng nội dung tự cuộn.
 * Dùng: <AnalyticsReportShell report="quan-tri" right={...}>…</AnalyticsReportShell>
 */
export function AnalyticsReportShell({
  report,
  right,
  children,
}: {
  report: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const def = findReport(report);
  const pathname = usePathname();
  const router = useRouter();
  const { has } = useReportAccess();

  if (!def || !has(def.perm)) {
    return (
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div>
          <ShieldOff className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-gray-600">Bạn chưa có quyền xem báo cáo này.</p>
        </div>
      </div>
    );
  }

  const base = reportHref(def.slug);
  const currentPage =
    def.pages.find(
      (p) =>
        p.slug &&
        (pathname === `${base}/${p.slug}` ||
          pathname.startsWith(`${base}/${p.slug}/`)),
    )?.slug ?? "";

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 space-y-3 max-w-[1800px]">
        <AnalyticsTabs right={right} />
        {def.pages.length > 1 && (
          <div
            className="flex flex-wrap gap-1 border-b"
            style={{ borderColor: "var(--dt-border)" }}>
            {def.pages.map((p) => {
              const on = p.slug === currentPage;
              return (
                <button
                  key={p.slug || "root"}
                  type="button"
                  onClick={() => router.push(reportHref(def.slug, p.slug))}
                  className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap ${
                    on
                      ? "border-[var(--dt-primary)] text-[var(--dt-primary)]"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Nội dung tạm cho trang chưa làm xong. */
export function AnalyticsPlaceholder({ title }: { title: string }) {
  return (
    <div
      className="dt-panel p-10 text-center text-[13px]"
      style={{ color: "var(--dt-text-muted)" }}>
      Trang “{title}” đang được xây dựng.
    </div>
  );
}
