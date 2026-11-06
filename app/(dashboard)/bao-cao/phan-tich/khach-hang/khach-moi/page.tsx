"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhNewCustomersView } from "@/components/reports/analytics/khach-hang/KhNewCustomersView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhFilterOptions,
  useKhNewCustomers,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Phân tích › Khách Hàng › New Customer (thay trang Power BI cùng tên).
export default function Page() {
  const [filters, setFilters] = useState<KhFilters>({
    year: new Date().getFullYear(),
  });
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhNewCustomers(filters);

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={
        <KhPeriodNote
          fetching={isFetching}
          period={data?.period}
          compare={data?.compareRange}
        />
      }>
      <KhFilterBar filters={filters} onChange={setFilters} options={options} />
      <div
        className="flex items-center gap-2 text-[12.5px] px-3 py-2 rounded-lg"
        style={{ background: "#E3EEF0", color: "#1A5F6A" }}>
        <Info className="w-4 h-4 shrink-0" />
        Trang “New Customer” trên Power BI chỉ có bộ lọc, chưa có biểu đồ. Trang
        này dựng từ các chỉ số khách mới của báo cáo (Khách mới, DS Khách Mới).
        Bộ lọc hàng không ảnh hưởng (số tính trên hoá đơn).
      </div>
      <KhStatus
        error={error}
        loading={isLoading || !data}
        noPeriod={!!data && !data.period}
        year={filters.year}>
        {data?.period && (
          <>
            <KhNewCustomersView data={data} />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
