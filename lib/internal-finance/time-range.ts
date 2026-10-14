import { useCallback, useState } from "react";
import {
  getDateRangeFromPreset,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import {
  readSavedFilters,
  writeSavedFilters,
} from "@/lib/internal-finance/saved-filters";

export const ALL_TIME: TimeRangeState = {
  dateMode: "preset",
  selectedPreset: "all_time",
  fromDate: "",
  toDate: "",
};

export type DateRange = { fromDate?: string; toDate?: string };

const inputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

/** Đổi lựa chọn thời gian của sidebar thành khoảng ngày YYYY-MM-DD gửi backend. */
export function timeRangeDates(range: TimeRangeState): DateRange {
  if (range.dateMode === "custom") {
    return {
      fromDate: range.fromDate || undefined,
      toDate: range.toDate || undefined,
    };
  }
  if (range.selectedPreset === "all_time") return {};
  const { from, to } = getDateRangeFromPreset(range.selectedPreset);
  return { fromDate: inputDate(from), toDate: inputDate(to) };
}

const timeKey = (storageKey: string) => `${storageKey}:time`;

export function loadTimeRange(storageKey: string): TimeRangeState {
  const saved = readSavedFilters<Partial<TimeRangeState>>(timeKey(storageKey));
  return { ...ALL_TIME, ...(saved || {}) };
}

/** Khoảng ngày đã lưu; mốc có sẵn ("Hôm nay", "Tháng này"…) tính lại theo hôm nay. */
export function loadSavedDates(storageKey: string): DateRange {
  return timeRangeDates(loadTimeRange(storageKey));
}

export const isTimeRangeActive = (range: TimeRangeState) =>
  range.dateMode === "custom" || range.selectedPreset !== "all_time";

/** State + lưu localStorage cho `TimeRangeFilter` của các sidebar tài chính. */
export function useSavedTimeRange(
  storageKey: string,
  apply: (dates: DateRange) => void,
) {
  const [range, setRange] = useState(() => loadTimeRange(storageKey));
  const change = useCallback(
    (next: TimeRangeState) => {
      setRange(next);
      writeSavedFilters(timeKey(storageKey), next);
      const dates = timeRangeDates(next);
      apply({ fromDate: dates.fromDate, toDate: dates.toDate });
    },
    [apply, storageKey],
  );
  /** Về "Toàn thời gian"; nơi gọi tự xóa ngày trong bộ lọc của mình. */
  const reset = useCallback(() => {
    setRange(ALL_TIME);
    writeSavedFilters(timeKey(storageKey), ALL_TIME);
  }, [storageKey]);
  return { range, change, reset, active: isTimeRangeActive(range) };
}
