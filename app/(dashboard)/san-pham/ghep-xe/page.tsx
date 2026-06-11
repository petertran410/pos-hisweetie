"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { VehicleShipmentSidebar } from "@/components/vehicle-shipments/VehicleShipmentSidebar";
import { VehicleShipmentsTable } from "@/components/vehicle-shipments/VehicleShipmentsTable";
import type { VehicleShipmentFilters } from "@/lib/types/vehicle-shipment";

export default function VehicleShipmentsPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<VehicleShipmentFilters>(() =>
    codeParam ? { search: codeParam } : { pageSize: 15, currentItem: 0 }
  );

  const handleFiltersChange = useCallback(
    (newFilters: Partial<VehicleShipmentFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      }));
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="vehicle_shipments" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <VehicleShipmentSidebar
          filters={filters}
          setFilters={handleFiltersChange}
        />
        <VehicleShipmentsTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>
    </PagePermissionGuard>
  );
}
