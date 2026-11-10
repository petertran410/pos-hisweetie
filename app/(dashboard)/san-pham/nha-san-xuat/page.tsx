"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { manufacturersApi, type Manufacturer } from "@/lib/api/manufacturers";
import {
  ManufacturerSidebar,
  type ManufacturerView,
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
  const [includeInactive, setIncludeInactive] = useState(false);
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
    enabled: view !== "costHistory",
    queryKey: ["manufacturers", query, page, includeInactive, limit],
    queryFn: () =>
      manufacturersApi.list({
        search: query,
        pageSize: limit,
        currentItem: page * limit,
        includeInactive,
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
      <ManufacturerSidebar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={changeSearch}
        includeInactive={includeInactive}
        onIncludeInactiveChange={(value) => {
          setIncludeInactive(value);
          setPage(0);
          setSelected(null);
        }}
        selected={selected}
        onSelect={setSelected}
        mobileOpen={mobileFilters}
        onClose={() => setMobileFilters(false)}
      />
      <section
        aria-label="Dữ liệu nhà sản xuất"
        className="m-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:my-4 lg:ml-0 lg:mr-4"
      >
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
        {view === "costHistory" ? <ProductionCostHistoryPanel manufacturerId={selected} /> : <ManufacturersTable
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
        />}
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
