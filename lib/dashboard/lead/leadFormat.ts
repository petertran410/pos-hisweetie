import { vi } from "@/lib/dashboard/format";

/** Giờ → { value, suffix }: < 1 giờ hiện phút, < 24 giờ hiện giờ, còn lại hiện ngày (1 chữ số thập phân). */
export function durationParts(hours: number): { value: string; suffix: string } {
  if (hours < 1) {
    return { value: vi(Math.round(hours * 60)), suffix: " phút" };
  }
  if (hours < 24) {
    return {
      value: hours.toLocaleString("vi-VN", { maximumFractionDigits: 1 }),
      suffix: " giờ",
    };
  }
  return {
    value: (hours / 24).toLocaleString("vi-VN", { maximumFractionDigits: 1 }),
    suffix: " ngày",
  };
}

/** Phút → "38 phút" / "3 giờ 30" / "1 ngày 2 giờ". */
export function minutesText(min: number): string {
  if (min < 60) return `${vi(min)} phút`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return m ? `${h} giờ ${m}` : `${h} giờ`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} ngày ${rh} giờ` : `${d} ngày`;
}

/** Giờ → "26 giờ" / "2 ngày 5 giờ" (cho thời gian lead chờ). */
export function hoursText(hours: number): string {
  const h = Math.round(hours);
  if (h < 48) return `${h} giờ`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} ngày ${rh} giờ` : `${d} ngày`;
}

export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
