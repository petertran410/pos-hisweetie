"use client";

import { useState } from "react";
import type { DkRegionInsight, DkRegionRow } from "@/lib/api/analytics-dinh-ki";
import { useDinhKiRegion } from "@/lib/hooks/useAnalyticsDinhKi";
import {
  DkAnchorNav,
  DkBar,
  DkDelta,
  DkLoading,
  DkSection,
  DkTable,
  DkTd,
  DkUpdated,
  monthLabel,
} from "./DkUi";
import { DK, fmtMonth, fmtNum, fmtPct, fmtTr, fmtTy } from "./dkFormat";

const TYPE_COLORS = { le: DK.bar, buon: DK.lermao, chuoi: DK.chuoi };

/** Định Kì › Vùng (html_region): khách hàng & sản phẩm theo vùng, tháng của ngày mốc. */
export function RegionDashboard() {
  const [date, setDate] = useState<string | undefined>();
  const { data, error, isLoading, isFetching } = useDinhKiRegion(date);

  const header = (
    <div className="dt-panel px-4 py-3 flex flex-wrap items-center gap-3">
      <h2 className="text-[16px] font-bold flex-1 min-w-[240px]">
        Phân tích khách hàng &amp; sản phẩm theo vùng
      </h2>
      <DkAnchorNav
        unit="month"
        value={date}
        resolved={data?.anchor}
        today={data?.today}
        onChange={setDate}
        loading={isFetching}
        label={data ? monthLabel(data.ranges.cur.from) : "…"}
      />
    </div>
  );
  if (error || isLoading || !data)
    return (
      <>
        {header}
        <DkLoading error={error} />
      </>
    );

  const rows = data.regions;
  const maxRev = Math.max(0, ...rows.map((r) => r.revenue));
  const month = fmtMonth(data.ranges.cur.from);

  return (
    <>
      {header}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <Insight
          tag="★ DẪN ĐẦU TỶ TRỌNG"
          title="Vùng có doanh thu tháng cao nhất"
          color={DK.bar}
          bg={DK.boduoBg}
          item={data.insights.topShare}
          detail={(i) => (
            <>
              {fmtTy(i.revenue, 2)} · <b>{fmtPct(i.share)}</b> tổng doanh thu
            </>
          )}
        />
        <Insight
          tag="▲ TĂNG TRƯỞNG NỔI BẬT"
          title="Vùng tăng MoM cao nhất"
          color={DK.good}
          bg={DK.goodBg}
          item={data.insights.bestGrowth}
          detail={(i) => (
            <>
              MoM <b style={{ color: DK.good }}>+{fmtPct(i.mom)}</b> ·{" "}
              {fmtTy(i.revenue, 2)}
            </>
          )}
        />
        <Insight
          tag="⚠ CẦN LƯU Ý"
          title="Vùng giảm/tăng yếu nhất"
          color={DK.bad}
          bg={DK.badBg}
          item={data.insights.worstGrowth}
          detail={(i) => (
            <>
              MoM{" "}
              <b style={{ color: DK.bad }}>
                {(i.mom ?? 0) > 0 ? "+" : ""}
                {fmtPct(i.mom)}
              </b>{" "}
              · {fmtTy(i.revenue, 2)}
            </>
          )}
        />
      </div>

      <div className="grid gap-3 grid-cols-1 2xl:grid-cols-[1.15fr_1fr] items-start">
        <DkSection badge={`● TỔNG QUAN VÙNG (tháng ${month})`}>
          <DkTable
            empty={!rows.length}
            head={[
              { label: "Vùng", width: "14%" },
              { label: "Doanh thu tháng" },
              { label: "Tỷ trọng", align: "right" },
              { label: "MoM", align: "right" },
              { label: "KH active", align: "right" },
              { label: "KH mới", align: "right" },
              { label: "Đơn", align: "right" },
              { label: "AOV", align: "right" },
            ]}>
            {rows.map((r) => {
              const alert = r.mom !== null && r.mom < 0;
              return (
                <tr
                  key={r.region}
                  style={alert ? { background: "#FCF6F6" } : undefined}>
                  <DkTd className="font-semibold whitespace-nowrap">
                    {alert ? "⚠ " : ""}
                    {r.region}
                  </DkTd>
                  <DkTd>
                    <DkBar
                      ratio={maxRev ? r.revenue / maxRev : 0}
                      label={fmtTy(r.revenue, 2)}
                    />
                  </DkTd>
                  <DkTd align="right" mono>
                    {fmtPct(r.share)}
                  </DkTd>
                  <DkTd align="right">
                    <DkDelta value={r.mom} />
                  </DkTd>
                  <DkTd align="right" mono>
                    {fmtNum(r.activeCustomers)}
                  </DkTd>
                  <DkTd align="right" mono>
                    {fmtNum(r.newCustomers)}
                  </DkTd>
                  <DkTd align="right" mono>
                    {fmtNum(r.orders)}
                  </DkTd>
                  <DkTd align="right" mono>
                    {fmtTr(r.aov)}
                  </DkTd>
                </tr>
              );
            })}
          </DkTable>
        </DkSection>

        <DkSection badge="● CƠ CẤU KHÁCH HÀNG THEO VÙNG (Lẻ / Buôn / Chuỗi)">
          <div
            className="flex flex-wrap gap-3 text-[12px]"
            style={{ color: "var(--dt-text-secondary)" }}>
            {(
              [
                ["le", "Khách lẻ"],
                ["buon", "Khách buôn"],
                ["chuoi", "Khách chuỗi"],
              ] as const
            ).map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: TYPE_COLORS[k] }}
                />
                {label}
              </span>
            ))}
          </div>
          <DkTable
            empty={!rows.length}
            head={[
              { label: "Vùng", width: "16%" },
              { label: "Cơ cấu" },
              { label: "Lẻ", align: "right" },
              { label: "Buôn", align: "right" },
              { label: "Chuỗi", align: "right" },
            ]}>
            {rows.map((r) => (
              <tr key={r.region}>
                <DkTd className="font-semibold whitespace-nowrap">
                  {r.region}
                </DkTd>
                <DkTd>
                  <Structure row={r} />
                </DkTd>
                <DkTd align="right" mono>
                  {fmtTy(r.customerTypes.le, 2)}
                </DkTd>
                <DkTd align="right" mono>
                  {fmtTy(r.customerTypes.buon, 2)}
                </DkTd>
                <DkTd align="right" mono>
                  {fmtTy(r.customerTypes.chuoi, 2)}
                </DkTd>
              </tr>
            ))}
          </DkTable>
        </DkSection>
      </div>

      <DkSection
        badge="★ SẢN PHẨM BÁN CHẠY THEO VÙNG (Top 10 mỗi nhóm: Thương hiệu / Thương mại)"
        color="#fff"
        bg={DK.lermao}>
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.region}
              className="border rounded-xl p-3 space-y-2 min-w-0"
              style={{ borderColor: "var(--dt-border)" }}>
              <div className="flex items-center justify-between">
                <span
                  className="text-[13px] font-bold"
                  style={{ color: DK.bar }}>
                  {r.region}
                </span>
                <span
                  className="text-[11.5px] dt-mono"
                  style={{ color: "var(--dt-text-muted)" }}>
                  {fmtTy(r.revenue, 2)}
                </span>
              </div>
              <ProductList
                title="★ HÀNG THƯƠNG HIỆU"
                rows={r.brandProducts}
                color={DK.bar}
                bg={DK.boduoBg}
              />
              <ProductList
                title="★ HÀNG THƯƠNG MẠI"
                rows={r.tradeProducts}
                color={DK.lermao}
                bg={DK.lermaoBg}
              />
            </div>
          ))}
        </div>
      </DkSection>
      <DkUpdated at={data.updatedAt} />
    </>
  );
}

function Insight({
  tag,
  title,
  color,
  bg,
  item,
  detail,
}: {
  tag: string;
  title: string;
  color: string;
  bg: string;
  item: DkRegionInsight | null;
  detail: (i: DkRegionInsight) => React.ReactNode;
}) {
  return (
    <div className="dt-panel p-4" style={{ borderColor: color }}>
      <span
        className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-1.5"
        style={{ background: bg, color }}>
        {tag}
      </span>
      <div
        className="text-[12px]"
        style={{ color: "var(--dt-text-secondary)" }}>
        {title}
      </div>
      <div className="text-[22px] font-bold leading-tight" style={{ color }}>
        {item?.region ?? "—"}
      </div>
      {item && (
        <div
          className="text-[12px]"
          style={{ color: "var(--dt-text-secondary)" }}>
          {detail(item)}
        </div>
      )}
    </div>
  );
}

/** Thanh 100% chia Lẻ / Buôn / Chuỗi (nhãn % khi phần ≥ 8%). */
function Structure({ row }: { row: DkRegionRow }) {
  const t = row.customerTypes;
  const total = t.le + t.buon + t.chuoi;
  if (!total) return <span style={{ color: "var(--dt-text-muted)" }}>—</span>;
  const parts = (["le", "buon", "chuoi"] as const).map((k) => ({
    k,
    w: (t[k] / total) * 100,
  }));
  return (
    <div className="flex h-4 rounded overflow-hidden gap-[2px] min-w-[140px]">
      {parts
        .filter((p) => p.w > 0)
        .map((p) => (
          <div
            key={p.k}
            className="h-full grid place-items-center text-[10.5px] font-semibold text-white"
            style={{ width: `${p.w}%`, background: TYPE_COLORS[p.k] }}
            title={`${fmtPct(p.w / 100, 1)}`}>
            {p.w >= 8 ? fmtPct(p.w / 100, 0) : ""}
          </div>
        ))}
    </div>
  );
}

function ProductList({
  title,
  rows,
  color,
  bg,
}: {
  title: string;
  rows: { name: string; revenue: number }[];
  color: string;
  bg: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.revenue));
  return (
    <div className="space-y-1">
      <span
        className="inline-block text-[10.5px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: bg, color }}>
        {title}
      </span>
      {rows.length === 0 ? (
        <div className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
          Không có dữ liệu
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((p) => (
            <li
              key={p.name}
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2 items-center text-[12px]">
              <span className="truncate" title={p.name}>
                {p.name}
              </span>
              <DkBar
                ratio={max ? p.revenue / max : 0}
                color={color}
                label={fmtTr(p.revenue)}
                labelWidth={60}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
