import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL, getAuthHeaders } from "../config/api";

export function usePackingHangs(params?: any) {
  return useQuery({
    queryKey: ["packing-hangs", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append("branchId", params.branchId);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.pageSize) queryParams.append("pageSize", params.pageSize);
      if (params?.currentItem)
        queryParams.append("currentItem", params.currentItem);

      const res = await fetch(
        `${API_URL}/packing-hangs?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch packing hangs");
      return res.json();
    },
  });
}

export function usePackingHang(id: number) {
  return useQuery({
    queryKey: ["packing-hang", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/packing-hangs/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch packing hang");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePackingHang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/packing-hangs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create packing hang");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-hangs"] });
    },
  });
}

export function useUpdatePackingHang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`${API_URL}/packing-hangs/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update packing hang");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-hangs"] });
    },
  });
}

export function useDeletePackingHang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/packing-hangs/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        let msg = "Xóa phiếu đóng hàng thất bại";
        try {
          const j = await res.json();
          const m = j?.message;
          if (typeof m === "string") msg = m;
          else if (Array.isArray(m)) msg = m.join(", ");
          else if (typeof m?.message === "string") msg = m.message;
        } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-hangs"] });
    },
  });
}

export async function uploadPackingHangImage(file: File): Promise<string> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/upload/image?subfolder=dong-hang`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return result.url;
}

export async function uploadPackingHangImages(
  files: File[]
): Promise<{ urls: string[]; errors: { originalname: string; reason: string }[] }> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_URL}/upload/images?subfolder=dong-hang`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return {
    urls: result.items.map((it: { url: string }) => it.url),
    errors: result.errors ?? [],
  };
}
