"use client";

import { OrderSupplierForm } from "@/components/order-suppliers/OrderSupplierForm";
import { useOrderSupplier } from "@/lib/hooks/useOrderSuppliers";
import { useParams } from "next/navigation";

export default function EditOrderSupplierPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: orderSupplier, isLoading } = useOrderSupplier(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <OrderSupplierForm orderSupplier={orderSupplier || null} />;
}
