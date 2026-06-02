"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TransferTable } from "@/components/transfers/TransferTable";
import { TransferForm } from "@/components/transfers/TransferForm";
import { TransferSidebar } from "@/components/transfers/TransferSidebar";
import { Plus, FileDown, FileUp } from "lucide-react";
import type { Transfer, TransferQueryParams } from "@/lib/api/transfers";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function TransferPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransferQueryParams>(() =>
    codeParam ? { search: codeParam } : {}
  );

  const handleFiltersChange = useCallback(
    (newFilters: TransferQueryParams) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
      setPage(1);
    },
    [codeParam]
  );

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
