"use client";

import { useMemo, useState } from "react";
import { rangeToIso } from "@/components/shared/TimeRangeFilter";
import {
  useSmaxDashboard,
  useSmaxFilterOptions,
} from "@/lib/hooks/useSmaxDashboard";
import type {
  SmaxDashboardData,
  SmaxDashboardFilters,
} from "@/lib/dashboard/smax/smaxDashboard.types";
import { SmaxErrorsCard } from "./SmaxErrorsCard";
import {
  DEFAULT_SMAX_FILTERS,
  SmaxFilterBar,
  type SmaxFilterState,
} from "./SmaxFilterBar";
import { SmaxFunnel } from "./SmaxFunnel";
import { SmaxKpiGrid } from "./SmaxKpiGrid";
import { SmaxSalesSupportCard } from "./SmaxSalesSupportCard";
import { SmaxDashboardSkeleton, SmaxEmpty, SmaxError } from "./SmaxStates";
import { SmaxChannelTable, SmaxStaffTable } from "./SmaxTables";
import { SmaxThreadsCard } from "./SmaxThreadsCard";
import { SmaxTrendCard } from "./SmaxTrendCard";

/** Kỳ không có hoạt động chat nào (tin, gắn khách, lead, khách có HĐ, hội thoại Smax). */
function noActivity(d: SmaxDashboardData) {
  const k = d.kpis;
  const t = d.threads;
  return (
    k.messages.value === 0 &&
    k.links.value === 0 &&
    k.coverage.den === 0 &&
    k.leadConversion.den === 0 &&
    (!t.available || t.newTotal + t.renewTotal === 0)
  );
}

export function SmaxDashboard() {
  const [filterState, setFilterState] = useState<SmaxFilterState>(DEFAULT_SMAX_FILTERS);
  const { data: filterOptions } = useSmaxFilterOptions();

  const filters = useMemo<SmaxDashboardFilters>(() => {
    const range = rangeToIso(filterState.timeRange);
    return {
      from: range?.from ?? null,
      to: range?.to ?? null,
      pagePids: filterState.pagePids,
      userId: filterState.userId ? Number(filterState.userId) : null,
      branchIds: filterState.branchIds.map(Number),
    };
  }, [filterState]);

  const query = useSmaxDashboard(filters);
  const data = query.data;
  const loading = query.isLoading;
  const isEmpty = !!data && noActivity(data);

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 space-y-3 max-w-[1800px]">
        {/* Header */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h1 className="text-xl font-bold leading-tight">Smax chat</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--dt-text-muted)" }}>
              {data && !loading && !isEmpty
                ? data.period.compareLabel
                  ? `${data.period.label} · so với ${data.period.compareLabel}`
                  : data.period.label
                : "Mức dùng chat trong POS, độ phủ Zalo và hiệu quả chat → đơn"}
            </p>
          </div>
          {data?.ownOnly && (
            <span
              className="text-[11.5px] font-medium px-2 py-0.5 rounded-full mb-0.5"
              style={{ background: "var(--dt-bg-soft)", color: "var(--dt-text-secondary)" }}>
              Chỉ số liệu của bạn
            </span>
          )}
        </div>

        <SmaxFilterBar
          value={filterState}
          onChange={setFilterState}
          options={filterOptions ?? { channels: [], staff: [], branches: [] }}
          ownOnly={data?.ownOnly ?? false}
        />

        {loading ? (
          <SmaxDashboardSkeleton />
        ) : query.isError ? (
          <SmaxError onRetry={() => query.refetch()} />
        ) : !data || isEmpty ? (
          <SmaxEmpty onReset={() => setFilterState(DEFAULT_SMAX_FILTERS)} />
        ) : (
          <>
            <SmaxKpiGrid kpis={data.kpis} compareLabel={data.period.compareLabel} />
            <div className="grid gap-3 xl:grid-cols-2">
              <SmaxThreadsCard threads={data.threads} />
              <SmaxSalesSupportCard data={data.salesSupport} />
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <SmaxTrendCard trend={data.trend} />
              <SmaxFunnel stages={data.funnel} />
            </div>
            <SmaxStaffTable rows={data.staff} />
            <SmaxChannelTable rows={data.channels} />
            <SmaxErrorsCard errors={data.errors} />
          </>
        )}
      </div>
    </div>
  );
}
