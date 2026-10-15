"use client";

import { useRouter } from "next/navigation";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { WarehouseCashForm } from "@/components/warehouse-cash/WarehouseCashForm";

export default function PhieuKhoTienMatPage() {
  const router = useRouter();
  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_cash", action: "create" }]}>
      <div className="min-h-screen">
        <WarehouseCashForm
          keepOpenAfterCreate
          onClose={() => router.push("/phieu-kho")}
        />
      </div>
    </FinancePageGuard>
  );
}
