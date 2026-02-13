"use client";

import { useState } from "react";
import { PackingSlipsTable } from "@/components/packing-slips/PackingSlipsTable";
import { PackingSlipsSidebar } from "@/components/packing-slips/PackingSlipsSidebar";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import {
  usePackingSlips,
  useCreatePackingSlip,
  useUpdatePackingSlip,
  useDeletePackingSlip,
} from "@/lib/hooks/usePackingSlips";
import type { PackingSlip } from "@/lib/types/packing-slip";
import { toast } from "sonner";

export default function BaoDonPage() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showForm, setShowForm] = useState(false);
  const [editingPackingSlip, setEditingPackingSlip] =
    useState<PackingSlip | null>(null);

  const { data, isLoading } = usePackingSlips({
    ...filters,
    pageSize: limit,
    currentItem: (page - 1) * limit,
  });

  console.log(data);

  const createPackingSlip = useCreatePackingSlip();
  const updatePackingSlip = useUpdatePackingSlip();
  const deletePackingSlip = useDeletePackingSlip();

  const handleCreateClick = () => {
    setEditingPackingSlip(null);
    setShowForm(true);
  };

  const handleEditClick = (packingSlip: PackingSlip) => {
    setEditingPackingSlip(packingSlip);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingPackingSlip) {
        await updatePackingSlip.mutateAsync({
          id: editingPackingSlip.id,
          data: formData,
        });
        toast.success("Cập nhật báo đơn thành công");
      } else {
        await createPackingSlip.mutateAsync(formData);
        toast.success("Tạo báo đơn thành công");
      }
      setShowForm(false);
      setEditingPackingSlip(null);
    } catch (error) {
      toast.error(
        editingPackingSlip
          ? "Cập nhật báo đơn thất bại"
          : "Tạo báo đơn thất bại"
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
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDelete}
      />

      {showForm && (
        <PackingSlipForm
          packingSlip={editingPackingSlip || undefined}
          onClose={() => {
            setShowForm(false);
            setEditingPackingSlip(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
