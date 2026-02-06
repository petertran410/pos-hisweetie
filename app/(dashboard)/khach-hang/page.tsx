"use client";

import { useState } from "react";
import { CustomersSidebar } from "@/components/customers/CustomersSidebar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerFilters } from "@/lib/types/customer";
import { Customer } from "@/lib/types/customer";

export default function CustomersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>({
    pageSize: 15,
    currentItem: 0,
    orderBy: "createdAt",
    orderDirection: "desc",
    isActive: true,
  });

  return (
    <>
      <div className="flex h-full border-t bg-gray-50">
        <CustomersSidebar filters={filters} setFilters={setFilters} />
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
