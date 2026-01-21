"use client";

import { useState } from "react";
import { DestructionsSidebar } from "@/components/destructions/DestructionsSidebar";
import { DestructionsTable } from "@/components/destructions/DestructionsTable";
import {
  useDestructions,
  useDeleteDestruction,
} from "@/lib/hooks/useDestructions";
import { FileUp, FileDown, Plus } from "lucide-react";

export default function DestructionsPage() {
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b p-4 flex items-center justify-between bg-white">
          <h1 className="text-2xl font-bold">Xuất hủy</h1>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
              <FileUp className="w-4 h-4" />
              Import file
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
              <FileDown className="w-4 h-4" />
              Xuất file
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Xuất hủy
            </button>
          </div>
        </div>

        <DestructionsTable
          destructions={data?.data || []}
          isLoading={isLoading}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onEdit={(destruction) => {
            console.log("Edit:", destruction);
          }}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
