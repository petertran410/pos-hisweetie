"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterMultiSelect } from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  useNewProductPriceReference,
  useNewProductPriceSummary,
} from "@/lib/hooks/useNewProductPrice";
import {
  NPP_STAGE_LABEL,
  NPP_STATUS_LABEL,
  options,
} from "@/lib/new-product-price/constants";
import type { NppFilters, NppStage } from "@/lib/types/new-product-price";

const ALL_TIME: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "all_time",
  fromDate: "",
  toDate: "",
};

/** Chip chọn nhiều (bấm lại để bỏ chọn) — cùng kiểu LeadsSidebar. */
function MultiChips({
  label,
  opts,
  value,
  onChange,
}: {
  label: string;
  opts: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() =>
                onChange(
                  on ? value.filter((v) => v !== o.value) : [...value, o.value],
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                on
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-brand hover:bg-brand-soft"
              }`}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Bộ lọc: việc của tôi, giai đoạn (kèm số phiếu), trạng thái, loại hàng, thương hiệu, người đề xuất, ngày. */
export function NewProductPriceSidebar({
  initialStage,
  onChange,
}: {
  initialStage?: string | null;
  onChange: (f: NppFilters) => void;
}) {
  const { data: users } = useUsersForFilter();
  const { data: ref } = useNewProductPriceReference();
  const [mine, setMine] = useState(false);
  const [stages, setStages] = useState<string[]>(
    initialStage && initialStage in NPP_STAGE_LABEL ? [initialStage] : [],
  );
  const [statuses, setStatuses] = useState<string[]>([]);
  const [parentNames, setParentNames] = useState<string[]>([]);
  const [tradeMarkIds, setTradeMarkIds] = useState<string[]>([]);
  const [createdByIds, setCreatedByIds] = useState<string[]>([]);
  const [time, setTime] = useState<TimeRangeState>(ALL_TIME);

  const base = useMemo(() => {
    const range = rangeToIso(time);
    return {
      statuses,
      parentNames,
      tradeMarkIds: tradeMarkIds.map(Number),
      createdByIds: createdByIds.map(Number),
      from: range?.from,
      to: range?.to,
    };
  }, [statuses, parentNames, tradeMarkIds, createdByIds, time]);

  // Đếm theo giai đoạn với các bộ lọc khác (không gồm giai đoạn / việc của tôi)
  const { data: summary } = useNewProductPriceSummary(base);

  useEffect(() => {
    onChange({ ...base, stages, mine: mine || undefined });
  }, [base, stages, mine, onChange]);

  const stageOpts = options(NPP_STAGE_LABEL).map((o) => ({
    value: o.value,
    label: summary
      ? `${o.label} (${summary.stages[o.value as NppStage] ?? 0})`
      : o.label,
  }));

  const active = [
    mine,
    stages.length,
    statuses.length,
    parentNames.length,
    tradeMarkIds.length,
    createdByIds.length,
    time.selectedPreset !== "all_time" || time.dateMode === "custom",
  ].filter(Boolean).length;
  const clear = () => {
    setMine(false);
    setStages([]);
    setStatuses([]);
    setParentNames([]);
    setTradeMarkIds([]);
    setCreatedByIds([]);
    setTime(ALL_TIME);
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-semibold">Bộ lọc</h2>
        {active > 0 && (
          <button
            onClick={clear}
            className="text-xs text-brand hover:underline">
            Xóa tất cả ({active})
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <MultiChips
          label="Phạm vi"
          opts={[
            {
              value: "mine",
              label: `Việc của tôi${summary ? ` (${summary.mine})` : ""}`,
            },
          ]}
          value={mine ? ["mine"] : []}
          onChange={(v) => setMine(v.includes("mine"))}
        />
        <MultiChips
          label="Giai đoạn"
          opts={stageOpts}
          value={stages}
          onChange={setStages}
        />
        <MultiChips
          label="Trạng thái"
          opts={options(NPP_STATUS_LABEL)}
          value={statuses}
          onChange={setStatuses}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại hàng
          </label>
          <FilterMultiSelect
            options={(ref?.categories.parent ?? []).map((n) => ({
              value: n,
              label: n,
            }))}
            values={parentNames}
            onChange={setParentNames}
            placeholder="Tất cả loại hàng"
            searchPlaceholder="Tìm loại hàng..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thương hiệu
          </label>
          <FilterMultiSelect
            options={(ref?.trademarks ?? []).map((t) => ({
              value: String(t.id),
              label: t.name,
            }))}
            values={tradeMarkIds}
            onChange={setTradeMarkIds}
            placeholder="Tất cả thương hiệu"
            searchPlaceholder="Tìm thương hiệu..."
            multiLabel={(n) => `${n} thương hiệu`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người đề xuất
          </label>
          <FilterMultiSelect
            options={(users ?? []).map((u: { id: number; name: string }) => ({
              value: String(u.id),
              label: u.name,
            }))}
            values={createdByIds}
            onChange={setCreatedByIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm nhân viên..."
            multiLabel={(n) => `${n} người`}
          />
        </div>
        <TimeRangeFilter label="Ngày đề xuất" value={time} onChange={setTime} />
      </div>
    </aside>
  );
}
