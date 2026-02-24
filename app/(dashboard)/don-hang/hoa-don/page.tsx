"use client";

import { useState } from "react";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { InvoicesSidebar } from "@/components/invoices/InvoicesSidebar";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import {
  useCreatePackingSlip,
  useUpdatePackingSlip,
} from "@/lib/hooks/usePackingSlips";
import {
  useCreatePackingHang,
  useUpdatePackingHang,
} from "@/lib/hooks/usePackingHangs";
import {
  useCreatePackingLoading,
  useUpdatePackingLoading,
} from "@/lib/hooks/usePackingLoadings";
import type { Invoice } from "@/lib/types/invoice";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function HoaDonPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({});
  const [formType, setFormType] = useState<FormType>(null);
  const [preselectedInvoiceIds, setPreselectedInvoiceIds] = useState<number[]>(
    []
  );
  const [preselectedBranchId, setPreselectedBranchId] = useState<number | null>(
    null
  );

  const createPackingSlip = useCreatePackingSlip();
  const updatePackingSlip = useUpdatePackingSlip();
  const createPackingHang = useCreatePackingHang();
  const updatePackingHang = useUpdatePackingHang();
  const createPackingLoading = useCreatePackingLoading();
  const updatePackingLoading = useUpdatePackingLoading();

  const handleCreateClick = () => {
    router.push("/ban-hang?type=invoice");
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
    <div className="flex h-full border-t bg-gray-50">
      <InvoicesSidebar filters={filters} onFiltersChange={setFilters} />
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
  );
}
