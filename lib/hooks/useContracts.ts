import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import type {
  ContractFilters,
  CreateFromTemplatePayload,
} from "@/lib/types/contract";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";

export function useContracts(filters?: ContractFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["contracts", filters],
    queryFn: () => contractsApi.getAll(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useContractTemplates(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => contractsApi.listTemplates(),
    enabled: enabled && hasHydrated && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContractTemplateFields(templateId: number | "") {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["contract-template-fields", templateId],
    queryFn: () => contractsApi.getTemplateFields(Number(templateId)),
    enabled:
      !!templateId && hasHydrated && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContractFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFromTemplatePayload) =>
      contractsApi.createFromTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Đã tạo và gửi hợp đồng cho khách hàng");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Tạo hợp đồng thất bại");
    },
  });
}

export function useUploadContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      customerId: number;
      title?: string;
      recipientEmail?: string;
      file: File;
    }) => contractsApi.upload(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Đã tải lên và gửi hợp đồng");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Tải hợp đồng thất bại");
    },
  });
}

export function useResendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contractsApi.resend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Đã gửi lại hợp đồng");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Gửi lại thất bại");
    },
  });
}
