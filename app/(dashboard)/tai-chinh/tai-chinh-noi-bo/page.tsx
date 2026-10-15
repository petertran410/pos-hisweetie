"use client";

import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MobileFilterDrawer } from "@/components/internal-finance/mobile/FinanceMobileShell";
import { usePageSize } from "@/lib/hooks/usePageSize";
import Link from "next/link";
import { CalendarRange, Truck } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import {
  InternalFinanceSidebar,
  loadInternalFinanceFilters,
} from "@/components/internal-finance/InternalFinanceSidebar";
import {
  InternalFinanceTable,
  type InternalFinanceSummaryItem,
} from "@/components/internal-finance/InternalFinanceTable";
import {
  useInternalFinance,
  useInternalFinanceSummary,
} from "@/lib/hooks/useInternalFinance";
import type { InternalFinanceQuery } from "@/lib/api/internal-finance";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";
import {
  useFollowHeaderBranch,
  useHeaderBranchId,
} from "@/lib/internal-finance/header-branch";

const FINANCE_BRANCH_IDS = [1, 4, 6, 7];
const STORAGE_KEY = "internal-finance-sidebar-filters";

export default function TaiChinhNoiBoPage() {
  const access = useFinanceAccess();
  const headerBranchId = useHeaderBranchId(FINANCE_BRANCH_IDS, (id) =>
    access.can("internal_finance", "view", id),
  );
  const [pageSize, setPageSize] = usePageSize("internalFinancePageSize");
  // Link từ trang Đơn Lark Approval: ?Code=<mã> chỉ tìm đúng mã đó.
  const codeParam = useSearchParams().get("Code")?.trim() || "";
  const [filters, setFilters] = useState<InternalFinanceQuery>(() =>
    codeParam
      ? { search: codeParam, page: 1, limit: pageSize }
      : {
          ...loadInternalFinanceFilters(STORAGE_KEY, headerBranchId),
          page: 1,
          limit: pageSize,
        },
  );

  const isMobile = useIsMobile(768);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [
    filters.branchIds?.length,
    filters.direction,
    filters.category,
    filters.status,
    filters.fromDate || filters.toDate,
  ].filter(Boolean).length;
  const query = useInternalFinance(filters);
  const summary = useInternalFinanceSummary(filters);
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const page = query.data?.page || filters.page || 1;
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
      limit: current.limit || pageSize,
    }));
  };

  useFollowHeaderBranch(headerBranchId, filters.branchIds || [], (id) =>
    updateFilters({ branchIds: id ? [id] : undefined }),
  );

  const actions = (
    <>
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
    <FinancePageGuard
      permissions={[{ resource: "internal_finance", action: "view" }]}>
      <div
        className={`flex h-full min-h-0 overflow-hidden border-t ${
          isMobile ? "flex-col" : ""
        }`}
        style={{ borderColor: "var(--dt-border)" }}>
        {(() => {
          const sidebar = (
            <InternalFinanceSidebar
              filters={filters}
              onChange={updateFilters}
              storageKey={STORAGE_KEY}
              resetPatch={{
                branchIds: headerBranchId ? [headerBranchId] : undefined,
              }}
            />
          );
          return isMobile ? (
            <MobileFilterDrawer
              open={showFilters}
              onClose={() => setShowFilters(false)}>
              {sidebar}
            </MobileFilterDrawer>
          ) : (
            sidebar
          );
        })()}
        <InternalFinanceTable
          isMobile={isMobile}
          activeFilterCount={activeFilterCount}
          onOpenFilter={() => setShowFilters(true)}
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
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setFilters((current) => ({
              ...current,
              limit: nextSize,
              page: 1,
            }));
          }}
          summary={summaryItems}
          toolbar={actions}
        />
      </div>
    </FinancePageGuard>
  );
}
