"use client";

import { useEffect, useState } from "react";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { TimeRangeFilter, rangeToIso, type TimeRangeState } from "@/components/shared/TimeRangeFilter";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useNewLocations } from "@/lib/hooks/useNewLocations";
import { LEAD_CATEGORY_LABEL, LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, options } from "@/lib/leads/constants";
import type { LeadFilters } from "@/lib/types/lead";

const ALL_TIME: TimeRangeState = { dateMode: "preset", selectedPreset: "all_time", fromDate: "", toDate: "" };

/** Chip chọn nhiều (bấm lại để bỏ chọn), cùng kiểu StatusButtons trang khách hàng. */
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
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
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

/** Bộ lọc lead: nguồn, phân loại, trạng thái, khu vực, Sale PIC, thời gian tạo. */
export function LeadsSidebar({ onChange }: { onChange: (f: LeadFilters) => void }) {
  const { provinces } = useNewLocations();
  const { data: users } = useUsersForFilter();
  const [sources, setSources] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [salePicId, setSalePicId] = useState("");
  const [time, setTime] = useState<TimeRangeState>(ALL_TIME);

  useEffect(() => {
    const range = rangeToIso(time);
    onChange({
      sources: sources.join(",") || undefined,
      categories: categories.join(",") || undefined,
      statuses: statuses.join(",") || undefined,
      provinceCode: provinceCode || undefined,
      salePicId: salePicId ? Number(salePicId) : undefined,
      from: range?.from,
      to: range?.to,
    });
  }, [sources, categories, statuses, provinceCode, salePicId, time, onChange]);

  const active = [sources.length, categories.length, statuses.length, provinceCode, salePicId, time.selectedPreset !== "all_time" || time.dateMode === "custom"].filter(Boolean).length;
  const clear = () => {
    setSources([]);
    setCategories([]);
    setStatuses([]);
    setProvinceCode("");
    setSalePicId("");
    setTime(ALL_TIME);
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-semibold">Bộ lọc</h2>
        {active > 0 && (
          <button onClick={clear} className="text-xs text-brand hover:underline">
            Xóa tất cả ({active})
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <MultiChips label="Nguồn" opts={options(LEAD_SOURCE_LABEL)} value={sources} onChange={setSources} />
        <MultiChips label="Phân loại" opts={options(LEAD_CATEGORY_LABEL)} value={categories} onChange={setCategories} />
        <MultiChips label="Trạng thái" opts={options(LEAD_STATUS_LABEL)} value={statuses} onChange={setStatuses} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực</label>
          <FilterSearchableSelect
            options={provinces.map((p) => ({ value: p.code, label: p.name }))}
            value={provinceCode}
            onChange={setProvinceCode}
            placeholder="Tất cả tỉnh/thành"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sale PIC</label>
          <FilterSearchableSelect
            options={(users ?? []).map((u: { id: number; name: string }) => ({ value: String(u.id), label: u.name }))}
            value={salePicId}
            onChange={setSalePicId}
            placeholder="Tất cả"
          />
        </div>
        <TimeRangeFilter label="Ngày tạo" value={time} onChange={setTime} />
      </div>
    </aside>
  );
}
