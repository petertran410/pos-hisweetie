"use client";

import { useCallback, useState } from "react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { RecipesSidebar } from "@/components/recipes/RecipesSidebar";
import { RecipesTable } from "@/components/recipes/RecipesTable";
import { RecipeQueryParams } from "@/lib/api/recipes";

export default function RecipesPage() {
  const [filters, setFilters] = useState<RecipeQueryParams & { page: number; limit: number }>({
    page: 1,
    limit: 25,
    orderBy: "updatedAt",
    orderDirection: "desc",
  });
  const update = useCallback((value: RecipeQueryParams & { page: number; limit: number }) => setFilters(value), []);

  return (
    <PagePermissionGuard resource="recipes" action="view">
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col border-t md:flex-row" style={{ borderColor: "var(--dt-border)" }}>
        <RecipesSidebar filters={filters} onChange={update} />
        <RecipesTable filters={filters} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onLimitChange={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))} />
      </div>
    </PagePermissionGuard>
  );
}
