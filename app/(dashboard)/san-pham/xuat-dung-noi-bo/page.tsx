"use client";

import { useState, useEffect } from "react";
import { InternalUsesSidebar } from "@/components/internal-uses/InternalUsesSidebar";
import { InternalUsesTable } from "@/components/internal-uses/InternalUsesTable";
import { useInternalUses } from "@/lib/hooks/useInternalUses";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function InternalUsesPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState(codeParam ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(codeParam ?? "");

  // Debounce ô tìm kiếm 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useInternalUses({
    ...filters,
    search: debouncedSearch || undefined,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
  const handleFiltersChange = (newFilters: any) => {
    if (codeParam) return;
    setFilters(newFilters);
  };

  return (
    <PagePermissionGuard resource="internal-use" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <InternalUsesSidebar onFiltersChange={handleFiltersChange} />

        <InternalUsesTable
          internalUses={data?.data || []}
          isLoading={isLoading}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          searchValue={search}
          onSearchChange={setSearch}
        />
      </div>
    </PagePermissionGuard>
  );
}
