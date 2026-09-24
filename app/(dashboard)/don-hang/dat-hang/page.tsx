"use client";

import { useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersSidebar } from "@/components/orders/OrdersSidebar";
import type { Order } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { OrdersMobileView } from "@/components/orders/OrdersMobileView";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";

export default function DatHangPage() {
  const isMobile = useIsMobile(768);
  const mounted = useIsClient();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");
  const [filters, setFilters] = useState<any>(() =>
    codeParam
      ? { search: codeParam }
      : {
          pageSize: 15,
          currentItem: 0,
        }
  );

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
    },
    [codeParam]
  );

  const clearCodeParam = useCallback(() => {
    if (!codeParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("Code");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    setFilters((previous: any) => {
      const next = { ...previous };
      delete next.search;
      return next;
    });
  }, [codeParam, pathname, router, searchParams]);

  usePendingPrint();

  const handleCreateClick = () => {
    router.push("/ban-hang?type=order&from=dat-hang");
  };

  const handleEditClick = (order: Order) => {};

  return (
    <PagePermissionGuard resource="orders" action="view">
      {!mounted ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
        </div>
      ) : isMobile ? (
        <div className="h-full">
          <OrdersMobileView
            key={`mobile-${codeParam ?? "all"}`}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onCreateClick={handleCreateClick}
            onClearCode={clearCodeParam}
          />
        </div>
      ) : (
        <div
          className="flex h-full border-t"
          style={{ borderColor: "var(--dt-border)" }}>
          <OrdersSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
          <OrdersTable
            key={`desktop-${codeParam ?? "all"}`}
            filters={filters}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            autoExpandCode={codeParam || undefined}
            onClearCode={clearCodeParam}
          />
        </div>
      )}
    </PagePermissionGuard>
  );
}
