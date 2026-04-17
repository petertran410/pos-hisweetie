"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersSidebar } from "@/components/orders/OrdersSidebar";
import type { Order } from "@/lib/types/order";
import { useRouter } from "next/navigation";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";

export default function DatHangPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState({});

  usePendingPrint();

  // Sync Code param vào filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: codeParam || undefined,
    }));
  }, [codeParam]);

  const handleCreateClick = () => {
    router.push("/ban-hang?type=order");
  };

  const handleEditClick = (order: Order) => {};

  return (
    <div className="flex h-full border-t bg-gray-50 w-screen">
      <OrdersSidebar filters={filters} onFiltersChange={setFilters} />
      <OrdersTable
        filters={filters}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
      />
    </div>
  );
}
