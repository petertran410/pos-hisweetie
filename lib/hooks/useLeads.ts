import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { ensureAccessToken } from "@/lib/auth/session";
import { leadsApi } from "@/lib/api/leads";
import type { LeadFilters, LeadInput } from "@/lib/types/lead";

export function useLeads(filters: LeadFilters) {
  return useQuery({ queryKey: ["leads", filters], queryFn: () => leadsApi.list(filters) });
}

/** Lựa chọn bộ lọc "Kênh": tên kênh đã dùng ở lead của các nguồn đang chọn (rỗng = mọi nguồn). */
export function useLeadChannelFilter(sources?: string) {
  return useQuery({
    queryKey: ["leadChannelFilter", sources ?? ""],
    queryFn: () => leadsApi.channelFilter(sources),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

/** Xuất Excel danh sách lead theo bộ lọc đang xem (như xuất hoá đơn). */
export function useExportLeads() {
  const [isExporting, setIsExporting] = useState(false);
  const exportLeads = async (filters: LeadFilters) => {
    setIsExporting(true);
    try {
      await ensureAccessToken(); // token chỉ ở bộ nhớ, có thể vừa hết hạn
      const url = new URL(`${API_URL}/leads/export`);
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.append(k, String(v));
      });
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      });
      if (!res.ok) throw new Error((await res.text()) || "Lỗi khi xuất dữ liệu");
      const blob = await res.blob();
      const match = (res.headers.get("Content-Disposition") ?? "").match(/filename=([^;]+)/);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = match ? match[1].trim() : `Lead_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success("Xuất file thành công");
    } catch (e) {
      toast.error((e as Error).message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };
  return { exportLeads, isExporting };
}

export function useLead(id: number | null) {
  return useQuery({ queryKey: ["lead", id], queryFn: () => leadsApi.get(id!), enabled: !!id });
}

/** Hành trình theo lead (tab "Hành trình", thanh mốc ở chi tiết lead). */
export function useLeadJourney(id: number | null) {
  return useQuery({ queryKey: ["leadJourney", id], queryFn: () => leadsApi.journey(id!), enabled: !!id });
}

/** Hành trình theo khách (trang khách hàng): lead nguồn + mã KH + đơn / hóa đơn. */
export function useCustomerJourney(customerId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["customerJourney", customerId],
    queryFn: () => leadsApi.customerJourney(customerId!),
    enabled: !!customerId && enabled,
  });
}

/** Tạo / sửa lead; báo trùng SĐT (khách / lead khác) nhưng vẫn lưu. */
export function useSaveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: LeadInput }) =>
      id ? leadsApi.update(id, body) : leadsApi.create(body),
    onSuccess: ({ lead, duplicates }, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
      toast.success(id ? "Đã lưu lead" : `Đã tạo lead "${lead.name}"`);
      const dup = duplicates.customers.length + duplicates.leads.length;
      if (dup) toast.warning(`SĐT trùng ${duplicates.customers.length} khách, ${duplicates.leads.length} lead khác`);
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được lead"),
  });
}
