"use client";

import { useState } from "react";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import type { Invoice } from "@/lib/types/invoice";
import { useRouter } from "next/navigation";

export default function HoaDonPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({});

  const handleCreateClick = () => {
    router.push("/ban-hang?type=invoice");
  };

  const handleEditClick = (invoice: Invoice) => {};

  return (
    <div className="flex h-full border-t bg-gray-50">
      <InvoicesSidebar filters={filters} onFiltersChange={setFilters} />
      <InvoicesTable
        filters={filters}
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
      />
    </div>
  );
}
