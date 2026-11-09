"use client";

import { useState } from "react";
import { Banknote, Percent, Tag, TrendingUp, UsersRound } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Panel } from "../shared/AnalyticsCharts";
import type {
  BienThuongMaiReport,
  DlclFilters,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { money, vi } from "@/lib/dashboard/format";
import {
  useDlclOptions,
  useDlclReport,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";
import { DlclFilterBar } from "./DlclFilterBar";
import { DlclPivotTable } from "./DlclPivotTable";
import { pctText } from "./dlclFormat";
import { DlclBody, DlclNote, DlclPeriodBadge } from "./DlclPageFrame";

/**
 * Phân tích › Khách Hàng › Biên Thương Mại — khách buôn × hàng thương hiệu:
 * doanh số giá buôn (thực bán) so với giá lẻ (giá chung của sản phẩm).
 */
export function BienThuongMaiPage() {
  const [filters, setFilters] = useState<DlclFilters>({
    year: new Date().getFullYear(),
  });
  const { data: options } = useDlclOptions();
  const { data, isLoading, isFetching, error } =
    useDlclReport<BienThuongMaiReport>("bien-thuong-mai", filters);

  return (
    <>
      <DlclFilterBar
        filters={filters}
        onChange={setFilters}
        options={options}
        hideMetric
        hide={["customerType", "productType"]}
        status={<DlclPeriodBadge period={data?.period} fetching={isFetching} />}
      />
      <DlclBody
        data={data}
        isLoading={isLoading}
        error={error}
        year={filters.year}>
        {(d) => (
          <>
            <DlclNote>
              Lọc cố định của trang: nhóm khách <b>Khách buôn</b> · ngành{" "}
              <b>Hàng thương hiệu</b>. Giá lẻ = giá chung (giá bán cơ bản) của
              sản phẩm × số lượng.
            </DlclNote>
            {d.cards && (
              <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                <KpiCard
                  name="DS giá buôn"
                  value={money(d.cards.amount)}
                  icon={<Banknote className="w-[18px] h-[18px]" />}
                  iconBg="#E0F6F9"
                  iconColor="#00A5B5"
                  accent="#00B7CC"
                />
                <KpiCard
                  name="DS giá lẻ"
                  value={money(d.cards.general)}
                  icon={<Tag className="w-[18px] h-[18px]" />}
                  iconBg="#E6F2F2"
                  iconColor="#2E8B8F"
                  accent="#2E8B8F"
                />
                <KpiCard
                  name="Lợi nhuận Đại lý"
                  value={money(d.cards.diff)}
                  icon={<TrendingUp className="w-[18px] h-[18px]" />}
                  iconBg="#FBF3DF"
                  iconColor="#9A7A2A"
                  accent="#C9A84C"
                />
                <KpiCard
                  name="Biên thương mại"
                  value={
                    d.cards.margin === null ? "—" : pctText(d.cards.margin)
                  }
                  icon={<Percent className="w-[18px] h-[18px]" />}
                  iconBg="#E3EEF0"
                  iconColor="#1A5F6A"
                  accent="#1A5F6A"
                />
                <KpiCard
                  name="Khách mua hàng"
                  value={vi(d.cards.activeCustomers)}
                  icon={<UsersRound className="w-[18px] h-[18px]" />}
                  iconBg="#EEF7F8"
                  iconColor="#2E8B8F"
                  accent="#A8D8E0"
                />
              </div>
            )}
            <Panel title="So sánh biên lợi nhuận giữa giá bán cho Đại lý và giá lẻ">
              {d.pivot && (
                <DlclPivotTable
                  key={JSON.stringify(filters)}
                  pivot={d.pivot}
                  rowHeader="Tên Khách / Tên Hàng"
                  metric="amount"
                  labels={{
                    amount: "Tổng Tiền Hàng (giá buôn)",
                    general: "Tổng Tiền Giá (giá lẻ)",
                    diff: "Lợi nhuận Đại lý",
                    margin: "Biên Thương Mại",
                  }}
                  maxHeight={640}
                />
              )}
            </Panel>
          </>
        )}
      </DlclBody>
    </>
  );
}
