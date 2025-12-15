// app/(dashboard)/san-pham/danh-sach/page.tsx
"use client";

export default function ProductListPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {" "}
      {/* 4rem = header height */}
      {/* Sidebar - Fixed width, scroll content */}
      <aside className="w-64 border-r shrink-0">
        <div className="h-full overflow-y-auto">
          <ProductSidebar />
        </div>
      </aside>
      {/* Main Content - Flexible width, scroll content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <ProductTable />
        </div>
      </main>
    </div>
  );
}
