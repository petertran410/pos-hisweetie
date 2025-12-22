"use client";

import { useState } from "react";
import { CustomersSidebar } from "@/components/customers/CustomersSidebar";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { ColumnVisibilityDropdown } from "@/components/customers/ColumnVisibilityDropdown";
import { Search, Plus, Download, Filter } from "lucide-react";

export default function CustomersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <CustomersSidebar />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Khách hàng</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Khách hàng
              </button>
              <ColumnVisibilityDropdown />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Theo mã, tên, số điện thoại"
                className="w-full pl-10 pr-4 py-2 border rounded"
              />
            </div>
            <button className="p-2 border rounded hover:bg-gray-50">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <CustomersTable />
      </div>

      {showCreateForm && (
        <CustomerForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
