"use client";

import { useRouter } from "next/navigation";
import { VehicleFinanceForm } from "@/components/internal-finance/VehicleFinanceForm";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { useCreateBranchId } from "@/lib/internal-finance/header-branch";

export default function PhieuKhoChamSocXePage() {
  const router = useRouter();
  const branchId = useCreateBranchId("vehicles", [6, 1]);
  return (
    <FinancePageGuard
      permissions={[{ resource: "vehicles", action: "create" }]}>
      <div className="min-h-screen">
        <VehicleFinanceForm
          kind="VEHICLE_CARE"
          branchId={branchId}
          lockKind
          keepOpenAfterCreate
          onClose={() => router.push("/phieu-kho")}
        />
      </div>
    </FinancePageGuard>
  );
}
