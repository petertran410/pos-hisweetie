import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi } from "@/lib/api/roles";
import { toast } from "sonner";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.getAll,
  });
}

export function useRole(id: number) {
  return useQuery({
    queryKey: ["roles", id],
    queryFn: () => rolesApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Tạo vai trò thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo vai trò thất bại");
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Cập nhật vai trò thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật vai trò thất bại");
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Xóa vai trò thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa vai trò thất bại");
    },
  });
}

export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      permissionIds,
    }: {
      id: number;
      permissionIds: number[];
    }) => rolesApi.assignPermissions(id, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Cập nhật quyền thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật quyền thất bại");
    },
  });
}
