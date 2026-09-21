"use client";

import { useState } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useCan } from "@/lib/hooks/useCan";
import { useCustomerDemand } from "@/lib/hooks/useCustomerDemand";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";
import { useAuthStore } from "@/lib/store/auth";
import type {
  CustomerDemand,
  CustomerDemandFilters,
} from "@/lib/types/customer-demand";
import { CustomerDemandFormModal } from "./CustomerDemandFormModal";
import { CustomerDemandImportModal } from "./CustomerDemandImportModal";
import { CustomerDemandLarkSyncModal } from "./CustomerDemandLarkSyncModal";
import { CustomerDemandMobileView } from "./CustomerDemandMobileView";
import { CustomerDemandSidebar } from "./CustomerDemandSidebar";
import { CustomerDemandTable } from "./CustomerDemandTable";

const DEFAULT_FILTERS: CustomerDemandFilters = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

export function CustomerDemandPage() {
  const mounted = useIsClient();
  const isMobile = useIsMobile(1024);
  const { user } = useAuthStore();
  const canCreate = useCan("customer_demand", "create");
  const canUpdate = useCan("customer_demand", "update");
  const canSyncLark = user?.roles?.includes("Super Admin") ?? false;
  const [filters, setFilters] =
    useState<CustomerDemandFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formMonthId, setFormMonthId] = useState<number | null>(null);
  const [copySource, setCopySource] = useState<CustomerDemand | null>(null);
  const [copyMonthId, setCopyMonthId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data: editDemand } = useCustomerDemand(
    formOpen && selectedId !== null ? selectedId : null
  );

  const openCreate = () => {
    setSelectedId(null);
    setFormMonthId(null);
    setCopySource(null);
    setCopyMonthId(null);
    setFormOpen(true);
  };

  const openEditDemand = (demandId: number, monthId: number) => {
    setSelectedId(demandId);
    setFormMonthId(monthId);
    setCopySource(null);
    setCopyMonthId(null);
    setFormOpen(true);
  };

  const openCopyDemand = (demand: CustomerDemand, monthId: number) => {
    setSelectedId(null);
    setFormMonthId(null);
    setCopySource(demand);
    setCopyMonthId(monthId);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormMonthId(null);
    setCopySource(null);
    setCopyMonthId(null);
  };

  const setFiltersStable = (next: CustomerDemandFilters) => {
    setFilters({
      ...next,
      sortBy: next.sortBy ?? "createdAt",
      sortOrder: next.sortOrder ?? "desc",
      page: next.page ?? 1,
      limit: next.limit ?? 20,
    });
  };

  return (
    <PagePermissionGuard resource="customer_demand" action="view">
      {!mounted ? (
        <div className="flex h-full items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand" />
        </div>
      ) : isMobile ? (
        <div className="h-full">
          <CustomerDemandMobileView
            filters={filters}
            onFiltersChange={setFiltersStable}
            onEditDemand={openEditDemand}
            onCopyDemand={openCopyDemand}
            onCreate={openCreate}
            onImport={() => setImportOpen(true)}
            onSync={() => setSyncOpen(true)}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canSyncLark={canSyncLark}
          />
        </div>
      ) : (
        <div
          className="flex h-full min-h-0 border-t"
          style={{ borderColor: "var(--dt-border)" }}>
          <CustomerDemandSidebar
            filters={filters}
            onFiltersChange={setFiltersStable}
          />
          <CustomerDemandTable
            filters={filters}
            onFiltersChange={setFiltersStable}
            onEditDemand={openEditDemand}
            onCopyDemand={openCopyDemand}
            onCreate={openCreate}
            onImport={() => setImportOpen(true)}
            onSync={() => setSyncOpen(true)}
            canCreate={canCreate}
            canSyncLark={canSyncLark}
          />
        </div>
      )}

      <CustomerDemandFormModal
        open={formOpen && (selectedId === null || !!editDemand)}
        demand={formOpen && selectedId !== null ? editDemand : null}
        monthId={formMonthId}
        copySource={copySource}
        copyMonthId={copyMonthId}
        onClose={closeForm}
      />
      {importOpen && (
        <CustomerDemandImportModal onClose={() => setImportOpen(false)} />
      )}
      {syncOpen && canSyncLark && (
        <CustomerDemandLarkSyncModal onClose={() => setSyncOpen(false)} />
      )}
    </PagePermissionGuard>
  );
}
