"use client";

import { useState } from "react";
import { CustomersSidebar } from "@/components/customers/CustomersSidebar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerFilters } from "@/lib/types/customer";

export default function CustomersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<CustomerFilters>({
    pageSize: 15,
    currentItem: 0,
    orderBy: "createdAt",
    orderDirection: "desc",
    isActive: true,
  });

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <CustomersSidebar filters={filters} setFilters={setFilters} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <CustomersTable
          filters={filters}
          onCreateClick={() => setShowCreateForm(true)}
        />
      </main>

      {showCreateForm && (
        <CustomerForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
