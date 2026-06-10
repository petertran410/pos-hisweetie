"use client";

import { useEffect, useState } from "react";
import { PackingSlipsTable } from "@/components/packing-slips/PackingSlipsTable";
import { PackingSlipsSidebar } from "@/components/packing-slips/PackingSlipsSidebar";
import { PackingSlipsMobileView } from "@/components/packing-slips/PackingSlipsMobileView";
import { DeliveryOverview } from "@/components/packing-slips/DeliveryOverview";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useAllPacking } from "@/lib/hooks/useAllPacking";
import {
  useCreatePackingSlip,
  useUpdatePackingSlip,
  useDeletePackingSlip,
  useResendPackingSlipNotification,
  useResendPackingSlipLark,
} from "@/lib/hooks/usePackingSlips";
import {
  useCreatePackingHang,
  useUpdatePackingHang,
  useDeletePackingHang,
} from "@/lib/hooks/usePackingHangs";
import {
  useCreatePackingLoading,
  useUpdatePackingLoading,
  useDeletePackingLoading,
  useResendPackingLoadingLark,
} from "@/lib/hooks/usePackingLoadings";
import type { PackingSlip } from "@/lib/types/packing-slip";
import type { PackingHang } from "@/lib/types/packing-hang";
import type { PackingLoading } from "@/lib/types/packing-loading";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useSearchParams } from "next/navigation";

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function BaoDonPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code");
  const [filters, setFilters] = useState<any>(() =>
    codeParam ? { search: codeParam } : {}
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [formType, setFormType] = useState<FormType>(null);
  const [formKey, setFormKey] = useState(0);

  // Search ở header của bảng (desktop) — search server-side, debounce 300ms.
  // Khi đang lọc theo Code (URL param) → bỏ qua.
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedTableSearch, setDebouncedTableSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTableSearch(tableSearch), 300);
    return () => clearTimeout(t);
  }, [tableSearch]);
  // Reset về trang 1 khi search thay đổi
  useEffect(() => {
    setPage(1);
  }, [debouncedTableSearch]);

  // Khi đang lọc theo Code: bỏ qua toàn bộ filter sidebar
  const handleFiltersChange = (newFilters: any) => {
    if (codeParam) return;
    setFilters(newFilters);
  };

  const [editingPackingSlip, setEditingPackingSlip] =
    useState<PackingSlip | null>(null);
  const [editingPackingHang, setEditingPackingHang] =
    useState<PackingHang | null>(null);
  const [editingPackingLoading, setEditingPackingLoading] =
    useState<PackingLoading | null>(null);

  // Khi user gõ ở ô search của bảng → ưu tiên hơn filters.search từ sidebar.
  // Nếu đang có codeParam thì giữ nguyên hành vi cũ (lọc theo Code).
  const mergedFilters = (() => {
    if (codeParam) return filters;
    if (debouncedTableSearch) {
      return { ...filters, search: debouncedTableSearch };
    }
    return filters;
  })();

  const { data, isLoading } = useAllPacking({
    ...mergedFilters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const createPackingSlip = useCreatePackingSlip();
  const updatePackingSlip = useUpdatePackingSlip();
  const deletePackingSlip = useDeletePackingSlip();
  const resendPackingSlipNotification = useResendPackingSlipNotification();
  const resendPackingSlipLark = useResendPackingSlipLark();

  const createPackingHang = useCreatePackingHang();
  const updatePackingHang = useUpdatePackingHang();
  const deletePackingHang = useDeletePackingHang();

  const createPackingLoading = useCreatePackingLoading();
  const updatePackingLoading = useUpdatePackingLoading();
  const deletePackingLoading = useDeletePackingLoading();
  const resendPackingLoadingLark = useResendPackingLoadingLark();

  const handleCreateGiaoHangClick = () => {
    setEditingPackingSlip(null);
    setFormType("giao-hang");
  };

  const handleCreateDongHangClick = () => {
    setEditingPackingHang(null);
    setFormType("dong-hang");
  };

  const handleCreateLoadingClick = () => {
    setEditingPackingLoading(null);
    setFormType("loading");
  };

  const handleEditClick = (item: any) => {
    if (item.type === "dong-hang") {
      setEditingPackingHang(item);
      setFormType("dong-hang");
    } else if (item.type === "loading") {
      setEditingPackingLoading(item);
      setFormType("loading");
    } else {
      setEditingPackingSlip(item);
      setFormType("giao-hang");
    }
  };

  const handleGiaoHangSubmit = async (formData: any) => {
    try {
      if (editingPackingSlip) {
        await updatePackingSlip.mutateAsync({
          id: editingPackingSlip.id,
          data: formData,
        });
        toast.success("Cập nhật giao hàng thành công");
        setFormType(null);
        setEditingPackingSlip(null);
      } else {
        await createPackingSlip.mutateAsync(formData);
        toast.success("Tạo giao hàng thành công");
        setFormKey((k) => k + 1);
      }
    } catch (error) {
      toast.error(
        editingPackingSlip
          ? "Cập nhật giao hàng thất bại"
          : "Tạo giao hàng thất bại"
      );
    }
  };

  const handleDongHangSubmit = async (formData: any) => {
    try {
      if (editingPackingHang) {
        await updatePackingHang.mutateAsync({
          id: editingPackingHang.id,
          data: formData,
        });
        toast.success("Cập nhật đóng hàng thành công");
        setFormType(null);
        setEditingPackingHang(null);
      } else {
        await createPackingHang.mutateAsync(formData);
        toast.success("Tạo đóng hàng thành công");
        setFormKey((k) => k + 1);
      }
    } catch (error) {
      toast.error(
        editingPackingHang
          ? "Cập nhật đóng hàng thất bại"
          : "Tạo đóng hàng thất bại"
      );
    }
  };

  const handleLoadingSubmit = async (formData: any) => {
    try {
      if (editingPackingLoading) {
        await updatePackingLoading.mutateAsync({
          id: editingPackingLoading.id,
          data: formData,
        });
        toast.success("Cập nhật loading thành công");
        setFormType(null);
        setEditingPackingLoading(null);
      } else {
        await createPackingLoading.mutateAsync(formData);
        toast.success("Tạo loading thành công");
        setFormKey((k) => k + 1);
      }
    } catch (error) {
      toast.error(
        editingPackingLoading
          ? "Cập nhật loading thất bại"
          : "Tạo loading thất bại"
      );
    }
  };

  // Mobile xóa: tự phân loại theo type của item
  const handleMobileDelete = async (item: any) => {
    try {
      if (item.type === "dong-hang") {
        await deletePackingHang.mutateAsync(item.id);
      } else if (item.type === "loading") {
        await deletePackingLoading.mutateAsync(item.id);
      } else {
        await deletePackingSlip.mutateAsync(item.id);
      }
      toast.success("Hủy phiếu thành công");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Hủy phiếu thất bại"
      );
    }
  };

  const handleDelete = async (slip: any) => {
    // Gọi đúng endpoint theo type (giao-hang / dong-hang / loading)
    // → tránh xóa nhầm sang packing-slips khi id trùng giữa các bảng.
    try {
      if (slip?.type === "dong-hang") {
        await deletePackingHang.mutateAsync(slip.id);
      } else if (slip?.type === "loading") {
        await deletePackingLoading.mutateAsync(slip.id);
      } else {
        await deletePackingSlip.mutateAsync(slip.id);
      }
      toast.success("Hủy phiếu thành công");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Hủy phiếu thất bại"
      );
    }
  };

  const handleResend = async (id: number) => {
    try {
      await resendPackingSlipNotification.mutateAsync(id);
      toast.success("Đã gửi lại thông báo Zalo");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gửi lại thông báo Zalo thất bại"
      );
    }
  };

  const handleResendLark = async (id: number) => {
    try {
      await resendPackingSlipLark.mutateAsync(id);
      toast.success("Đã đồng bộ phiếu chi lên Lark");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Đồng bộ phiếu chi lên Lark thất bại"
      );
    }
  };

  const handleResendLoadingLark = async (id: number) => {
    try {
      await resendPackingLoadingLark.mutateAsync(id);
      toast.success("Đã gửi lại thông báo loading lên Lark");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gửi lại thông báo loading lên Lark thất bại"
      );
    }
  };

  const handleCloseForm = () => {
    setFormType(null);
    setEditingPackingSlip(null);
    setEditingPackingHang(null);
    setEditingPackingLoading(null);
  };

  useEffect(() => {
    const form = searchParams.get("form");
    if (form === "giao-hang" || form === "dong-hang" || form === "loading") {
      setFormType(form as FormType);
    }
  }, [searchParams]);

  return (
    <PagePermissionGuard resource="packing_slips" action="view">
      {/* ── Desktop (md+) ── */}
      <div
        className="hidden md:flex md:flex-col h-full border-t overflow-y-auto"
        style={{ borderColor: "var(--dt-border)" }}>
        {/* Tổng quan giao hàng hôm nay */}
        {/* <div className="px-4 pt-4">
          <DeliveryOverview />
        </div> */}
        <div className="flex flex-1 min-h-[600px]">
          <PackingSlipsSidebar onFiltersChange={handleFiltersChange} />
          <PackingSlipsTable
            packingSlips={data?.data || []}
            isLoading={isLoading}
            total={data?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onCreateClick={handleCreateGiaoHangClick}
            onCreatePackingHangClick={handleCreateDongHangClick}
            onCreatePackingLoadingClick={handleCreateLoadingClick}
            onEditClick={handleEditClick}
            onDeleteClick={handleDelete}
            onResendClick={handleResend}
            onResendLarkClick={handleResendLark}
            onResendLoadingLarkClick={handleResendLoadingLark}
            search={tableSearch}
            onSearchChange={setTableSearch}
          />

          {formType === "giao-hang" && (
            <PackingSlipForm
              key={formKey}
              packingSlip={editingPackingSlip || undefined}
              onClose={handleCloseForm}
              onSubmit={handleGiaoHangSubmit}
            />
          )}

          {formType === "dong-hang" && (
            <PackingHangForm
              key={formKey}
              packingHang={editingPackingHang || undefined}
              onClose={handleCloseForm}
              onSubmit={handleDongHangSubmit}
            />
          )}

          {formType === "loading" && (
            <PackingLoadingForm
              key={formKey}
              packingLoading={editingPackingLoading || undefined}
              onClose={handleCloseForm}
              onSubmit={handleLoadingSubmit}
            />
          )}
        </div>
      </div>

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden h-full">
        <PackingSlipsMobileView
          onCreateGiaoHangClick={handleCreateGiaoHangClick}
          onCreateDongHangClick={handleCreateDongHangClick}
          onCreateLoadingClick={handleCreateLoadingClick}
          onEditClick={handleEditClick}
          onDeleteClick={(item) => {
            // mobile truyền nguyên item → biết type để gọi đúng endpoint
            handleMobileDelete(item);
          }}
          onResendClick={handleResend}
          onResendLarkClick={handleResendLark}
          onResendLoadingLarkClick={handleResendLoadingLark}
        />

        {formType === "giao-hang" && (
          <PackingSlipForm
            key={formKey}
            packingSlip={editingPackingSlip || undefined}
            onClose={handleCloseForm}
            onSubmit={handleGiaoHangSubmit}
          />
        )}

        {formType === "dong-hang" && (
          <PackingHangForm
            key={formKey}
            packingHang={editingPackingHang || undefined}
            onClose={handleCloseForm}
            onSubmit={handleDongHangSubmit}
          />
        )}

        {formType === "loading" && (
          <PackingLoadingForm
            key={formKey}
            packingLoading={editingPackingLoading || undefined}
            onClose={handleCloseForm}
            onSubmit={handleLoadingSubmit}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
