"use client";

import { useState } from "react";
import { PackingSlipsTable } from "@/components/packing-slips/PackingSlipsTable";
import { PackingSlipsSidebar } from "@/components/packing-slips/PackingSlipsSidebar";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useAllPacking } from "@/lib/hooks/useAllPacking";
import {
  useCreatePackingSlip,
  useUpdatePackingSlip,
  useDeletePackingSlip,
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
} from "@/lib/hooks/usePackingLoadings";
import type { PackingSlip } from "@/lib/types/packing-slip";
import type { PackingHang } from "@/lib/types/packing-hang";
import type { PackingLoading } from "@/lib/types/packing-loading";
import { toast } from "sonner";

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function BaoDonPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [formType, setFormType] = useState<FormType>(null);
  const [editingPackingSlip, setEditingPackingSlip] =
    useState<PackingSlip | null>(null);
  const [editingPackingHang, setEditingPackingHang] =
    useState<PackingHang | null>(null);
  const [editingPackingLoading, setEditingPackingLoading] =
    useState<PackingLoading | null>(null);

  const { data, isLoading } = useAllPacking({
    ...filters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  const createPackingSlip = useCreatePackingSlip();
  const updatePackingSlip = useUpdatePackingSlip();
  const deletePackingSlip = useDeletePackingSlip();

  const createPackingHang = useCreatePackingHang();
  const updatePackingHang = useUpdatePackingHang();
  const deletePackingHang = useDeletePackingHang();

  const createPackingLoading = useCreatePackingLoading();
  const updatePackingLoading = useUpdatePackingLoading();
  const deletePackingLoading = useDeletePackingLoading();

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
      } else {
        await createPackingSlip.mutateAsync(formData);
        toast.success("Tạo giao hàng thành công");
      }
      setFormType(null);
      setEditingPackingSlip(null);
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
      } else {
        await createPackingHang.mutateAsync(formData);
        toast.success("Tạo đóng hàng thành công");
      }
      setFormType(null);
      setEditingPackingHang(null);
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
      } else {
        await createPackingLoading.mutateAsync(formData);
        toast.success("Tạo loading thành công");
      }
      setFormType(null);
      setEditingPackingLoading(null);
    } catch (error) {
      toast.error(
        editingPackingLoading
          ? "Cập nhật loading thất bại"
          : "Tạo loading thất bại"
      );
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePackingSlip.mutateAsync(id);
      toast.success("Xóa báo đơn thành công");
    } catch (error) {
      toast.error("Xóa báo đơn thất bại");
    }
  };

  const handleCloseForm = () => {
    setFormType(null);
    setEditingPackingSlip(null);
    setEditingPackingHang(null);
    setEditingPackingLoading(null);
  };

  return (
    <div className="flex h-full border-t bg-gray-50">
      <PackingSlipsSidebar onFiltersChange={setFilters} />
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
      />

      {formType === "giao-hang" && (
        <PackingSlipForm
          packingSlip={editingPackingSlip || undefined}
          onClose={handleCloseForm}
          onSubmit={handleGiaoHangSubmit}
        />
      )}

      {formType === "dong-hang" && (
        <PackingHangForm
          packingHang={editingPackingHang || undefined}
          onClose={handleCloseForm}
          onSubmit={handleDongHangSubmit}
        />
      )}

      {formType === "loading" && (
        <PackingLoadingForm
          packingLoading={editingPackingLoading || undefined}
          onClose={handleCloseForm}
          onSubmit={handleLoadingSubmit}
        />
      )}
    </div>
  );
}
