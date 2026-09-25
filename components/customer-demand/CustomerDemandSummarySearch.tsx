"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CustomerDemandFilters } from "@/lib/types/customer-demand";

interface Props {
  filters: CustomerDemandFilters;
  onFiltersChange: (filters: CustomerDemandFilters) => void;
  className?: string;
}

export function CustomerDemandSummarySearch({
  filters,
  onFiltersChange,
  className = "",
}: Props) {
  const [query, setQuery] = useState(filters.search ?? "");
  const filtersRef = useRef(filters);
  const onFiltersChangeRef = useRef(onFiltersChange);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange;
  }, [onFiltersChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = filtersRef.current;
      const search = query.trim().slice(0, 200) || undefined;
      if (current.search === search) return;
      onFiltersChangeRef.current({
        ...current,
        search,
        page: 1,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const clear = () => {
    setQuery("");
    const current = filtersRef.current;
    if (!current.search) return;
    onFiltersChangeRef.current({
      ...current,
      search: undefined,
      page: 1,
    });
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Theo mã hàng, tên hàng hoặc khách hàng"
        className="w-full rounded-lg border bg-white px-3 py-1.5 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100"
          aria-label="Xóa tìm kiếm">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
