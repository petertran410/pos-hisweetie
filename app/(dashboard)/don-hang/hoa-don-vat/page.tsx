"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { HoaDonVatTable } from "@/components/invoices-vat/HoaDonVatTable";
import { HoaDonVatMobileView } from "@/components/invoices-vat/HoaDonVatMobileView";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";

export default function HoaDonVatPage() {
  // Chỉ mount 1 giao diện (giống trang Hóa đơn). Trước đây cả desktop lẫn mobile
  // cùng mount, chỉ ẩn bằng CSS → giao diện bị ẩn vẫn gọi API (trên điện thoại
  // bảng desktop vẫn gọi vat/totals).
  const isMobile = useIsMobile(768);
  const mounted = useIsClient();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");

  const [filters, setFilters] = useState<any>(() =>
    codeParam
      ? { search: codeParam }
      : {
          pageSize: 15,
          currentItem: 0,
        }
  );

  // Sidebar khôi phục bộ lọc (localStorage / mặc định) rồi mới đẩy lên sau
  // debounce 300ms. Trước lần đẩy đầu, `filters` chỉ là giá trị khởi tạo (không
  // trạng thái, không thời gian) → gọi API lúc này sẽ tải thừa TOÀN BỘ hóa đơn
  // (vat/totals từng mất ~20s). Bảng chờ cờ này rồi mới gọi API.
  const [filtersReady, setFiltersReady] = useState(false);

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
      setFiltersReady(true);
    },
    [codeParam]
  );

  return (
    <PagePermissionGuard resource="vat_invoices" action="view">
      {!mounted ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
        </div>
      ) : isMobile ? (
        /* ── Mobile (dưới md) ── */
        <div className="h-full">
          <HoaDonVatMobileView
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      ) : (
        <div
          className="flex h-full border-t"
          style={{ borderColor: "var(--dt-border)" }}>
          <InvoicesSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            showMisaEmployeeFilter
            showUpdatedTimeFilter
            showMisaSyncedTimeFilter
          />
          <HoaDonVatTable filters={filters} enabled={filtersReady} />
        </div>
      )}
    </PagePermissionGuard>
  );
}
