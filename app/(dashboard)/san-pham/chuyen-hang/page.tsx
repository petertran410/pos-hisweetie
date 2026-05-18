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

        <TransferTable filters={filters} />

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
