"use client";

import { useRouter } from "next/navigation";
import { FinancePageGuard } from "@/components/permissions/FinancePageGuard";
import { WarehouseExpenseForm } from "@/components/warehouse-expense/WarehouseExpenseForm";
import { useCreateBranchId } from "@/lib/internal-finance/header-branch";

export default function PhieuKhoChiKhacPage() {
  const router = useRouter();
  const branchId = useCreateBranchId("warehouse_expense", [6, 1, 4, 7]);
  return (
    <FinancePageGuard
      permissions={[{ resource: "warehouse_expense", action: "create" }]}>
      <div className="min-h-screen">
        <WarehouseExpenseForm
          branchId={branchId}
          keepOpenAfterCreate
          onClose={() => router.push("/phieu-kho")}
        />
      </div>
    </FinancePageGuard>
  );
}
