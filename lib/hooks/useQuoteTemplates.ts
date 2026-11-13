import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quoteTemplatesApi } from "@/lib/api/quote-templates";
import type { QuoteTemplatePayload } from "@/lib/types/quote";

const KEY = ["quote-templates"];

export function useQuoteTemplates() {
  return useQuery({ queryKey: KEY, queryFn: () => quoteTemplatesApi.getAll() });
}

function useMut<V, R>(fn: (v: V) => Promise<R>, failMsg: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error(e.message || failMsg),
  });
}

export const useSaveQuoteTemplate = () =>
  useMut(
    ({ id, payload }: { id?: number; payload: QuoteTemplatePayload }) =>
      id ? quoteTemplatesApi.update(id, payload) : quoteTemplatesApi.create(payload),
    "Không lưu được mẫu báo giá"
  );

export const useSetDefaultQuoteTemplate = () =>
  useMut((id: number) => quoteTemplatesApi.setDefault(id), "Không đặt được mẫu mặc định");

export const useSetQuoteTemplateActive = () =>
  useMut(
    ({ id, isActive }: { id: number; isActive: boolean }) => quoteTemplatesApi.setActive(id, isActive),
    "Không đổi được trạng thái mẫu"
  );
