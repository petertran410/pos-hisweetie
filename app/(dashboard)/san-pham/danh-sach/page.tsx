"use client";

import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductListPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Fixed width, scroll content */}
      <aside className="w-64 border-r shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ProductSidebar />
        </div>
      </aside>

      {/* Main Content - Flexible width, scroll content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ProductTable />
      </main>
    </div>
  );
}
