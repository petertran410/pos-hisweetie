import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL, apiClient, getAuthHeaders } from "../config/api";

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
    mutationFn: (data: any) => apiClient.post("/packing-hangs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-hangs"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "for-packing"] });
      queryClient.invalidateQueries({ queryKey: ["consignments-for-packing"] });
    },
  });
}

export function useUpdatePackingHang() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/packing-hangs/${id}`, data),
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
  files: File[],
  // Ảnh ký gửi lưu riêng sang folder ky-gui để không lẫn với báo đơn hóa đơn.
  subfolder: string = "dong-hang"
): Promise<{ urls: string[]; errors: { originalname: string; reason: string }[] }> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(
    `${API_URL}/upload/images?subfolder=${encodeURIComponent(subfolder)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return {
    urls: result.items.map((it: { url: string }) => it.url),
    errors: result.errors ?? [],
  };
}
