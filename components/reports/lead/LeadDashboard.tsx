"use client";

import { useMemo, useState } from "react";
import { rangeToIso } from "@/components/shared/TimeRangeFilter";
import {
  useLeadDashboard,
  useLeadFilterOptions,
} from "@/lib/hooks/useLeadDashboard";
import type {
  LeadCategory,
  LeadDashboardFilters,
  LeadSource,
} from "@/lib/dashboard/lead/leadDashboard.types";
import { LeadAttentionSection } from "./LeadAttention";
import {
  DEFAULT_LEAD_FILTERS,
  LeadFilterBar,
  type LeadFilterState,
} from "./LeadFilterBar";
import { LeadFunnel } from "./LeadFunnel";
import { LeadKpiGrid } from "./LeadKpiGrid";
import { LeadSourceSection } from "./LeadSourceSection";
import { LeadCskhTable, LeadSalePicTable } from "./LeadStaffTables";
import { LeadDashboardSkeleton, LeadEmpty, LeadError } from "./LeadStates";
import { LeadTrendCard } from "./LeadTrendCard";

export function LeadDashboard() {
  const [filterState, setFilterState] = useState<LeadFilterState>(DEFAULT_LEAD_FILTERS);
  const { data: filterOptions } = useLeadFilterOptions();

  const filters = useMemo<LeadDashboardFilters>(() => {
    const range = rangeToIso(filterState.timeRange);
    return {
      from: range?.from ?? null,
      to: range?.to ?? null,
      sources: filterState.sources as LeadSource[],
      categories: filterState.categories as LeadCategory[],
      cskhUserId: filterState.cskhUserId ? Number(filterState.cskhUserId) : null,
      salePicId: filterState.salePicId ? Number(filterState.salePicId) : null,
    };
  }, [filterState]);

  const query = useLeadDashboard(filters);
  const data = query.data;
  const loading = query.isLoading;
  const isEmpty = !!data && data.kpis.total.value === 0;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 space-y-3 max-w-[1800px]">
        {/* Header */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h1 className="text-xl font-bold leading-tight">Lead</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--dt-text-muted)" }}>
              {data && !loading && !isEmpty
                ? data.period.compareLabel
                  ? `${data.period.label} · so với ${data.period.compareLabel}`
                  : data.period.label
                : "Tổng quan lead, phễu chuyển đổi và hiệu suất nhân sự"}
            </p>
          </div>
        </div>

        <LeadFilterBar
          value={filterState}
          onChange={setFilterState}
          options={filterOptions ?? { cskh: [], salePics: [] }}
        />

        {loading ? (
          <LeadDashboardSkeleton />
        ) : query.isError ? (
          <LeadError onRetry={() => query.refetch()} />
        ) : !data || isEmpty ? (
          <LeadEmpty onReset={() => setFilterState(DEFAULT_LEAD_FILTERS)} />
        ) : (
          <>
            <LeadKpiGrid kpis={data.kpis} compareLabel={data.period.compareLabel} />
            <LeadAttentionSection data={data.attention} />
            <div className="grid gap-3 xl:grid-cols-2">
              <LeadFunnel stages={data.funnel} conversion={data.kpis.conversionRate} />
              <LeadTrendCard trend={data.trend} />
            </div>
            <LeadSourceSection rows={data.bySource} />
            <LeadCskhTable rows={data.cskh} />
            <LeadSalePicTable rows={data.salePic} />
          </>
        )}
      </div>
    </div>
  );
}
