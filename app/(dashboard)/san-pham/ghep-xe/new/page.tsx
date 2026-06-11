"use client";

import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { VehicleShipmentForm } from "@/components/vehicle-shipments/VehicleShipmentForm";

export default function NewVehicleShipmentPage() {
  return (
    <PagePermissionGuard resource="vehicle_shipments" action="create">
      <div className="h-full">
        <VehicleShipmentForm />
      </div>
    </PagePermissionGuard>
  );
}
