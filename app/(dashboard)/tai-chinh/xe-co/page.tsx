"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { InternalFinanceSidebar } from "@/components/internal-finance/InternalFinanceSidebar";
import { InternalFinanceTable } from "@/components/internal-finance/InternalFinanceTable";
import { VehicleFinanceForm } from "@/components/internal-finance/VehicleFinanceForm";
import { useInternalFinance } from "@/lib/hooks/useInternalFinance";
import type { InternalFinanceQuery } from "@/lib/api/internal-finance";
import { useCan } from "@/lib/hooks/useCan";

const VEHICLE_CATEGORIES = [
  ["FUEL", "Xăng dầu"],
  ["VEHICLE_CARE", "Chăm sóc xe"],
];

const PAGE_SIZE = 50;

export default function XeCoPage() {
  const canCreate = useCan("cash_flows", "create");
  const [filters, setFilters] = useState<InternalFinanceQuery>({
    category: "FUEL",
    page: 1,
    limit: PAGE_SIZE,
  });
  const [showForm, setShowForm] = useState(false);
  const query = useInternalFinance(filters);
  const rows = query.data?.data || [];
  const total = query.data?.total || 0;
  const page = query.data?.page || filters.page || 1;
  const pageSize = query.data?.limit || filters.limit || PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateFilters = (patch: Partial<InternalFinanceQuery>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
      limit: current.limit || PAGE_SIZE,
    }));
  };

  return (
    <PagePermissionGuard resource="cash_flows" action="view">
      <div
        className="flex h-full min-h-0 overflow-hidden border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <InternalFinanceSidebar
          filters={filters}
          onChange={updateFilters}
          categories={VEHICLE_CATEGORIES}
          resetPatch={{ category: "FUEL" }}
        />
        <InternalFinanceTable
          title="Xăng dầu & Chăm sóc xe"
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
          toolbar={
            <>
              <Link
                href="/tai-chinh/tai-chinh-noi-bo"
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Tài chính nội bộ
              </Link>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                  <Plus className="h-4 w-4" />
                  Tạo phiếu xe
                </button>
              )}
            </>
          }
        />
      </div>
      {showForm && <VehicleFinanceForm onClose={() => setShowForm(false)} />}
    </PagePermissionGuard>
  );
}
