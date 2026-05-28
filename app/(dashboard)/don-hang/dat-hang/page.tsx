"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersSidebar } from "@/components/orders/OrdersSidebar";
import type { Order } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { OrdersMobileView } from "@/components/orders/OrdersMobileView";

export default function DatHangPage() {
  const router = useRouter();
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

  usePendingPrint();

  const handleCreateClick = () => {
    router.push("/ban-hang?type=order");
  };

  const handleEditClick = (order: Order) => {};

  return (
    <PagePermissionGuard resource="orders" action="view">
      {/* ── Desktop (md+) — giữ nguyên 100% ── */}
      <div className="hidden md:flex h-full border-t bg-gray-50 w-screen">
        <OrdersSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <OrdersTable
          filters={filters}
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
        />
      </div>

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-full">
        <OrdersMobileView
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateClick={handleCreateClick}
        />
      </div>
    </PagePermissionGuard>
  );
}
