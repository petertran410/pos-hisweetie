import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quotesApi } from "@/lib/api/quotes";
import type { QuoteFilters, QuotePayload, QuoteStatus } from "@/lib/types/quote";

export function useQuotes(filters: QuoteFilters) {
  return useQuery({
    queryKey: ["quotes", filters],
    queryFn: () => quotesApi.getAll(filters),
  });
}

export function useQuote(id: number | null) {
  return useQuery({
    queryKey: ["quote", id],
    queryFn: () => quotesApi.getOne(id!),
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["quotes"] });
    qc.invalidateQueries({ queryKey: ["quote"] });
  };
}

export function useSaveQuote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: QuotePayload }) =>
      id ? quotesApi.update(id, payload) : quotesApi.create(payload),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Không lưu được báo giá"),
  });
}

export function useDuplicateQuote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => quotesApi.duplicate(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Không nhân bản được báo giá"),
  });
}

export function useDeleteQuote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => quotesApi.remove(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Không xoá được báo giá"),
  });
}

export function useSetQuoteStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: QuoteStatus }) =>
      quotesApi.setStatus(id, status),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Không đổi được trạng thái"),
  });
}
