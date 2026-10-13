"use client";

import Link from "next/link";
import { CalendarRange, Truck } from "lucide-react";
import { useState } from "react";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { FinanceSyncButton } from "@/components/internal-finance/FinanceSyncButton";
import { useAuthStore } from "@/lib/store/auth";
import { InternalFinanceSidebar } from "@/components/internal-finance/InternalFinanceSidebar";
import {
  InternalFinanceTable,
  type InternalFinanceSummaryItem,
} from "@/components/internal-finance/InternalFinanceTable";
import {
  useInternalFinance,
  useInternalFinanceSummary,
} from "@/lib/hooks/useInternalFinance";
import type { InternalFinanceQuery } from "@/lib/api/internal-finance";

const PAGE_SIZE = 50;

export default function TaiChinhNoiBoPage() {
  // Đồng bộ dữ liệu cũ và chốt chuyển đổi chỉ dành cho Super Admin.
  const canSync = useAuthStore((state) =>
    Boolean(state.user?.roles?.includes("Super Admin")),
  );
  const [filters, setFilters] = useState<InternalFinanceQuery>({
    page: 1,
    limit: PAGE_SIZE,
  });

  const query = useInternalFinance(filters);
  const summary = useInternalFinanceSummary(filters);
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const page = query.data?.page || filters.page || 1;
  const pageSize = query.data?.limit || filters.limit || PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const summaryData = summary.data;

  const summaryItems: InternalFinanceSummaryItem[] = [
    { label: "Tổng thu", value: summaryData?.receipt || 0, tone: "positive" },
    { label: "Tổng chi", value: summaryData?.expense || 0, tone: "negative" },
    {
      label: "Đã ghi sổ quỹ",
      value: summaryData?.posted || 0,
      tone: "neutral",
    },
    {
      label: "Thiếu chứng từ",
      value: summaryData?.missingEvidence || 0,
      tone: "warning",
    },
    {
      label: "Chênh lệch",
      value: summaryData?.balance || 0,
      tone: summaryData && summaryData.balance >= 0 ? "positive" : "negative",
    },
  ];

  const updateFilters = (patch: Partial<InternalFinanceQuery>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
      limit: current.limit || PAGE_SIZE,
    }));
  };

  const actions = (
    <>
      {canSync && <FinanceSyncButton />}
      <Link
        href="/tai-chinh/xe-co"
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
        <Truck className="h-4 w-4" />
        Xăng dầu &amp; xe
      </Link>
      <Link
        href="/tai-chinh/approval-tuan"
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
        <CalendarRange className="h-4 w-4" />
        Approval tuần
      </Link>
    </>
  );

  return (
    <FinancePageGuard permissions={[{ resource: "cash_flows", action: "view" }]}>
      <div
        className="flex h-full min-h-0 overflow-hidden border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <InternalFinanceSidebar filters={filters} onChange={updateFilters} />
        <InternalFinanceTable
          title="Tài chính nội bộ"
          rows={rows}
          search={filters.search || ""}
          onSearchChange={(value) =>
            updateFilters({ search: value || undefined })
          }
          isLoading={query.isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={(nextPage) => updateFilters({ page: nextPage })}
          onPageSizeChange={(nextSize) =>
            setFilters((current) => ({
              ...current,
              limit: nextSize,
              page: 1,
            }))
          }
          summary={summaryItems}
          toolbar={actions}
        />
      </div>
    </FinancePageGuard>
  );
}
