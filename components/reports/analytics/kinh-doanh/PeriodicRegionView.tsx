"use client";

import type { PeriodicRegion } from "@/lib/api/analytics-kinh-doanh";
import { C, fmtDate, growthColor, int, pct, tr, ty } from "./kdFormat";
import { BarCell, Block, MiniTable, Pill } from "./KdUi";

/** "Phân tích khách hàng & sản phẩm theo vùng" — dựng lại measure html_region. */
export function PeriodicRegionView({ data }: { data: PeriodicRegion }) {
  const regions = data.regions;
  const withLast = regions.filter((r) => r.previous > 0);
  const best = [...withLast].sort(
    (a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity),
  )[0];
  const worst = [...withLast].sort(
    (a, b) => (a.growth ?? Infinity) - (b.growth ?? Infinity),
  )[0];
  const top = regions[0];
  const maxRev = Math.max(1, ...regions.map((r) => r.current));
  const monthLabel = fmtDate(data.month.from).slice(3);

  const insight = (
    tag: string,
    tagBg: string,
    color: string,
    caption: string,
    name: string | undefined,
    detail: React.ReactNode,
  ) => (
    <div
      className="rounded-xl border bg-white p-3"
      style={{ borderColor: color }}>
      <Pill color={color} bg={tagBg}>
        {tag}
      </Pill>
      <div className="text-[12px] mt-1.5" style={{ color: C.muted }}>
        {caption}
      </div>
      <div className="text-[22px] font-semibold" style={{ color }}>
        {name ?? "—"}
      </div>
      <div className="text-[12px]" style={{ color: C.muted }}>
        {detail}
      </div>
    </div>
  );

  const topTable = (
    rows: { name: string; amount: number }[],
    color: string,
  ) => {
    const max = Math.max(1, ...rows.map((r) => r.amount));
    return (
      <table className="w-full text-[12px]">
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className="border-t"
              style={{ borderColor: C.line }}>
              <td className="py-0.5 pr-2">
                <span className="line-clamp-1" title={r.name}>
                  {r.name}
                </span>
              </td>
              <td className="py-0.5 w-[45%]">
                <BarCell
                  width={(r.amount / max) * 100}
                  text={tr(r.amount)}
                  color={color}
                  minText={60}
                />
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="py-2 text-center" style={{ color: C.muted }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5"
        style={{ borderColor: C.line }}>
        <div className="text-[17px] font-semibold">
          Phân tích khách hàng &amp; sản phẩm theo vùng
        </div>
        <div className="text-[12px]" style={{ color: C.muted }}>
          Tháng {monthLabel} (tới {fmtDate(data.month.to)}) · so với tháng trước
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {insight(
          "★ DẪN ĐẦU TỶ TRỌNG",
          "#E5E8F5",
          C.primary,
          "Vùng có doanh thu tháng cao nhất",
          top?.region,
          top && (
            <>
              {ty(top.current)} · <b>{pct(top.share)}</b> tổng doanh thu
            </>
          ),
        )}
        {insight(
          "▲ TĂNG TRƯỞNG NỔI BẬT",
          "#E8F6EE",
          C.ok,
          "Vùng tăng MoM cao nhất",
          best?.region,
          best && (
            <>
              MoM{" "}
              <b style={{ color: C.ok }}>
                {(best.growth ?? 0) >= 0 ? "+" : ""}
                {pct(best.growth)}
              </b>{" "}
              · {ty(best.current)}
            </>
          ),
        )}
        {insight(
          "⚠ CẦN LƯU Ý",
          "#FCEAEA",
          C.warn,
          "Vùng giảm/tăng yếu nhất",
          worst?.region,
          worst && (
            <>
              MoM{" "}
              <b style={{ color: C.warn }}>
                {(worst.growth ?? 0) >= 0 ? "+" : ""}
                {pct(worst.growth)}
              </b>{" "}
              · {ty(worst.current)}
            </>
          ),
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
        <Block title={`● Tổng quan vùng (tháng ${monthLabel})`}>
          <MiniTable
            head={[
              { label: "Vùng", width: "14%" },
              { label: "Doanh thu tháng" },
              { label: "Tỷ trọng", align: "right" },
              { label: "MoM", align: "right" },
              { label: "KH active", align: "right" },
              { label: "KH mới", align: "right" },
              { label: "Đơn", align: "right" },
              { label: "AOV", align: "right" },
            ]}
            rows={regions.map((r) => [
              <b key="r">
                {(r.growth ?? 0) < 0 ? "⚠ " : ""}
                {r.region}
              </b>,
              <BarCell
                key="b"
                width={(r.current / maxRev) * 100}
                text={ty(r.current)}
              />,
              pct(r.share),
              <span key="g" style={{ color: growthColor(r.growth) }}>
                {(r.growth ?? 0) >= 0 ? "▲" : "▼"} {pct(r.growth)}
              </span>,
              int(r.activeCustomers),
              int(r.newCustomers),
              int(r.orders),
              r.aov === null ? "—" : tr(r.aov),
            ])}
          />
        </Block>
        <Block title="● Cơ cấu nhóm khách theo vùng (tháng này)">
          <div className="space-y-2.5">
            {regions.map((r) => {
              const t = r.customerTypes;
              const tot = t.le + t.buon + t.chuoi || 1;
              const seg = (v: number, color: string, label: string) => {
                const w = (v / tot) * 100;
                return (
                  <div
                    title={`${label}: ${ty(v)}`}
                    className="h-full grid place-items-center text-[11px] text-white font-semibold"
                    style={{ width: `${w}%`, background: color }}>
                    {w >= 8 ? `${Math.round(w)}%` : ""}
                  </div>
                );
              };
              return (
                <div key={r.region}>
                  <div className="text-[12px] font-semibold mb-1">
                    {r.region}
                  </div>
                  <div className="flex h-5 rounded overflow-hidden bg-[#F1EFE8]">
                    {seg(t.le, C.primary, "Khách lẻ")}
                    {seg(t.buon, C.accent, "Khách buôn")}
                    {seg(t.chuoi, C.ok, "Khách chuỗi")}
                  </div>
                </div>
              );
            })}
            <div
              className="flex gap-3 text-[11.5px] pt-1"
              style={{ color: C.muted }}>
              <span>
                <i
                  className="inline-block w-2.5 h-2.5 mr-1 rounded-sm"
                  style={{ background: C.primary }}
                />
                Lẻ
              </span>
              <span>
                <i
                  className="inline-block w-2.5 h-2.5 mr-1 rounded-sm"
                  style={{ background: C.accent }}
                />
                Buôn
              </span>
              <span>
                <i
                  className="inline-block w-2.5 h-2.5 mr-1 rounded-sm"
                  style={{ background: C.ok }}
                />
                Chuỗi
              </span>
            </div>
          </div>
        </Block>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {regions.map((r) => (
          <Block
            key={r.region}
            title={r.region}
            right={
              <span className="text-[12px]" style={{ color: C.muted }}>
                {ty(r.current)}
              </span>
            }>
            <div
              className="text-[11.5px] font-semibold mb-0.5"
              style={{ color: C.primary }}>
              Hàng thương hiệu — Top 10
            </div>
            {topTable(r.topBrand, C.primary)}
            <div
              className="text-[11.5px] font-semibold mt-2 mb-0.5"
              style={{ color: C.accent }}>
              Hàng thương mại — Top 10
            </div>
            {topTable(r.topTrade, C.accent)}
          </Block>
        ))}
      </div>
    </div>
  );
}
