"use client";

import { useCallback, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100];

/** Số dòng/trang, nhớ theo từng trang của người dùng (localStorage). */
export function usePageSize(
  storageKey: string,
  fallback = 50,
  options: number[] = PAGE_SIZE_OPTIONS,
) {
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return options.includes(saved) ? saved : fallback;
    } catch {
      return fallback;
    }
  });
  const change = useCallback(
    (next: number) => {
      setSize(next);
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Không lưu được thì chỉ áp dụng cho lần xem này.
      }
    },
    [storageKey],
  );
  return [size, change, options] as const;
}
