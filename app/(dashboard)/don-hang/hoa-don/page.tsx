"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { useCreatePackingHang } from "@/lib/hooks/usePackingHangs";
import { useCreatePackingLoading } from "@/lib/hooks/usePackingLoadings";
import type { Invoice } from "@/lib/types/invoice";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePendingPrint } from "@/lib/hooks/usePendingPrint";
import { InvoicesMobileView } from "@/components/invoices/InvoicesMobileView";

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function HoaDonPage() {
  const router = useRouter();
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
      setFilters({
        ...newFilters,
        ...(codeParam ? { search: codeParam } : {}),
      });
    },
    [codeParam]
  );

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
    <PagePermissionGuard resource="invoices" action="view">
      <div className="hidden md:flex h-full border-t bg-gray-50">
        <InvoicesSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          splitTimeFilters
          showPriceWarningFilter
        />
        <InvoicesTable
          filters={filters}
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
          onCreateGiaoHang={handleCreateGiaoHang}
          onCreateDongHang={handleCreateDongHang}
          onCreateLoading={handleCreateLoading}
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

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-full">
        <InvoicesMobileView
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateClick={handleCreateClick}
        />
      </div>
    </PagePermissionGuard>
  );
}
