"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { formatDemandMonth } from "./DemandUi";

export function CustomerDemandMonthPicker({
  months,
  selected,
  onChange,
}: {
  months: string[];
  selected: string[];
  onChange: (months: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = months.length > 0 && selected.length === months.length;

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const label = allSelected
    ? "Tất cả tháng"
    : selected.length === 1
      ? formatDemandMonth(selected[0])
      : `${selected.length} tháng`;

  const toggle = (month: string) => {
    const next = selected.includes(month)
      ? selected.filter((item) => item !== month)
      : [...selected, month].sort();
    onChange(next.length && next.length < months.length ? next : null);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-w-36 items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className="truncate text-gray-800">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
            Tất cả tháng
            {allSelected && <Check className="h-3.5 w-3.5 text-brand" />}
          </button>
          {months.map((month) => {
            const active = selected.includes(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() => toggle(month)}
                className={`mt-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                  active
                    ? "bg-brand-soft text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                {formatDemandMonth(month)}
                {active && <Check className="h-3.5 w-3.5 text-brand" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
