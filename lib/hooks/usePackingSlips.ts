import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL } from "../config/api";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";

export function usePackingSlips(params?: any) {
  const token = useAuthStore((state) => state.token);

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
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch packing slips");
      return res.json();
    },
  });
}

export function usePackingSlip(id: number) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["packing-slip", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch packing slip");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePackingSlip() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: async (data: any) => {
      if (isSandbox) {
        return useSandboxDataStore.getState().addEntity("packings", {
          ...data,
          type: "packing-slip",
          typeLabel: "Giao hàng",
        });
      }
      const res = await fetch(`${API_URL}/packing-slips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
      queryClient.invalidateQueries({ queryKey: ["all-packing"] });
    },
  });
}

export function useUpdatePackingSlip() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("packings", id, data);
        return data;
      }
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
      queryClient.invalidateQueries({ queryKey: ["all-packing"] });
    },
  });
}

export function useDeletePackingSlip() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: async (id: number) => {
      if (isSandbox) {
        useSandboxDataStore.getState().removeEntity("packings", id);
        return {};
      }
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
      queryClient.invalidateQueries({ queryKey: ["all-packing"] });
    },
  });
}

export async function uploadPackingSlipImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_URL}/upload/image?subfolder=bao-don`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const result = await res.json();
  return result.url;
}
