"use client";

import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { usePurchaseOrder } from "@/lib/hooks/usePurchaseOrders";
import { useParams } from "next/navigation";

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: purchaseOrder, isLoading } = usePurchaseOrder(id);

  console.log(purchaseOrder);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <PurchaseOrderForm purchaseOrder={purchaseOrder || null} />;
}
