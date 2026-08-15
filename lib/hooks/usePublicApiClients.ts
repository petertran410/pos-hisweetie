import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { publicApiClientsApi } from "@/lib/api/publicApiClients";

const KEY = ["publicApiClients"] as const;

export function usePublicApiClients() {
  return useQuery({ queryKey: KEY, queryFn: publicApiClientsApi.getAll });
}

function useRefreshOnSuccess<T>(
  mutationFn: (input: T) => Promise<unknown>,
  message: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(message);
    },
    onError: (error: any) => toast.error(error?.message || "Thao tác thất bại"),
  });
}

export function useCreatePublicApiClient() {
  return useRefreshOnSuccess(publicApiClientsApi.create, "Đã tạo OAuth client");
}

export function useUpdatePublicApiClient() {
  return useRefreshOnSuccess(
    ({ id, ...data }: { id: string; name?: string; description?: string; accessTokenTtl?: number }) =>
      publicApiClientsApi.update(id, data),
    "Đã cập nhật OAuth client"
  );
}

export function useRotatePublicApiSecret() {
  return useRefreshOnSuccess(publicApiClientsApi.rotateSecret, "Đã cấp Client Secret mới");
}

export function useSetPublicApiClientActive() {
  return useRefreshOnSuccess(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? publicApiClientsApi.activate(id) : publicApiClientsApi.deactivate(id),
    "Đã cập nhật trạng thái OAuth client"
  );
}
