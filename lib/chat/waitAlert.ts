/** "Chờ 45 phút" / "Chờ 2 giờ 5 phút" — phút giờ làm khách đã chờ (backend tính, xem wait-alerts.ts). */
export function waitLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `Chờ ${h ? `${h} giờ${m ? ` ${m} phút` : ""}` : `${m} phút`}`;
}
