"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CustomersSidebar } from "@/components/customers/CustomersSidebar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerFilters, Customer } from "@/lib/types/customer";

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>(() => ({
    pageSize: 15,
    currentItem: 0,
    orderBy: "createdAt",
    orderDirection: "desc",
    isActive: true,
    ...(codeParam ? { code: codeParam } : {}),
  }));

  const handleFiltersChange = useCallback(
    (newFilters: CustomerFilters) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { code: codeParam } : {}),
      });
    },
    [codeParam]
  );

  return (
    <>
      <div className="flex h-full border-t bg-gray-50 w-screen">
        <CustomersSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <CustomersTable
          filters={filters}
          onCreateClick={() => setShowCreateForm(true)}
          onEditClick={(customer) => setEditingCustomer(customer)}
        />
      </div>

      {showCreateForm && (
        <CustomerForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {editingCustomer && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={() => setEditingCustomer(null)}
        />
      )}
    </>
  );
}
