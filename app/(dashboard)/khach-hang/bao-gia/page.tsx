"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { QuotesSidebar } from "@/components/quotes/QuotesSidebar";
import { QuotesTable } from "@/components/quotes/QuotesTable";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import type { QuoteFilters } from "@/lib/types/quote";

/** Báo giá theo khách + thư viện báo giá mẫu (giai đoạn 1: dữ liệu mẫu). */
export default function QuotesPage() {
  const tab = useSearchParams().get("tab") === "library" ? "library" : "quotes";
  const [filters, setFilters] = useState<QuoteFilters>({ tab, page: 1, pageSize: 20 });
  const onChange = useCallback(
    (patch: Partial<QuoteFilters>) =>
      setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 })),
    []
  );
  const { data: sales = [] } = useUsersForFilter();

  return (
    <PagePermissionGuard resource="quotes" action="view">
      <div className="flex h-full border-t" style={{ borderColor: "var(--dt-border)" }}>
        {/* Thư viện lọc ngay trên thanh công cụ của bảng */}
        {filters.tab === "quotes" && <QuotesSidebar filters={filters} sales={sales} onChange={onChange} />}
        <QuotesTable filters={filters} onChange={onChange} />
      </div>
    </PagePermissionGuard>
  );
}
