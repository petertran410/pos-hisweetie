import { apiClient } from "@/lib/config/api";

/**
 * Thông tin tỉ giá trả về từ BE. Mirror với `ExchangeRateInfo` ở backend.
 */
export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  fetchedAt: string; // ISO date
  isStale: boolean;
}

/**
 * API lấy tỉ giá ngoại tệ từ backend (cache 15p, fallback fxratesapi.com).
 *
 * Endpoint:
 *   GET  /api/exchange-rates/latest?base=CNY&symbols=VND → ExchangeRate
 *   POST /api/exchange-rates/refresh?base=CNY&symbols=VND → ExchangeRate (force refresh, bypass cache)
 *
 * Lưu ý: BE controller đã mount ở global prefix `/api`, nên path client
 * chỉ cần `/exchange-rates/...` (apiClient tự nối `API_URL`).
 */
export const exchangeRatesApi = {
  /**
   * Lấy tỉ giá mới nhất cho cặp (base, target). Trả về cache trong DB nếu
   * còn hạn (< 15p), ngược lại gọi API ngoài. Response kèm `isStale` để
   * UI có thể hiển thị badge "đang cập nhật".
   */
  getLatest: (base: string, target: string): Promise<ExchangeRate> =>
    apiClient.get("/exchange-rates/latest", { base, symbols: target }),

  /**
   * Ép refresh tỉ giá, bỏ qua cache. Dùng khi user ấn nút "Cập nhật tỉ giá"
   * trên form phiếu đặt hàng nhập.
   */
  refresh: (base: string, target: string): Promise<ExchangeRate> =>
    apiClient.post(
      `/exchange-rates/refresh?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`,
    ),
};
