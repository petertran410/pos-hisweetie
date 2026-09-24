"use client";

import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { ProductQualityTable } from "@/components/product-quality/ProductQualityTable";

export default function ProductQualityPage() {
  return (
    <PagePermissionGuard resource="product_quality" action="view">
      <ProductQualityTable />
    </PagePermissionGuard>
  );
}
