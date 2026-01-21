"use client";

import { useState } from "react";
import { DestructionsSidebar } from "@/components/destructions/DestructionsSidebar";
import { DestructionsTable } from "@/components/destructions/DestructionsTable";
import {
  useDestructions,
  useDeleteDestruction,
} from "@/lib/hooks/useDestructions";
import { useRouter } from "next/navigation";

export default function DestructionsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading } = useDestructions({
    ...filters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const deleteDestruction = useDeleteDestruction();

  const handleDelete = async (id: number) => {
    try {
      await deleteDestruction.mutateAsync(id);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DestructionsSidebar onFiltersChange={setFilters} />

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
  );
}
