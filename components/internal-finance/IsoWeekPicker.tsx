"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { isoWeekRange, isoWeeksInYear } from "@/lib/internal-finance/dates";

export type IsoWeek = { year: number; week: number };

const shortDate = (key: string) => key.slice(5).split("-").reverse().join("/");

/**
 * Chọn tuần ISO (Thứ hai–Chủ nhật): năm + số tuần với nút lùi/tới, giống ô
 * chọn tuần của Approval tuần. Khoảng ngày tự tính theo số tuần.
 */
export function IsoWeekPicker({
  value,
  onChange,
  yearLabel = "Năm",
  weekLabel = "Tuần số",
  showRange = true,
}: {
  value: IsoWeek;
  onChange: (next: IsoWeek) => void;
  yearLabel?: string;
  weekLabel?: string;
  showRange?: boolean;
}) {
  const [weekText, setWeekText] = useState(String(value.week));
  const [seen, setSeen] = useState(value);
  // Tuần đổi từ bên ngoài (nút lùi/tới, đổi năm) thì ô số tuần theo kịp.
  if (seen.year !== value.year || seen.week !== value.week) {
    setSeen(value);
    setWeekText(String(value.week));
  }
  const maxWeek = isoWeeksInYear(value.year);
  const thisYear = new Date().getFullYear();
  const { from, to } = isoWeekRange(value.year, value.week);
  const labelClass = "mb-1.5 block text-xs font-medium text-gray-600";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={labelClass}>{yearLabel}</span>
          <FilterSearchableSelect
            options={[-1, 0, 1].map((offset) => ({
              value: String(thisYear + offset),
              label: String(thisYear + offset),
            }))}
            value={String(value.year)}
            onChange={(next) => {
              if (!next) return;
              const year = Number(next);
              onChange({
                year,
                week: Math.min(value.week, isoWeeksInYear(year)),
              });
            }}
            searchable={false}
            allowDeselect={false}
            showClearOption={false}
          />
        </div>
        <div>
          <span className={labelClass}>{weekLabel}</span>
          <div className="flex items-center gap-1 rounded-lg border bg-white px-1 py-1 text-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft hover:border-gray-400">
            <button
              type="button"
              title="Tuần trước"
              disabled={value.week <= 1}
              onClick={() => onChange({ ...value, week: value.week - 1 })}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              placeholder={`1–${maxWeek}`}
              value={weekText}
              onChange={(event) => {
                const digits = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 2);
                setWeekText(digits);
                const week = Number(digits);
                if (digits && week >= 1 && week <= maxWeek)
                  onChange({ year: value.year, week });
              }}
              onBlur={() => setWeekText(String(value.week))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  (event.target as HTMLInputElement).blur();
                }
              }}
              className="w-full min-w-0 bg-transparent text-center font-medium text-gray-800 outline-none placeholder:text-gray-300"
            />
            <button
              type="button"
              title="Tuần sau"
              disabled={value.week >= maxWeek}
              onClick={() => onChange({ ...value, week: value.week + 1 })}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {showRange && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
          Tuần {value.week}/{value.year}: Thứ hai{" "}
          <strong>{shortDate(from)}</strong> → Chủ nhật{" "}
          <strong>{shortDate(to)}</strong>
        </div>
      )}
    </div>
  );
}
