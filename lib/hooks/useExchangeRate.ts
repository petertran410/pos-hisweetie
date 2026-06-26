import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exchangeRatesApi } from "@/lib/api/exchange-rates";
import type { ExchangeRate } from "@/lib/api/exchange-rates";
import { toast } from "sonner";

/**
 * Lấy tỉ giá mới nhất cho cặp (base, target). Cache TanStack trong 1 phút —
 * server-side cache 15p nên client chỉ cần tránh spam component re-render.
 */
export function useExchangeRate(base: string = "CNY", target: string = "VND") {
  return useQuery<ExchangeRate>({
    queryKey: ["exchange-rate", base, target],
    queryFn: () => exchangeRatesApi.getLatest(base, target),
    staleTime: 60 * 1000, // 1 phút
    // Cho phép query chạy khi base khác target (mặc định enabled=true)
    enabled: base !== target,
    // Im lặng lỗi khi không có mạng — UI sẽ fallback hiển thị "—"
    retry: 1,
  });
}

/**
 * Mutation ép refresh tỉ giá (bypass cache). Trả về ExchangeRate mới nhất.
 * Trên success: invalidate query `exchange-rate` để mọi useExchangeRate
 * trong app đồng bộ lại.
 */
export function useRefreshExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      base,
      target,
    }: { base?: string; target?: string } = {}) =>
      exchangeRatesApi.refresh(base || "CNY", target || "VND"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["exchange-rate", data.base, data.target],
      });
      toast.success(
        `Đã cập nhật tỉ giá: 1 ${data.base} = ${data.rate.toLocaleString()} ${data.target}`,
      );
    },
    onError: (err: Error) => {
      toast.error(`Không thể cập nhật tỉ giá: ${err.message}`);
    },
  });
}
