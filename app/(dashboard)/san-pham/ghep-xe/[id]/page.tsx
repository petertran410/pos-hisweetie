"use client";

import { use } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { VehicleShipmentForm } from "@/components/vehicle-shipments/VehicleShipmentForm";

export default function EditVehicleShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <PagePermissionGuard resource="vehicle_shipments" action="update">
      <div className="h-full">
        <VehicleShipmentForm shipmentId={Number(id)} />
      </div>
    </PagePermissionGuard>
  );
}
