"use client";

import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { useSearchParams } from "next/navigation";
import { useOrderSupplier } from "@/lib/hooks/useOrderSuppliers";

export default function NewPurchaseOrderPage() {
  const searchParams = useSearchParams();
  const orderSupplierId = searchParams.get("orderSupplierId");
  const { data: orderSupplier, isLoading } = useOrderSupplier(
    orderSupplierId ? Number(orderSupplierId) : 0
  );

  if (orderSupplierId && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <PurchaseOrderForm orderSupplier={orderSupplier || null} />;
}
