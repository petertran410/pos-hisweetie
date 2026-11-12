"use client";

import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { useSearchParams } from "next/navigation";
import { useOrderSupplier } from "@/lib/hooks/useOrderSuppliers";
import { usePurchaseOrder } from "@/lib/hooks/usePurchaseOrders";
import { useProduction } from "@/lib/hooks/useProductions";

export default function NewPurchaseOrderPage() {
  const searchParams = useSearchParams();
  const orderSupplierId = searchParams.get("orderSupplierId");
  const copyPurchaseOrderId = searchParams.get("copyPurchaseOrderId");
  // Nhận hàng phiếu Gửi sản xuất (nút "Mở form nhập hàng" ở trang Sản xuất).
  const productionId = searchParams.get("productionId");

  const { data: orderSupplier, isLoading: isLoadingOS } = useOrderSupplier(
    orderSupplierId ? Number(orderSupplierId) : 0
  );
  const { data: copySource, isLoading: isLoadingCopy } = usePurchaseOrder(
    copyPurchaseOrderId ? Number(copyPurchaseOrderId) : 0
  );
  const { data: production, isLoading: isLoadingProduction } = useProduction(
    productionId ? Number(productionId) : 0
  );

  if (
    (orderSupplierId && isLoadingOS) ||
    (copyPurchaseOrderId && isLoadingCopy) ||
    (productionId && isLoadingProduction)
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <PurchaseOrderForm
      orderSupplier={orderSupplier || null}
      copyFrom={copySource || null}
      // Chỉ nhận phiếu đang chờ nhận hàng (Đã gửi, chưa có phiếu nhập).
      production={
        production?.isExternal &&
        production.status === 4 &&
        !production.purchaseOrders?.length
          ? production
          : null
      }
    />
  );
}
