import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL, getAuthHeaders } from "../config/api";

export function usePackingSlips(params?: any) {
  return useQuery({
    queryKey: ["packing-slips", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append("branchId", params.branchId);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.pageSize) queryParams.append("pageSize", params.pageSize);
      if (params?.currentItem)
        queryParams.append("currentItem", params.currentItem);

      const res = await fetch(
        `${API_URL}/packing-slips?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch packing slips");
      return res.json();
    },
  });
}

export function usePackingSlip(id: number) {
  return useQuery({
    queryKey: ["packing-slip", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch packing slip");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/packing-slips`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export function useUpdatePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export function useDeletePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export async function uploadPackingSlipImage(file: File): Promise<string> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append("file", file);

  // Upload dùng multipart/form-data — KHÔNG dùng getAuthHeaders()
  // vì Content-Type phải để browser tự set boundary
  const res = await fetch(`${API_URL}/upload/image?subfolder=bao-don`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return result.url;
}
