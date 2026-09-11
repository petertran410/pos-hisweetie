"use client";

import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { ProductQualityForm } from "@/components/product-quality/ProductQualityForm";

export default function NewProductQualityPage() {
  return (
    <PagePermissionGuard resource="product_quality" action="create">
      <ProductQualityForm />
    </PagePermissionGuard>
  );
}
