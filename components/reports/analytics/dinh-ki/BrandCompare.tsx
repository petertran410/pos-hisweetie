"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import type { DkBrandStats, DkTopProduct } from "@/lib/api/analytics-dinh-ki";
import {
  useDinhKiBrandCompare,
  useDinhKiFilterOptions,
} from "@/lib/hooks/useAnalyticsDinhKi";
import { DkBar, DkLoading, DkSection, DkTable, DkTd, DkUpdated } from "./DkUi";
import { DK, fmtDate, fmtNum, fmtPct, fmtTr, fmtTy, vnNow } from "./dkFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** Định Kì › Đối Thủ (html_brand_compare): Mứt Lermao vs Mứt Boduo theo Năm / Tháng. */
export function BrandCompare() {
  const [now] = useState(vnNow);
  const [year, setYear] = useState(now.y);
  const [months, setMonths] = useState<number[]>([now.m]);
  const { data: options } = useDinhKiFilterOptions();
  const { data, error, isLoading, isFetching } = useDinhKiBrandCompare({
    year,
    months,
  });

  const years = (options?.years ?? [year])
    .slice()
    .reverse()
    .map((y) => ({ key: String(y), label: `Năm ${y}` }));

  const header = (
    <div className="dt-panel px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[240px]">
        <h2 className="text-[16px] font-bold">
          So sánh Mứt Lermao vs Mứt Boduo
        </h2>
        {data?.period && (
          <div
            className="text-[12px]"
            style={{ color: "var(--dt-text-muted)" }}>
            {fmtDate(data.period.from)} – {fmtDate(data.period.to)}
          </div>
        )}
      </div>
      {isFetching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      <AnalyticsSelect
        options={years}
        value={String(year)}
        onChange={(k) => setYear(Number(k))}
        className="w-36"
      />
      <div className="w-44">
        <FilterMultiSelect
          options={MONTH_OPTIONS}
          values={months.map(String)}
          onChange={(v) => setMonths(v.map(Number).sort((a, b) => a - b))}
          placeholder="Cả năm"
          multiLabel={(n) => `${n} tháng`}
        />
      </div>
    </div>
  );

  if (error || isLoading || !data)
    return (
      <>
        {header}
        <DkLoading error={error} />
      </>
    );
  if (!data.brands)
    return (
      <>
        {header}
        <div
          className="dt-panel p-8 text-center text-[13px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Kỳ đã chọn chưa có ngày nào.
        </div>
      </>
    );

  const { lermao, boduo } = data.brands;
  const revTotal = lermao.revenue + boduo.revenue;
  const qtyTotal = lermao.quantity + boduo.quantity;
  const shareL = revTotal ? lermao.revenue / revTotal : null;
  const shareB = revTotal ? boduo.revenue / revTotal : null;
  const wL = Math.min(100, (shareL ?? 0) * 100);
  const maxRev = data.maxProductRevenue ?? 0;

  return (
    <>
      {header}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <BrandCard
          name="MỨT LERMAO"
          color={DK.lermao}
          bg={DK.lermaoBg}
          s={lermao}
          revShare={shareL}
          qtyShare={qtyTotal ? lermao.quantity / qtyTotal : null}
        />
        <BrandCard
          name="MỨT BODUO"
          color={DK.boduo}
          bg={DK.boduoBg}
          s={boduo}
          revShare={shareB}
          qtyShare={qtyTotal ? boduo.quantity / qtyTotal : null}
        />
      </div>

      <div className="dt-panel p-4 space-y-2">
        <div
          className="text-[13.5px]"
          style={{ color: "var(--dt-text-secondary)" }}>
          Tỷ trọng doanh thu (Lermao vs Boduo)
        </div>
        {revTotal ? (
          <div className="flex h-5 rounded-md overflow-hidden gap-[2px] text-[12px] font-semibold text-white">
            {wL > 0 && (
              <div
                className="grid place-items-center whitespace-nowrap overflow-hidden"
                style={{ width: `${wL}%`, background: DK.lermao }}>
                Lermao {fmtPct(shareL)}
              </div>
            )}
            {wL < 100 && (
              <div
                className="grid place-items-center whitespace-nowrap overflow-hidden"
                style={{ width: `${100 - wL}%`, background: DK.boduo }}>
                Boduo {fmtPct(shareB)}
              </div>
            )}
          </div>
        ) : (
          <div
            className="text-[12.5px]"
            style={{ color: "var(--dt-text-muted)" }}>
            Không có doanh thu trong kỳ
          </div>
        )}
      </div>

      <div className="grid gap-3 grid-cols-1 2xl:grid-cols-2 items-start">
        <DkSection badge="● SO SÁNH THEO VỊ MỨT (sản lượng)">
          <div className="max-h-[640px] overflow-y-auto">
            <DkTable
              empty={!data.flavors?.length}
              head={[
                { label: "Vị mứt", width: "18%" },
                { label: "Lermao (SL)", align: "right" },
                { label: "Boduo (SL)" },
                { label: "Tổng", align: "right" },
                { label: "L / B (%)", align: "right" },
                { label: "Vượt trội", align: "center" },
              ]}>
              {data.flavors?.map((f) => {
                const wl = f.total ? Math.round((f.lermao / f.total) * 100) : 0;
                return (
                  <tr key={f.flavor}>
                    <DkTd className="font-semibold">{f.flavor}</DkTd>
                    <DkTd align="right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="dt-mono">{fmtNum(f.lermao)}</span>
                        <div
                          className="w-24 h-1.5 rounded-full overflow-hidden flex justify-end"
                          style={{ background: DK.barBg }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${wl}%`, background: DK.lermao }}
                          />
                        </div>
                      </div>
                    </DkTd>
                    <DkTd>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-24 h-1.5 rounded-full overflow-hidden"
                          style={{ background: DK.barBg }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${f.total ? 100 - wl : 0}%`,
                              background: DK.boduo,
                            }}
                          />
                        </div>
                        <span className="dt-mono">{fmtNum(f.boduo)}</span>
                      </div>
                    </DkTd>
                    <DkTd align="right" mono>
                      {fmtNum(f.total)}
                    </DkTd>
                    <DkTd align="right" mono>
                      {fmtPct(f.total ? f.lermao / f.total : 0, 0)} /{" "}
                      {fmtPct(f.total ? f.boduo / f.total : 0, 0)}
                    </DkTd>
                    <DkTd align="center">
                      {f.lermao > f.boduo ? (
                        <span
                          className="font-semibold"
                          style={{ color: DK.lermao }}>
                          Lermao ▲
                        </span>
                      ) : f.boduo > f.lermao ? (
                        <span
                          className="font-semibold"
                          style={{ color: DK.boduo }}>
                          Boduo ▲
                        </span>
                      ) : (
                        <span style={{ color: DK.muted }}>=</span>
                      )}
                    </DkTd>
                  </tr>
                );
              })}
            </DkTable>
          </div>
        </DkSection>
        <div className="space-y-3 min-w-0">
          <TopProducts
            title="★ TOP 10 SẢN PHẨM LERMAO"
            rows={data.topLermao ?? []}
            max={maxRev}
            color={DK.lermao}
            bg={DK.lermaoBg}
          />
          <TopProducts
            title="★ TOP 10 SẢN PHẨM BODUO"
            rows={data.topBoduo ?? []}
            max={maxRev}
            color={DK.boduo}
            bg={DK.boduoBg}
          />
        </div>
      </div>
      <DkUpdated at={data.updatedAt} />
    </>
  );
}

function BrandCard({
  name,
  color,
  bg,
  s,
  revShare,
  qtyShare,
}: {
  name: string;
  color: string;
  bg: string;
  s: DkBrandStats;
  revShare: number | null;
  qtyShare: number | null;
}) {
  const item = (label: string, value: string, sub?: string) => (
    <div>
      <div
        className="text-[12px]"
        style={{ color: "var(--dt-text-secondary)" }}>
        {label}
      </div>
      <div className="text-[22px] font-bold dt-mono leading-tight">{value}</div>
      {sub && (
        <div className="text-[11.5px]" style={{ color: DK.muted }}>
          {sub}
        </div>
      )}
    </div>
  );
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: bg, borderColor: color }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3.5 h-3.5 rounded" style={{ background: color }} />
        <span className="text-[15px] font-bold" style={{ color }}>
          {name}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {item("Doanh thu", fmtTy(s.revenue, 2), `Tỷ trọng ${fmtPct(revShare)}`)}
        {item("Sản lượng", fmtNum(s.quantity), `Tỷ trọng ${fmtPct(qtyShare)}`)}
        {item("Đơn hàng", fmtNum(s.orders))}
        {item("Khách hàng", fmtNum(s.customers))}
      </div>
    </div>
  );
}

function TopProducts({
  title,
  rows,
  max,
  color,
  bg,
}: {
  title: string;
  rows: DkTopProduct[];
  max: number;
  color: string;
  bg: string;
}) {
  return (
    <DkSection badge={title} color={color} bg={bg}>
      <DkTable
        empty={!rows.length}
        head={[
          { label: "Sản phẩm", width: "40%" },
          { label: "Doanh thu" },
          { label: "Sản lượng", align: "right", width: "16%" },
        ]}>
        {rows.map((r) => (
          <tr key={r.name}>
            <DkTd className="text-[12px]">{r.name}</DkTd>
            <DkTd>
              <DkBar
                ratio={max ? r.revenue / max : 0}
                color={color}
                label={fmtTr(r.revenue)}
                labelWidth={72}
              />
            </DkTd>
            <DkTd align="right" mono>
              {fmtNum(r.quantity)}
            </DkTd>
          </tr>
        ))}
      </DkTable>
    </DkSection>
  );
}
