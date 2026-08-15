"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  FactoryPriceTrendFilters,
  FactoryPriceTrendSidebar,
} from "@/components/factories/FactoryPriceTrendSidebar";
import { FactoryPriceTrendChart } from "@/components/factories/FactoryPriceTrendChart";
import { useFactoryPriceSeries } from "@/lib/hooks/useFactoryProducts";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function FactoryPriceTrendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = Number(searchParams.get("productId")) || 0;
  const initialFactoryId = Number(searchParams.get("factoryId")) || 0;

  const [filters, setFilters] = useState<FactoryPriceTrendFilters>({
    productId: initialProductId,
    factoryIds: initialFactoryId ? [initialFactoryId] : [],
    currencyMode: "vnd",
    page: 1,
    limit: 500,
    ...defaultRange(),
  });

  const { data, isLoading, isError, refetch } = useFactoryPriceSeries(
    filters.productId ? filters : undefined
  );

  return (
    <PagePermissionGuard resource="factories" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <FactoryPriceTrendSidebar filters={filters} onChange={setFilters} />
        {filters.productId ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => router.push("/san-pham/nha-may")}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand">
                <ArrowLeft className="w-4 h-4" /> Về danh sách nhà máy
              </button>
            </div>
            <div className="flex-1 flex min-w-0">
              <FactoryPriceTrendChart
                data={data}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Chọn một sản phẩm ở bộ lọc để xem biến động giá
          </div>
        )}
      </div>
    </PagePermissionGuard>
  );
}
