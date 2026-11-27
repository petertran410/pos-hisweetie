"use client";

import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useIntelOverview } from "@/lib/hooks/useMessageIntel";
import type { IntelRangeParams } from "@/lib/api/messageIntel";

export type IntelPreset = "today" | "7d" | "30d";
const PRESETS: [IntelPreset, string][] = [
  ["today", "Hôm nay"],
  ["7d", "7 ngày"],
  ["30d", "30 ngày"],
];

/** Khoảng thời gian theo giờ VN, làm tròn phút để query key ổn định giữa các lần render. */
export function rangeOf(preset: IntelPreset) {
  const now = new Date();
  const to = new Date(Math.ceil(now.getTime() / 60_000) * 60_000);
  const vnMidnight = new Date(Math.floor((now.getTime() + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000);
  const days = preset === "today" ? 0 : preset === "7d" ? 6 : 29;
  const from = new Date(vnMidnight.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Chọn khoảng thời gian + kênh (danh sách kênh lấy từ các kênh đã có tin được phân loại trong kỳ). */
export function IntelRangeBar({
  preset,
  onPreset,
  pagePid,
  onPagePid,
  range,
}: {
  preset: IntelPreset;
  onPreset: (p: IntelPreset) => void;
  pagePid: string;
  onPagePid: (p: string) => void;
  range: IntelRangeParams;
}) {
  // Danh sách kênh theo kỳ, không lọc kênh (để đổi qua lại giữa các kênh)
  const { data } = useIntelOverview({ from: range.from, to: range.to });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="dt-seg dt-seg-sm w-fit" role="group" aria-label="Khoảng thời gian">
        {PRESETS.map(([key, label]) => (
          <button key={key} type="button" data-on={preset === key} aria-pressed={preset === key} onClick={() => onPreset(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="w-60">
        <SearchableSelect
          size="sm"
          clearable
          placeholder="Tất cả kênh"
          searchPlaceholder="Tìm kênh…"
          value={pagePid}
          onChange={onPagePid}
          options={(data?.channels ?? []).map((c) => ({ value: c.pagePid, label: c.name }))}
        />
      </div>
    </div>
  );
}
