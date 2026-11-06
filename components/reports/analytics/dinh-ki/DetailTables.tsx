"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { FilterSearchableSelect } from "@/components/ui/filters";
import type { DkDetailFilters, DkDetailRow } from "@/lib/api/analytics-dinh-ki";
import {
  useDinhKiDetail,
  useDinhKiFilterOptions,
} from "@/lib/hooks/useAnalyticsDinhKi";
import { AnalyticsTable, type AnalyticsColumn } from "../shared/AnalyticsTable";
import { Panel } from "../shared/AnalyticsCharts";
import { DkAnchorNav, DkLoading, DkUpdated, weekLabel } from "./DkUi";
import { fmtNum, fmtPct } from "./dkFormat";

// Cột tô nền xám như định dạng có điều kiện của Power BI (#e6e6e6).
const GREY = "#EDEDED";
const money = (v: unknown) =>
  v === null || v === undefined ? "" : fmtNum(Number(v));
const pct = (v: unknown) =>
  v === null || v === undefined ? "" : fmtPct(Number(v), 1);

type Row = DkDetailRow;

function kpiColumns(
  nameLabel: string,
  grey: ("current" | "pctPrevious" | "previous")[],
): AnalyticsColumn<Row>[] {
  const bg = (k: string) =>
    grey.includes(k as never) ? () => GREY : undefined;
  return [
    { key: "name", label: nameLabel },
    { key: "target", label: "Kế Hoạch Tuần", align: "right", format: money },
    {
      key: "current",
      label: "Doanh Thu Tuần Này",
      align: "right",
      format: money,
      background: bg("current"),
    },
    {
      key: "pctCurrent",
      label: "Thực Đạt Tuần Này",
      align: "right",
      format: pct,
    },
    {
      key: "previous",
      label: "Doanh Thu Tuần Trước",
      align: "right",
      format: money,
      background: bg("previous"),
    },
    {
      key: "pctPrevious",
      label: "Thực Đạt Tuần Trước",
      align: "right",
      format: pct,
      background: bg("pctPrevious"),
    },
  ];
}

/** Định Kì › Chi Tiết: 4 bảng pivot theo tuần của ngày mốc. */
export function DetailTables() {
  const [filters, setFilters] = useState<DkDetailFilters>({});
  const { data: options } = useDinhKiFilterOptions();
  const { data, error, isLoading, isFetching } = useDinhKiDetail(filters);
  const set = (patch: Partial<DkDetailFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const hasFilter = !!(
    filters.saleTeamId ||
    filters.productGroup ||
    filters.parentName
  );
  const str = (v?: string | number) => (v === undefined ? "" : String(v));

  return (
    <>
      <div className="dt-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-[16px] font-bold">Chi tiết theo tuần</h2>
            {data && (
              <div
                className="text-[12px]"
                style={{ color: "var(--dt-text-muted)" }}>
                Tuần này: {weekLabel(data.ranges.cur.from, data.ranges.cur.to)}{" "}
                · Tuần trước:{" "}
                {weekLabel(data.ranges.prev.from, data.ranges.prev.to)} · Kế
                hoạch tuần = KPI tháng{" "}
                {String(data.kpiMonth.month).padStart(2, "0")}/
                {data.kpiMonth.year} / 4
              </div>
            )}
          </div>
          <DkAnchorNav
            unit="week"
            value={filters.date}
            resolved={data?.anchor}
            today={data?.today}
            onChange={(date) => set({ date })}
            loading={isFetching}
            label={
              data
                ? `Tuần ${weekLabel(data.ranges.cur0.from, data.ranges.cur0.to)}`
                : "…"
            }
          />
        </div>
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSearchableSelect
            options={(options?.saleTeams ?? []).map((t) => ({
              value: String(t.id),
              label: t.name,
            }))}
            value={str(filters.saleTeamId)}
            onChange={(v) => set({ saleTeamId: v ? Number(v) : undefined })}
            placeholder="Nhóm Bán: Tất cả"
          />
          <FilterSearchableSelect
            options={(options?.productGroups ?? []).map((g) => ({
              value: g,
              label: g,
            }))}
            value={str(filters.productGroup)}
            onChange={(v) => set({ productGroup: v || undefined })}
            placeholder="Nhóm Hàng: Tất cả"
          />
          <FilterSearchableSelect
            options={(options?.vipParents ?? []).map((g) => ({
              value: g,
              label: g,
            }))}
            value={str(filters.parentName)}
            onChange={(v) => set({ parentName: v || undefined })}
            placeholder="Tên Khách Key: Tất cả"
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => setFilters({ date: filters.date })}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50 justify-self-start"
              style={{ color: "var(--dt-text-secondary)" }}>
              <RotateCcw className="w-3.5 h-3.5" />
              Xoá lọc
            </button>
          )}
        </div>
      </div>

      {error || isLoading || !data ? (
        <DkLoading error={error} blocks={2} />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-1 2xl:grid-cols-[1fr_1fr] items-start">
            <div className="space-y-3 min-w-0">
              <Panel title="O1: Doanh thu theo nhóm hàng">
                <AnalyticsTable
                  columns={kpiColumns("Nhóm hàng", ["current", "pctPrevious"])}
                  rows={data.groups.rows}
                  totals={{ name: "", ...data.groups.total }}
                  rowKey={(r) => r.name}
                />
              </Panel>
              <Panel title="O2: Doanh thu theo nhóm hàng hóa">
                <AnalyticsTable
                  columns={kpiColumns("Nhóm Hàng", ["previous", "pctPrevious"])}
                  rows={data.visualGroups.rows}
                  totals={{ name: "", ...data.visualGroups.total }}
                  rowKey={(r) => r.name}
                />
              </Panel>
              <Panel title="O3: Doanh số khu vực trọng điểm">
                <AnalyticsTable
                  columns={[
                    { key: "region", label: "Miền" },
                    {
                      key: "current",
                      label: "Doanh Thu Tuần Này",
                      align: "right",
                      format: money,
                    },
                    {
                      key: "previous",
                      label: "Doanh Thu Tuần Trước",
                      align: "right",
                      format: money,
                    },
                  ]}
                  rows={data.regions}
                  rowKey={(r) => r.region}
                />
              </Panel>
            </div>
            <Panel title="Hiệu quả nhân sự">
              <AnalyticsTable
                columns={[
                  { key: "name", label: "Nhân Viên Bán Hàng" },
                  {
                    key: "previous",
                    label: "Doanh Số Tuần Trước",
                    align: "right",
                    format: money,
                  },
                  {
                    key: "current",
                    label: "Doanh Số Tuần Này",
                    align: "right",
                    format: money,
                  },
                ]}
                rows={data.staff}
                rowKey={(r) => r.name}
                maxHeight={760}
              />
            </Panel>
          </div>
          <DkUpdated at={data.updatedAt} />
        </>
      )}
    </>
  );
}
