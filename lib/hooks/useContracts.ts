import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import type {
  ContractFilters,
  CreateFromTemplatePayload,
  CreateContractSignerPayload,
  UpdateContractSignerPayload,
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

export function useContractSigners(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["contract-signers"],
    queryFn: () => contractsApi.listSigners(false),
    enabled: enabled && hasHydrated && isAuthenticated,
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
      toast.success("Đã gửi hợp đồng cho khách ký điện tử");
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
      qc.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Đã gửi lại hợp đồng cho khách');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gửi lại thất bại');
    },
  });
}

export function useSyncContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contractsApi.sync(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      if (data?.status === "PARTIALLY_SIGNED") {
        toast.success("Khách đã ký — trạng thái: Chờ NV ký (BÊN A)");
      } else if (data?.status === "SIGNED") {
        toast.success("Hợp đồng đã ký hoàn tất");
      } else {
        toast.success("Đã đồng bộ từ Documenso");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Đồng bộ thất bại");
    },
  });
}

export function useCreateSigner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContractSignerPayload) =>
      contractsApi.createSigner(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-signers"] });
      toast.success("Đã thêm người ký");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Thêm người ký thất bại");
    },
  });
}

export function useUpdateSigner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: number;
      data: UpdateContractSignerPayload;
    }) => contractsApi.updateSigner(params.id, params.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-signers"] });
      toast.success("Đã cập nhật người ký");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Cập nhật thất bại");
    },
  });
}

export function useDeleteSigner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contractsApi.deleteSigner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-signers"] });
      toast.success("Đã ẩn người ký");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Ẩn người ký thất bại");
    },
  });
}
