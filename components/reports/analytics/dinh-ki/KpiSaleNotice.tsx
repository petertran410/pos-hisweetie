"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { reportHref } from "../reportRegistry";

/**
 * Định Kì › KPI Sale: trang Power BI cùng tên chỉ có thanh tiêu đề + điều hướng
 * (không có biểu đồ / bảng nào) — giữ trang để đủ điều hướng như Power BI.
 */
export function KpiSaleNotice() {
  return (
    <div className="dt-panel p-8 text-center space-y-3">
      <p
        className="text-[13.5px]"
        style={{ color: "var(--dt-text-secondary)" }}>
        Trang “KPI Sale” của báo cáo Định Kì trên Power BI không có biểu đồ nào
        (chỉ có thanh tiêu đề và nút chuyển trang).
      </p>
      <p className="text-[13px]" style={{ color: "var(--dt-text-muted)" }}>
        Số liệu KPI theo nhân viên sale nằm ở báo cáo Phân tích › KPI Sale.
      </p>
      <Link
        href={reportHref("kpi-sale")}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg"
        style={{
          background: "var(--dt-primary-soft, #E0F6F9)",
          color: "var(--dt-primary)",
        }}>
        Mở báo cáo KPI Sale
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
