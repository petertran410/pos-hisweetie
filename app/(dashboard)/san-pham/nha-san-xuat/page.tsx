"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { manufacturersApi, type Manufacturer } from "@/lib/api/manufacturers";
import {
  ManufacturerSidebar,
  type ManufacturerView,
  type ManufacturerStatus,
  type ManufacturerBooleanFilter,
} from "@/components/manufacturers/ManufacturerSidebar";
import { ManufacturersTable } from "@/components/manufacturers/ManufacturersTable";
import { ManufacturerForm } from "@/components/manufacturers/ManufacturerForm";
import { ProductionCostHistoryPanel } from "@/components/manufacturers/ProductionCostHistoryPanel";

export default function ManufacturersPage() {
  return (
    <PagePermissionGuard resource="productions" action="view">
      <ManufacturersView />
    </PagePermissionGuard>
  );
}

function ManufacturersView() {
  const [view, setView] = useState<ManufacturerView>("info");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(15);
  const [status, setStatus] = useState<ManufacturerStatus>("active");
  const [inProgress, setInProgress] =
    useState<ManufacturerBooleanFilter>("all");
  const [debt, setDebt] = useState<ManufacturerBooleanFilter>("all");
  const [showCostHistory, setShowCostHistory] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Manufacturer | "new" | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useQuery({
    enabled: !showCostHistory,
    queryKey: ["manufacturers", query, page, status, inProgress, debt, limit],
    queryFn: () =>
      manufacturersApi.list({
        search: query,
        pageSize: limit,
        currentItem: page * limit,
        includeInactive: status === "all" ? true : undefined,
        isActive: status === "all" ? undefined : status === "active",
        hasInProgress: inProgress === "all" ? undefined : inProgress === "yes",
        hasDebt: debt === "all" ? undefined : debt === "yes",
      }),
  });
  const changeSearch = (value: string) => {
    setSearch(value);
    setSelected(null);
  };
  const changePage = (value: number) => {
    setPage(value);
    setSelected(null);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-gray-50/50">
      {!showCostHistory && (
        <ManufacturerSidebar
          status={status}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(0);
            setSelected(null);
          }}
          inProgress={inProgress}
          onInProgressChange={(value) => {
            setInProgress(value);
            setPage(0);
            setSelected(null);
          }}
          debt={debt}
          onDebtChange={(value) => {
            setDebt(value);
            setPage(0);
            setSelected(null);
          }}
          mobileOpen={mobileFilters}
          onClose={() => setMobileFilters(false)}
        />
      )}
      <section
        aria-label="Dữ liệu nhà sản xuất"
        className="m-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:my-4 lg:ml-0 lg:mr-4"
      >
        {!showCostHistory && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 lg:hidden">
            <span className="text-sm font-medium text-gray-800">
              Nhà sản xuất
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600"
              onClick={() => setMobileFilters(true)}
              aria-expanded={mobileFilters}
            >
              <SlidersHorizontal size={15} />
              Bộ lọc
            </button>
          </div>
        )}
        {showCostHistory ? (
          <>
            <div className="border-b px-4 py-2">
              <button
                type="button"
                onClick={() => setShowCostHistory(false)}
                className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                Nhà sản xuất
              </button>
            </div>
            <ProductionCostHistoryPanel />
          </>
        ) : (
          <ManufacturersTable
            rows={list.data?.data ?? []}
            total={list.data?.total ?? 0}
            loading={list.isLoading}
            error={list.isError}
            refreshing={list.isFetching}
            onRefresh={() => {
              void list.refetch();
            }}
            search={search}
            onSearchChange={changeSearch}
            page={page}
            limit={limit}
            onPageChange={changePage}
            onLimitChange={(value) => {
              setLimit(value);
              changePage(0);
            }}
            selected={selected}
            onSelect={setSelected}
            view={view}
            onViewChange={setView}
            onEdit={setEditing}
            onCreate={() => setEditing("new")}
            onOpenCostHistory={() => {
              setShowCostHistory(true);
              setMobileFilters(false);
            }}
          />
        )}
      </section>
      {editing && (
        <ManufacturerForm
          value={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
