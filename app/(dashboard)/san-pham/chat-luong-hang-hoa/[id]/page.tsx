"use client";

import { useParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { ProductQualityDetail } from "@/components/product-quality/ProductQualityDetail";

export default function ProductQualityDetailPage() {
  const params = useParams();
  const id = Number(params?.id);

  return (
    <PagePermissionGuard resource="product_quality" action="view">
      <ProductQualityDetail ticketId={id} />
    </PagePermissionGuard>
  );
}
