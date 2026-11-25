"use client";

import type { SmaxSendError } from "@/lib/dashboard/smax/smaxDashboard.types";
import { LeadCard } from "@/components/reports/lead/leadUi";

const FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO → "dd/mm HH:mm" (giờ VN). */
function dayTime(iso: string): string {
  const p = Object.fromEntries(FMT.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

/** Lỗi gửi tin gần nhất — chỉ câu lỗi, không có nội dung tin nhắn. */
export function SmaxErrorsCard({ errors }: { errors: SmaxSendError[] }) {
  return (
    <LeadCard title="Lỗi gửi gần nhất" subtitle="Lượt gửi lỗi / gửi thiếu phần trong kỳ">
      {errors.length === 0 ? (
        <p className="text-[13px] py-6 text-center" style={{ color: "var(--dt-text-muted)" }}>
          Không có lỗi gửi trong kỳ này.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table aria-label="Lỗi gửi gần nhất" className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dt-border)" }}>
                {["Thời gian", "Nhân viên", "Kênh", "Lỗi"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-2 py-2 font-semibold text-[12px] whitespace-nowrap text-left"
                    style={{ color: "var(--dt-text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {errors.map((e, i) => (
                <tr key={`${e.at}-${i}`} className="dt-row" style={{ borderBottom: "1px solid var(--dt-border)" }}>
                  <td className="px-2 py-[9px] whitespace-nowrap dt-mono">{dayTime(e.at)}</td>
                  <td className="px-2 py-[9px] whitespace-nowrap font-medium">{e.userName}</td>
                  <td className="px-2 py-[9px] whitespace-nowrap">{e.channelName}</td>
                  <td className="px-2 py-[9px]" style={{ color: "#C0392B" }}>
                    {e.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LeadCard>
  );
}
