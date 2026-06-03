export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
}

export function formatNumberInput(value: string): string {
  const number = value.replace(/\D/g, "");
  if (number === "") return "";
  return new Intl.NumberFormat("en-US").format(Number(number));
}

export function parseNumberInput(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

/**
 * Đổi preset thời gian (today, this_week, ...) → khoảng ngày [from, to].
 * Dùng chung cho các mobile filter sheet (hóa đơn, hóa đơn VAT, đơn hàng).
 * Backend lọc qua fromCreatedDate/toCreatedDate; KHÔNG nhận "_preset"
 * (ValidationPipe forbidNonWhitelisted → 400), nên phải tính ngày sẵn ở client.
 */
export function getDateRangeFromPreset(preset: string): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today.getTime() - 86400000);
      return { from: y, to: new Date(y.getTime() + 86400000 - 1) };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: s, to: now };
    }
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    default:
      return { from: today, to: now };
  }
}
