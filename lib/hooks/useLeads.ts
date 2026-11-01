import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/leads";
import type { LeadFilters, LeadInput } from "@/lib/types/lead";

export function useLeads(filters: LeadFilters) {
  return useQuery({ queryKey: ["leads", filters], queryFn: () => leadsApi.list(filters) });
}

export function useLead(id: number | null) {
  return useQuery({ queryKey: ["lead", id], queryFn: () => leadsApi.get(id!), enabled: !!id });
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
