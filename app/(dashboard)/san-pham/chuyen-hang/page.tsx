"use client";

import { useState, useCallback } from "react";
import { TransferTable } from "@/components/transfers/TransferTable";
import { TransferForm } from "@/components/transfers/TransferForm";
import { TransferSidebar } from "@/components/transfers/TransferSidebar";
import { Plus, FileDown, FileUp } from "lucide-react";
import type { Transfer, TransferQueryParams } from "@/lib/api/transfers";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function TransferPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransferQueryParams>({});

  const handleFiltersChange = useCallback((newFilters: TransferQueryParams) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return (
    <PagePermissionGuard resource="transfers" action="view">
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <TransferSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4 flex items-center justify-between bg-white">
            <h1 className="text-2xl font-bold">Chuyển hàng</h1>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
                <FileUp className="w-4 h-4" />
                Import file
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
                <FileDown className="w-4 h-4" />
                Xuất file
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Chuyển hàng
              </button>
            </div>
          </div>

          <TransferTable filters={filters} />
        </main>

        {showForm && (
          <TransferForm
            transfer={selectedTransfer}
            onClose={() => {
              setShowForm(false);
              setSelectedTransfer(null);
            }}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
