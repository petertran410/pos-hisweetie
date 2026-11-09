"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { AnalyticsReportShell } from "@/components/reports/analytics/AnalyticsReportShell";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { KhFilterBar } from "@/components/reports/analytics/khach-hang/KhFilterBar";
import { KhDemandView } from "@/components/reports/analytics/khach-hang/KhDemandView";
import {
  KhPeriodNote,
  KhStatus,
  UpdatedAt,
} from "@/components/reports/analytics/khach-hang/KhCharts";
import type { KhFilters } from "@/lib/api/analytics-khach-hang";
import {
  useKhDemand,
  useKhFilterOptions,
} from "@/lib/hooks/useAnalyticsKhachHang";

const UNITS = [
  { key: "base", label: "Gói" },
  { key: "bulk", label: "Thùng" },
] as const;

// Phân tích › Khách Hàng › Demand (thay trang Power BI cùng tên).
// Nguồn demand: module Demand khách hàng của POS (cùng nguồn LarkBase với fact_demand).
export default function Page() {
  const [filters, setFilters] = useState<KhFilters>({
    year: new Date().getFullYear(),
  });
  const [unit, setUnit] = useState<"base" | "bulk">("base");
  const [customerCode, setCustomerCode] = useState<string | undefined>();
  const { data: options } = useKhFilterOptions();
  const { data, isLoading, isFetching, error } = useKhDemand({
    year: filters.year,
    months: filters.months,
    unit,
    customerCode,
  });

  return (
    <AnalyticsReportShell
      report="khach-hang"
      right={<KhPeriodNote fetching={isFetching} />}>
      <KhFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        hideCustomer
        hideProduct
        extra={
          <>
            <div className="w-64">
              <FilterSearchableSelect
                options={(data?.customers ?? []).map((c) => ({
                  value: c.code,
                  label: c.name,
                }))}
                value={customerCode ?? ""}
                onChange={(v) => setCustomerCode(v || undefined)}
                placeholder="Tên khách: Tất cả"
              />
            </div>
            <div className="dt-seg">
              {UNITS.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  data-on={unit === u.key}
                  onClick={() => setUnit(u.key)}>
                  {u.label}
                </button>
              ))}
            </div>
          </>
        }
      />
      <div
        className="flex items-center gap-2 text-[12.5px] px-3 py-2 rounded-lg"
        style={{ background: "#E3EEF0", color: "#1A5F6A" }}>
        <Info className="w-4 h-4 shrink-0" />
        Demand lấy từ module Demand khách hàng của POS (tháng đã xác nhận). Thực
        tế = số lượng bán cho các khách có demand trong ô đó. Danh sách khách
        theo dõi sửa ở trang Cấu hình.
      </div>
      <KhStatus error={error} loading={isLoading || !data}>
        {data && (
          <>
            <KhDemandView data={data} />
            <UpdatedAt at={data.updatedAt} />
          </>
        )}
      </KhStatus>
    </AnalyticsReportShell>
  );
}
