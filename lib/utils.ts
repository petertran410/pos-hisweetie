export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatNumber(
  value: string | number | null | undefined,
  locale: "vi-VN" | "en-US" = "en-US"
): string {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(locale, { maximumFractionDigits: 2 });
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
}

export function formatNumberInput(
  value: string,
  maxFractionDigits = 0
): string {
  const normalized = value.replace(/,/g, "");
  const fractionLimit = Math.max(0, Math.floor(maxFractionDigits));

  if (fractionLimit === 0) {
    const digits = normalized.replace(/\D/g, "");
    if (digits === "") return "";
    return new Intl.NumberFormat("en-US").format(Number(digits));
  }

  const numeric = normalized.replace(/[^\d.]/g, "");
  const dotIndex = numeric.indexOf(".");
  const integerDigits = (
    dotIndex === -1 ? numeric : numeric.slice(0, dotIndex)
  ).replace(/\D/g, "");

  if (integerDigits === "" && dotIndex === -1) return "";

  const integerPart = new Intl.NumberFormat("en-US").format(
    Number(integerDigits || "0")
  );
  if (dotIndex === -1) return integerPart;

  const fractionPart = numeric
    .slice(dotIndex + 1)
    .replace(/\D/g, "")
    .slice(0, fractionLimit);
  return `${integerPart}.${fractionPart}`;
}

export function parseNumberInput(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

export function limitDecimals(value: string, max: number): string {
  const normalized = value.replace(",", ".");
  const dotIndex = normalized.indexOf(".");
  if (dotIndex === -1) return normalized;
  return normalized.slice(0, dotIndex + 1 + max);
}

/**
 * Đổi preset thời gian (today, this_week, ...) → khoảng ngày [from, to].
 * Dùng chung cho các mobile filter sheet (hóa đơn, hóa đơn VAT, đơn hàng).
 * Backend lọc qua fromCreatedDate/toCreatedDate; KHÔNG nhận "_preset"
 * (ValidationPipe forbidNonWhitelisted → 400), nên phải tính ngày sẵn ở client.
 */
export function getDateRangeFromPreset(preset: string): {
  from: Date;
  to: Date;
} {
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
