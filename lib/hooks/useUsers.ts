import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import { toast } from "sonner";

export function useUsers(params?: any) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getUsers(),
  });
}

export function useAllUsers(params?: any) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getAll(params),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Tạo người dùng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo người dùng thất bại");
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Cập nhật người dùng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật người dùng thất bại");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Xóa người dùng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa người dùng thất bại");
    },
  });
}
