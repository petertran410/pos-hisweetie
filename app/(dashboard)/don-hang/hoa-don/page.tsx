"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { useCreatePackingHang } from "@/lib/hooks/usePackingHangs";
import { useCreatePackingLoading } from "@/lib/hooks/usePackingLoadings";
import type { Invoice } from "@/lib/types/invoice";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";
import { InvoicesMobileView } from "@/components/invoices/InvoicesMobileView";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";

const FormFallback = () => (
  <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
    <div className="bg-white px-5 py-3 rounded-xl shadow-lg text-sm text-gray-600">
      Đang tải biểu mẫu...
    </div>
  </div>
);

const PackingSlipForm = dynamic(
  () =>
    import("@/components/packing-slips/PackingSlipForm").then(
      (m) => m.PackingSlipForm
    ),
  { ssr: false, loading: FormFallback }
);

const PackingHangForm = dynamic(
  () =>
    import("@/components/packing-hangs/PackingHangForm").then(
      (m) => m.PackingHangForm
    ),
  { ssr: false, loading: FormFallback }
);

const PackingLoadingForm = dynamic(
  () =>
    import("@/components/packing-loadings/PackingLoadingForm").then(
      (m) => m.PackingLoadingForm
    ),
  { ssr: false, loading: FormFallback }
);

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function HoaDonPage() {
  const isMobile = useIsMobile(768);
  const mounted = useIsClient();

  const router = useRouter();
  const pathname = usePathname();
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

  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      // Khi có ?Code= trên URL → chỉ tìm theo mã hóa đơn, bỏ qua toàn bộ
      // filter từ sidebar (chi nhánh, trạng thái, thời gian...). Trang thường
      // (không có Code) thì filter hoạt động bình thường.
      if (codeParam) {
        setFilters({ search: codeParam });
        return;
      }
      setFilters(newFilters);
    },
    [codeParam]
  );

  const clearCodeParam = useCallback(() => {
    if (!codeParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("Code");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    setFilters((previous: any) => {
      const next = { ...previous };
      delete next.search;
      return next;
    });
  }, [codeParam, pathname, router, searchParams]);

  const [formType, setFormType] = useState<FormType>(null);
  const [preselectedInvoiceIds, setPreselectedInvoiceIds] = useState<number[]>(
    []
  );
  const [preselectedBranchId, setPreselectedBranchId] = useState<number | null>(
    null
  );

  const createPackingSlip = useCreatePackingSlip();
  const createPackingHang = useCreatePackingHang();
  const createPackingLoading = useCreatePackingLoading();

  usePendingPrint();

  const handleCreateClick = () => {
    router.push("/ban-hang?type=invoice&from=hoa-don");
  };

  const handleEditClick = (invoice: Invoice) => {};

  const handleCreateGiaoHang = (
    selectedIds: number[],
    branchId: number | null
  ) => {
    setPreselectedInvoiceIds(selectedIds);
    setPreselectedBranchId(branchId);
    setFormType("giao-hang");
  };

  const handleCreateDongHang = (
    selectedIds: number[],
    branchId: number | null
  ) => {
    setPreselectedInvoiceIds(selectedIds);
    setPreselectedBranchId(branchId);
    setFormType("dong-hang");
  };

  const handleCreateLoading = (
    selectedIds: number[],
    branchId: number | null
  ) => {
    setPreselectedInvoiceIds(selectedIds);
    setPreselectedBranchId(branchId);
    setFormType("loading");
  };

  const handleGiaoHangSubmit = async (formData: any) => {
    try {
      await createPackingSlip.mutateAsync(formData);
      toast.success("Tạo giao hàng thành công");
      handleCloseForm();
    } catch (error) {
      toast.error("Tạo giao hàng thất bại");
    }
  };

  const handleDongHangSubmit = async (formData: any) => {
    try {
      await createPackingHang.mutateAsync(formData);
      toast.success("Tạo đóng hàng thành công");
      handleCloseForm();
    } catch (error) {
      toast.error("Tạo đóng hàng thất bại");
    }
  };

  const handleLoadingSubmit = async (formData: any) => {
    try {
      await createPackingLoading.mutateAsync(formData);
      toast.success("Tạo loading thành công");
      handleCloseForm();
    } catch (error) {
      toast.error("Tạo loading thất bại");
    }
  };

  const handleCloseForm = () => {
    setFormType(null);
    setPreselectedInvoiceIds([]);
    setPreselectedBranchId(null);
  };

  return (
    // <PagePermissionGuard resource="invoices" action="view">
    <>
      {!mounted ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
        </div>
      ) : isMobile ? (
        <div className="h-full">
          <InvoicesMobileView
            key={`mobile-${codeParam ?? "all"}`}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onCreateClick={handleCreateClick}
            onClearCode={clearCodeParam}
          />
        </div>
      ) : (
        <div
          className="flex h-full border-t"
          style={{ borderColor: "var(--dt-border)" }}>
          <InvoicesSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            splitTimeFilters
            showPriceWarningFilter
          />
          <InvoicesTable
            key={`desktop-${codeParam ?? "all"}`}
            filters={filters}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onCreateGiaoHang={handleCreateGiaoHang}
            onCreateDongHang={handleCreateDongHang}
            onCreateLoading={handleCreateLoading}
            autoExpandCode={codeParam || undefined}
            onClearCode={clearCodeParam}
          />

          {formType === "giao-hang" && (
            <PackingSlipForm
              onClose={handleCloseForm}
              onSubmit={handleGiaoHangSubmit}
              preselectedInvoiceIds={preselectedInvoiceIds}
              preselectedBranchId={preselectedBranchId}
            />
          )}

          {formType === "dong-hang" && (
            <PackingHangForm
              onClose={handleCloseForm}
              onSubmit={handleDongHangSubmit}
              preselectedInvoiceIds={preselectedInvoiceIds}
              preselectedBranchId={preselectedBranchId}
            />
          )}

          {formType === "loading" && (
            <PackingLoadingForm
              onClose={handleCloseForm}
              onSubmit={handleLoadingSubmit}
              preselectedInvoiceIds={preselectedInvoiceIds}
              preselectedBranchId={preselectedBranchId}
            />
          )}
        </div>
      )}
      {/* </PagePermissionGuard> */}
    </>
  );
}
