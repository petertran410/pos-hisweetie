import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi, supplierGroupsApi } from "@/lib/api/suppliers";
import { Supplier, SupplierFilters } from "@/lib/types/supplier";
import { toast } from "sonner";

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: ["suppliers", filters],
    queryFn: () => suppliersApi.getSuppliers(filters),
  });
}

export function useSupplier(id?: number) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => suppliersApi.getSupplier(id!),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      return await suppliersApi.createSupplier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Tạo nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Supplier>;
    }) => {
      return await suppliersApi.updateSupplier(id, data);
    },
    onSuccess: (updatedSupplier, variables) => {
      queryClient.setQueryData(["suppliers", variables.id], updatedSupplier);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Cập nhật nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await suppliersApi.deleteSupplier(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Xóa nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useSupplierGroups() {
  return useQuery({
    queryKey: ["supplier-groups"],
    queryFn: () => supplierGroupsApi.getSupplierGroups(),
  });
}

export function useCreateSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await supplierGroupsApi.createSupplierGroup(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Tạo nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; description?: string };
    }) => {
      return await supplierGroupsApi.updateSupplierGroup(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Cập nhật nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await supplierGroupsApi.deleteSupplierGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Xóa nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}
