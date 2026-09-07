/**
 * Định dạng số — Module Dự kiến chuyển kho (Hà Nội → Sài Gòn)
 *
 * Công thức tính do backend `/transfers/planning-summary` thực hiện
 * (`TransfersService.getPlanningSummary`). Ghi lại ở đây để đối chiếu khi đọc
 * các cột trong bảng:
 *
 * 1. BQ5/ngày = Bán 5 ngày / 5
 * 2. BQ30/ngày = Bán 30 ngày / 30
 * 3. BQ90/ngày = Bán 90 ngày / 90
 * 4. Demand/ngày = 60% × BQ5/ngày + 30% × BQ30/ngày + 10% × BQ90/ngày
 * 5. Tồn an toàn = Demand/ngày × 2 (2 ngày an toàn)
 * 6. Điểm điều chuyển = Tồn an toàn + Demand/ngày × Leadtime
 *    - Hàng thường: Leadtime = 5 ngày
 *    - Hàng lạnh:   Leadtime = 3 ngày (giảm 2 ngày)
 * 7. Tồn khả dụng SG = Tồn SG + Đang chuyển nội bộ - Đơn tạm - Đơn xác nhận
 * 8. Tồn mục tiêu = Tồn an toàn + Demand/ngày × Chu kỳ
 *    - Hàng thường: Chu kỳ = 7 ngày
 *    - Hàng lạnh:   Chu kỳ = 5 ngày (giảm 2 ngày)
 * 9. SL đề xuất = MAX(0, Tồn mục tiêu - Tồn khả dụng SG), làm tròn theo thùng
 *
 * "Đang chuyển" chỉ gồm phiếu chuyển kho HN → SG ở trạng thái Đang chuyển
 * (status = 2). Phiếu Đã nhận thiếu hàng không tính — phần thiếu đã được hoàn
 * về tồn kho Hà Nội.
 *
 * Cảnh báo:
 * - CHUYỂN GẤP (màu đỏ đậm): Đơn tạm + Đơn xác nhận > Tồn khả dụng SG
 * - Cần điều chuyển (màu đỏ): Tồn khả dụng SG ≤ Điểm điều chuyển
 * - Cần xem xét (màu vàng): Tồn khả dụng SG ≤ Tồn mục tiêu
 * - Đủ hàng (màu xanh): Tồn khả dụng SG > Tồn mục tiêu
 */

export function formatNumber(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWholeQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}
