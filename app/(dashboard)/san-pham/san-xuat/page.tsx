"use client";

import { useState, useEffect } from "react";
import {
  useProductions,
  useDeleteProduction,
} from "@/lib/hooks/useProductions";
import { ProductionTable } from "@/components/productions/ProductionTable";
import { ProductionSidebar } from "@/components/productions/ProductionSidebar";
import type { ProductionQueryParams } from "@/lib/api/productions";

export default function ProductionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [timeMode, setTimeMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<string>("this_month");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const { mutate: deleteProduction } = useDeleteProduction();

  const buildQueryParams = (): ProductionQueryParams => {
    const params: ProductionQueryParams = {};

    if (selectedBranches.length > 0) {
      params.branchIds = selectedBranches;
    }

    if (selectedStatuses.length > 0) {
      params.status = selectedStatuses;
    }

    if (fromDate && toDate) {
      params.fromManufacturedDate = fromDate.toISOString();
      params.toManufacturedDate = toDate.toISOString();
    }

    params.pageSize = limit;
    params.currentItem = (page - 1) * limit;

    return params;
  };

  const queryParams = buildQueryParams();
  const { data, isLoading } = useProductions(queryParams);

  const applyPresetTime = (preset: string) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        from = new Date(now.setDate(now.getDate() - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "last_week":
        from = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "7_days":
        from = new Date(now.setDate(now.getDate() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "30_days":
        from = new Date(now.setDate(now.getDate() - 30));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      default:
        return;
    }

    setFromDate(from);
    setToDate(to);
  };

  const clearAllFilters = () => {
    setSelectedBranches([]);
    setSelectedStatuses([]);
    setTimeMode("preset");
    setSelectedPreset("this_month");
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  useEffect(() => {
    if (timeMode === "preset") {
      applyPresetTime(selectedPreset);
    }
  }, [timeMode, selectedPreset]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranches, selectedStatuses, fromDate, toDate, limit]);

  return (
    <div className="flex h-full border-t bg-gray-50 w-screen">
      <ProductionSidebar
        selectedBranches={selectedBranches}
        selectedStatuses={selectedStatuses}
        timeMode={timeMode}
        selectedPreset={selectedPreset}
        fromDate={fromDate}
        toDate={toDate}
        onBranchesChange={setSelectedBranches}
        onStatusesChange={setSelectedStatuses}
        onTimeModeChange={setTimeMode}
        onPresetChange={setSelectedPreset}
        onDateRangeChange={(from, to) => {
          setFromDate(from);
          setToDate(to);
        }}
        onClearAll={clearAllFilters}
      />

      <ProductionTable
        productions={data?.data || []}
        isLoading={isLoading}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onEdit={(production) => {
          console.log("Edit production:", production);
        }}
        onDelete={(id) => deleteProduction(id)}
      />
    </div>
  );
}
