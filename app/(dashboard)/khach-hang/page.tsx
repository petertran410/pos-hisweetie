// app/(dashboard)/khach-hang/page.tsx
"use client";

import { useState } from "react";
import { CustomersSidebar } from "@/components/customers/CustomersSidebar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function CustomersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <CustomersSidebar />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <CustomersTable onCreateClick={() => setShowCreateForm(true)} />
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
