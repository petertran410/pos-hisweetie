"use client";

import { useState, useSyncExternalStore } from "react";
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
import { CustomerDemandOrderSummary } from "./CustomerDemandOrderSummary";
import type { DemandViewMode } from "./DemandViewToggle";
import { CustomerDemandSidebar } from "./CustomerDemandSidebar";
import { CustomerDemandTable } from "./CustomerDemandTable";

const DEFAULT_FILTERS: CustomerDemandFilters = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const SETUP_STORAGE_KEY = "customer-demand-page-setup";
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES = new Set(["DRAFT", "CONFIRMED", "CANCELLED"]);
const SORT_FIELDS = new Set(["createdAt", "updatedAt", "id", "customerName"]);
const LIMITS = new Set([10, 20, 50]);

type DemandPageSetup = {
  filters: CustomerDemandFilters;
  viewMode: DemandViewMode;
};

const DEFAULT_SETUP: DemandPageSetup = {
  filters: DEFAULT_FILTERS,
  viewMode: "vouchers",
};

const SETUP_EVENT = "customer-demand-setup";
let currentSetup = DEFAULT_SETUP;
let setupLoaded = false;

function parseDemandSetup(raw: string | null): DemandPageSetup {
  if (!raw) return DEFAULT_SETUP;
  try {
    const saved = JSON.parse(raw) as {
      filters?: Partial<CustomerDemandFilters>;
      viewMode?: DemandViewMode;
    };
    const source = saved.filters ?? {};
    const month = (value: unknown) =>
      typeof value === "string" && MONTH_PATTERN.test(value) ? value : undefined;
    const limit = LIMITS.has(Number(source.limit)) ? Number(source.limit) : 20;
    const pageNumber = Number(source.page);
    return {
      filters: {
        ...DEFAULT_FILTERS,
        customerId:
          Number.isInteger(source.customerId) && Number(source.customerId) > 0
            ? Number(source.customerId)
            : undefined,
        customerSearch:
          typeof source.customerSearch === "string"
            ? source.customerSearch
            : undefined,
        month: month(source.month),
        monthFrom: month(source.monthFrom),
        monthTo: month(source.monthTo),
        status: STATUSES.has(String(source.status))
          ? (source.status as CustomerDemandFilters["status"])
          : undefined,
        sortBy: SORT_FIELDS.has(String(source.sortBy))
          ? (source.sortBy as CustomerDemandFilters["sortBy"])
          : "createdAt",
        sortOrder: source.sortOrder === "asc" ? "asc" : "desc",
        page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
        limit,
      },
      viewMode: saved.viewMode === "summary" ? "summary" : "vouchers",
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

function getDemandSetup() {
  if (!setupLoaded && typeof window !== "undefined") {
    currentSetup = parseDemandSetup(localStorage.getItem(SETUP_STORAGE_KEY));
    setupLoaded = true;
  }
  return currentSetup;
}

function subscribeDemandSetup(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== SETUP_STORAGE_KEY) return;
    setupLoaded = false;
    onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(SETUP_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SETUP_EVENT, onStoreChange);
  };
}

function writeDemandSetup(next: DemandPageSetup) {
  currentSetup = next;
  setupLoaded = true;
  try {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Trình duyệt có thể chặn localStorage; trang vẫn dùng setup hiện tại.
  }
  window.dispatchEvent(new Event(SETUP_EVENT));
}

export function CustomerDemandPage() {
  const mounted = useIsClient();
  const isMobile = useIsMobile(1024);
  const { user } = useAuthStore();
  const canCreate = useCan("customer_demand", "create");
  const canUpdate = useCan("customer_demand", "update");
  const canExport = useCan("customer_demand", "export");
  const canSyncLark = user?.roles?.includes("Super Admin") ?? false;
  const setup = useSyncExternalStore(
    subscribeDemandSetup,
    getDemandSetup,
    () => DEFAULT_SETUP
  );
  const { filters, viewMode } = setup;
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
    const currentSetup = getDemandSetup();
    writeDemandSetup({
      ...currentSetup,
      filters: {
        ...next,
        sortBy: next.sortBy ?? "createdAt",
        sortOrder: next.sortOrder ?? "desc",
        page: next.page ?? 1,
        limit: next.limit ?? 20,
      },
    });
  };
  const setViewMode = (next: DemandViewMode) => {
    writeDemandSetup({ ...getDemandSetup(), viewMode: next });
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
            canExport={canExport}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
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
          {viewMode === "summary" ? (
            <CustomerDemandOrderSummary
              filters={filters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              canExport={canExport}
            />
          ) : (
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
              canExport={canExport}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
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
