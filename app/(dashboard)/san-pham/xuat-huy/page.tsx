"use client";

import { useState } from "react";
import { DestructionsSidebar } from "@/components/destructions/DestructionsSidebar";
import { DestructionsTable } from "@/components/destructions/DestructionsTable";
import {
  useDestructions,
  useDeleteDestruction,
} from "@/lib/hooks/useDestructions";
import { useRouter, useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function DestructionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading } = useDestructions({
    ...filters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const deleteDestruction = useDeleteDestruction();

  // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
  const handleFiltersChange = (newFilters: any) => {
    if (codeParam) return;
    setFilters(newFilters);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDestruction.mutateAsync(id);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <PagePermissionGuard resource="destructions" action="view">
      <div className="flex h-full border-t bg-gray-50">
        <DestructionsSidebar onFiltersChange={handleFiltersChange} />

        <DestructionsTable
          destructions={data?.data || []}
          isLoading={isLoading}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onEdit={(destruction) => {
            router.push(`/san-pham/xuat-huy/${destruction.id}`);
          }}
          onDelete={handleDelete}
        />
      </div>
    </PagePermissionGuard>
  );
}
