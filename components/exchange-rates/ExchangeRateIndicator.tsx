"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import {
  useExchangeRate,
  useRefreshExchangeRate,
} from "@/lib/hooks/useExchangeRate";

interface ExchangeRateIndicatorProps {
  /**
   * Tiền tệ gốc (mặc định CNY).
   */
  base?: string;
  /**
   * Tiền tệ đích (mặc định VND).
   */
  target?: string;
  /**
   * Nếu truyền rate từ ngoài (vd từ snapshot trên PDN), hiển thị rate này
   * thay vì gọi API. Khi snapshot có sẵn thì không cần loading indicator.
   */
  rate?: number | null;
  /**
   * Ngày fetch (snapshot từ PDN). Chỉ hiển thị khi truyền `rate`.
   */
  fetchedAt?: string | null;
  /**
   * Nếu true: cho phép user refresh tỉ giá (gọi BE bypass cache).
   * Mặc định false — chỉ hiển thị thông tin.
   */
  allowRefresh?: boolean;
  /**
   * Callback tuỳ biến khi user bấm refresh. Nếu truyền, sẽ override
   * mutation mặc định — cho phép caller (vd OrderSupplierForm) xử lý
   * thêm side effects (recompute factorySubTotal, toast riêng, v.v.).
   */
  onRefresh?: () => void;
  /**
   * Label tùy chỉnh. Mặc định: "Tỉ giá".
   */
  label?: string;
}

/**
 * Component hiển thị tỉ giá ngoại tệ với nút refresh.
 *
 * Hai mode:
 *   - **Snapshot mode** (truyền `rate`): hiển thị rate cố định từ PDN,
 *     không gọi API, không có nút refresh. Dùng khi đã có sẵn tỉ giá từ
 *     snapshot của phiếu.
 *   - **Live mode** (không truyền `rate`): tự gọi useExchangeRate + cho phép
 *     user refresh. Dùng khi đang tạo PDN mới, chưa có tỉ giá lưu.
 */
export function ExchangeRateIndicator({
  base = "CNY",
  target = "VND",
  rate: rateProp,
  fetchedAt: fetchedAtProp,
  allowRefresh = false,
  onRefresh,
  label,
}: ExchangeRateIndicatorProps) {
  // Snapshot mode
  const isSnapshot = rateProp != null;

  // Live mode (chỉ chạy khi không snapshot)
  const liveQuery = useExchangeRate(base, target);
  const refreshMutation = useRefreshExchangeRate();

  const rate = isSnapshot ? rateProp! : liveQuery.data?.rate;
  const fetchedAt = isSnapshot ? fetchedAtProp : liveQuery.data?.fetchedAt;
  const isStale = !isSnapshot && (liveQuery.data?.isStale ?? false);
  const isLoading = !isSnapshot && liveQuery.isLoading;

  const formattedRate = useMemo(() => {
    if (rate == null) return "—";
    return new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 4,
    }).format(rate);
  }, [rate]);

  const formattedFetchedAt = useMemo(() => {
    if (!fetchedAt) return null;
    const d = new Date(fetchedAt);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [fetchedAt]);

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded border border-gray-200 bg-white text-xs">
      <span className="font-medium text-gray-700">
        {label || "Tỉ giá"}:
      </span>
      <span className="font-semibold text-gray-900">
        1 {base} = {formattedRate} {target}
      </span>
      {isLoading && (
        <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
      )}
      {isStale && !isLoading && (
        <span className="text-amber-600 text-[10px]">(đang cập nhật)</span>
      )}
      {formattedFetchedAt && (
        <span className="text-gray-400 text-[10px]">
          ({formattedFetchedAt})
        </span>
      )}
      {allowRefresh && (
        <button
          type="button"
          onClick={() => {
            if (onRefresh) {
              onRefresh();
            } else {
              refreshMutation.mutate({ base, target });
            }
          }}
          disabled={refreshMutation.isPending}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
          title="Cập nhật tỉ giá">
          <RefreshCw
            className={`w-3 h-3 text-brand ${
              refreshMutation.isPending ? "animate-spin" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}