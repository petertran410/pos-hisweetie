"use client";

import { useEffect, useMemo, useState } from "react";

const SUMMARY_MONTHS_STORAGE_KEY = "customer-demand-summary-months";

function readSavedSummaryMonths() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUMMARY_MONTHS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.filter((value): value is string => typeof value === "string")
      : null;
  } catch {
    return null;
  }
}

export function useDemandSummaryMonths(availableMonths: string[]) {
  const [pickedMonths, setPickedMonths] = useState<string[] | null>(
    readSavedSummaryMonths
  );

  useEffect(() => {
    try {
      if (pickedMonths?.length) {
        localStorage.setItem(
          SUMMARY_MONTHS_STORAGE_KEY,
          JSON.stringify(pickedMonths)
        );
      } else {
        localStorage.removeItem(SUMMARY_MONTHS_STORAGE_KEY);
      }
    } catch {
      // localStorage bị chặn thì vẫn giữ lựa chọn trong phiên hiện tại.
    }
  }, [pickedMonths]);

  const visibleMonths = useMemo(() => {
    const picked = (pickedMonths ?? availableMonths).filter((month) =>
      availableMonths.includes(month)
    );
    return picked.length ? picked : availableMonths;
  }, [availableMonths, pickedMonths]);

  return { visibleMonths, setPickedMonths };
}
