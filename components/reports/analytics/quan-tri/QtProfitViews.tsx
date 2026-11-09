"use client";

import { useMemo, useState } from "react";
import type {
  QtCustomerDetailRow,
  QtDetailValues,
  QtParentProfit,
  QtPlColumn,
  QtProductRow,
  QtProfitCustomer,
  QtProfitCustomerDetail,
  QtProfitProduct,
  QtProfitTeam,
} from "@/lib/api/analytics-quan-tri";
import { DT_COLORS, vi } from "@/lib/dashboard/format";
import { Empty, Panel } from "../shared/AnalyticsCharts";
import { QtDonut, QtHBar, QtScatter, QtStacked100 } from "./QtCharts";
import {
  BLANK,
  NORMAL_COLOR,
  VIP_COLOR,
  growthColor,
  moneyLabel,
  num,
  pct2,
  qtAxis,
} from "./qtFormat";
import { QtTreeTable, buildTree, type TreeColumn } from "./QtTreeTable";

const intFmt = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : Math.round(v).toLocaleString("vi-VN");

// ═══════════════════════════════════════════════════════════════════════════
// Bookmark "Nhóm Bán"
// ═══════════════════════════════════════════════════════════════════════════
const PL_ROWS: {
  label: string;
  def: string;
  get: (c: QtPlColumn) => string;
}[] = [
  {
    label: "Doanh thu gộp",
    def: "Doanh thu bán hàng và cung cấp dịch vụ",
    get: (c) => intFmt(c.grossRevenue),
  },
  {
    label: "Giảm giá hàng bán",
    def: "Các khoản giảm trừ doanh thu",
    get: (c) => intFmt(c.discount),
  },
  {
    label: "% Giảm giá",
    def: "Tỷ lệ giảm giá trên doanh thu gộp",
    get: (c) => pct2(c.discountRate),
  },
  {
    label: "Trả hàng bán",
    def: "Các khoản giảm trừ doanh thu",
    get: (c) => intFmt(c.returns),
  },
  {
    label: "Doanh thu thuần",
    def: "Doanh thu thuần về bán hàng và cung cấp dịch vụ",
    get: (c) => intFmt(c.netRevenue),
  },
  {
    label: "Giá vốn hàng bán",
    def: "Giá vốn hàng bán",
    get: (c) => intFmt(c.cost),
  },
  {
    label: "Lợi nhuận gộp",
    def: "Lợi nhuận gộp về bán hàng và cung cấp dịch vụ",
    get: (c) => intFmt(c.grossProfit),
  },
  {
    label: "Tỷ suất lợi nhuận gộp",
    def: "Tỷ suất lợi nhuận đo lường sự khác biệt giữa doanh thu và giá vốn hàng bán",
    get: (c) => pct2(c.margin),
  },
];

export function ProfitTeamView({ data }: { data: QtProfitTeam }) {
  const teams = data.teams ?? [];
  const cols = data.total ? [...teams, data.total] : teams;
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_2fr]">
      <Panel
        title="Tỷ Trọng Nhóm Bán"
        subtitle="Lợi nhuận gộp (đã trừ hàng trả)">
        <QtDonut
          rows={teams.map((t) => ({
            name: t.team ?? BLANK,
            value: t.grossProfit,
          }))}
          fmt={moneyLabel}
        />
      </Panel>
      <Panel title="Báo cáo kết quả kinh doanh">
        {cols.length ? (
          <div
            className="border rounded-lg overflow-auto"
            style={{ borderColor: "var(--dt-border)" }}>
            <table className="w-full text-[12.5px] border-collapse">
              <thead style={{ background: "#F3F8F9" }}>
                <tr>
                  <th className="sticky left-0 bg-[#F3F8F9] px-2.5 py-2 text-left text-[12px] font-semibold border-b min-w-[200px]">
                    Chỉ tiêu
                  </th>
                  {cols.map((c) => (
                    <th
                      key={c.team ?? "__total"}
                      className="px-2.5 py-2 text-right text-[12px] font-semibold border-b whitespace-nowrap">
                      {c.team ?? "Tổng"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PL_ROWS.map((r) => (
                  <tr
                    key={r.label}
                    className="border-b hover:bg-[#F7FBFC]"
                    style={{ borderColor: "var(--dt-border)" }}>
                    <td
                      className="sticky left-0 bg-white px-2.5 py-1.5 font-medium"
                      title={r.def}>
                      {r.label}
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c.team ?? "__total"}
                        className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${
                          c.team === null ? "font-bold" : ""
                        }`}>
                        {r.get(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bookmark "Khách Hàng Key"
// ═══════════════════════════════════════════════════════════════════════════
const parentRows = (list: QtParentProfit[]) =>
  list.map((p) => ({
    name: p.name,
    value: p.netProfit,
    color: p.isVip ? VIP_COLOR : NORMAL_COLOR,
  }));

function VipLegend() {
  return (
    <div
      className="flex gap-3 text-[11.5px]"
      style={{ color: "var(--dt-text-muted)" }}>
      <span className="inline-flex items-center gap-1">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: VIP_COLOR }}
        />
        Khách chiến lược
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: NORMAL_COLOR }}
        />
        Khách thường
      </span>
    </div>
  );
}

export function ProfitCustomerView({ data }: { data: QtProfitCustomer }) {
  const top = useMemo(() => data.topProfit ?? [], [data.topProfit]);
  const thin = data.thinMargin ?? [];
  const catMix = useMemo(() => data.categoryMix ?? [], [data.categoryMix]);
  const order = useMemo(() => top.map((t) => t.name), [top]);
  const categories = useMemo(() => {
    const tot = new Map<string, number>();
    for (const c of catMix) {
      const k = c.name ?? BLANK;
      tot.set(k, (tot.get(k) ?? 0) + c.quantity);
    }
    return [...tot.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  }, [catMix]);
  const catValue = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catMix)
      m.set(`${c.parent}\u0001${c.name ?? BLANK}`, c.quantity);
    return (g: string, s: string) => m.get(`${g}\u0001${s}`) ?? 0;
  }, [catMix]);
  const flavorTree = useMemo(
    () =>
      buildTree(
        (data.productMix ?? []).filter((x) => order.includes(x.parent)),
        (x) => [x.parent, x.name ?? BLANK],
        (x) => x.quantity,
        (l) => l.reduce((s, v) => s + v, 0),
        (a, b) => {
          const ia = order.indexOf(a.label);
          const ib = order.indexOf(b.label);
          return ia >= 0 && ib >= 0 ? ia - ib : b.values - a.values;
        },
      ),
    [data.productMix, order],
  );
  const qtyCols: TreeColumn<number>[] = [
    { key: "q", label: "Sản Lượng", render: (v) => vi(v) },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Tỷ Trọng Lợi Nhuận Từ Khách Chiến Lược">
          <QtDonut
            rows={(data.byVip ?? []).map((r) => ({
              name: r.key,
              value: r.netProfit,
              color: r.key === "Chiến Lược" ? VIP_COLOR : NORMAL_COLOR,
            }))}
            fmt={moneyLabel}
          />
        </Panel>
        <Panel
          title="Top 20 Khách Đem Lại Lợi Nhuận Cao Nhất"
          right={<VipLegend />}>
          <QtHBar
            rows={parentRows(top)}
            fmt={moneyLabel}
            valueName="Lợi nhuận gộp"
          />
        </Panel>
        <Panel
          title="Khách Mua Nhiều Nhưng Biên Lợi Nhuận Mỏng"
          subtitle="Top 20 khách theo doanh số, xếp theo biên lợi nhuận tăng dần"
          right={<VipLegend />}>
          <QtHBar
            rows={thin.map((p) => ({
              name: `${p.name} (${pct2(p.margin)})`,
              value: p.netProfit,
              color: p.isVip ? VIP_COLOR : NORMAL_COLOR,
            }))}
            fmt={moneyLabel}
            valueName="Lợi nhuận gộp"
          />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
        <Panel
          title="Họ thường mua danh mục gì ?"
          subtitle="Top 20 khách theo lợi nhuận · tỷ trọng sản lượng theo danh mục">
          <QtStacked100
            horizontal
            groups={order}
            series={categories}
            value={catValue}
            fmt={vi}
          />
        </Panel>
        <Panel
          title="Họ thường mua hương vị gì ?"
          subtitle="Top 20 khách · sản lượng theo mặt hàng">
          <QtTreeTable
            nodes={flavorTree}
            columns={qtyCols}
            firstLabel="Khách cha / Mặt hàng"
            maxHeight={520}
            firstWidth={240}
          />
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bookmark "Hàng Hóa" + cây lợi nhuận
// ═══════════════════════════════════════════════════════════════════════════
export function ProfitProductView({ data }: { data: QtProfitProduct }) {
  const products = data.products ?? [];
  const [xMode, setXMode] = useState<"revenue" | "quantity">("revenue");
  const sumBy = (
    key: (p: QtProductRow) => string | null,
    val: (p: QtProductRow) => number,
  ) => {
    const m = new Map<string, number>();
    for (const p of products) {
      const k = key(p) ?? BLANK;
      m.set(k, (m.get(k) ?? 0) + val(p));
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  const name = (p: QtProductRow) => p.name ?? p.code ?? BLANK;
  const topProfit = [...products]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 20)
    .map((p) => ({ name: name(p), value: p.profit }));
  const topMargin = products
    .filter((p) => p.margin !== null)
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))
    .slice(0, 20)
    .map((p) => ({ name: name(p), value: p.margin ?? 0 }));
  // Sản Phẩm Cần Lưu Ý: Total Quantity < 100 và product_margin < 3%.
  const watch = products
    .filter((p) => p.quantity < 100 && p.margin !== null && p.margin < 0.03)
    .sort((a, b) => b.profit - a.profit)
    .map((p) => ({ name: name(p), value: p.profit }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Tỷ trọng Ngành Kinh Doanh" subtitle="Lợi nhuận gộp">
          <QtDonut
            rows={sumBy(
              (p) => p.productType,
              (p) => p.profit,
            )}
            fmt={moneyLabel}
          />
        </Panel>
        <Panel
          title="Tỷ trọng Hàng Chiến Lược"
          subtitle="Lợi nhuận gộp theo nhóm hàng 2026">
          <QtDonut
            rows={sumBy(
              (p) => p.productGroup,
              (p) => p.profit,
            ).sort((a, b) => a.name.localeCompare(b.name, "vi"))}
            fmt={moneyLabel}
          />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel
          title="Sản Phẩm Top Lợi Nhuận"
          subtitle="Top 20 theo lợi nhuận gộp">
          <QtHBar
            rows={topProfit}
            fmt={moneyLabel}
            color={VIP_COLOR}
            valueName="Lợi nhuận"
          />
        </Panel>
        <Panel
          title="Sản Phẩm Top Lợi Nhuận"
          subtitle="Top 20 theo biên lợi nhuận">
          <QtHBar
            rows={topMargin}
            fmt={(v) => pct2(v)}
            color={DT_COLORS.primaryMid}
            valueName="Biên lợi nhuận"
          />
        </Panel>
        <Panel
          title="Sản Phẩm Cần Lưu Ý"
          subtitle="Sản lượng < 100 và biên lợi nhuận < 3%">
          <QtHBar
            rows={watch}
            fmt={moneyLabel}
            color={VIP_COLOR}
            valueName="Lợi nhuận"
          />
        </Panel>
      </div>
      <Panel
        title="Phân Tán Lợi Nhuận"
        subtitle="Mỗi điểm là một mặt hàng"
        right={
          <div className="dt-seg dt-seg-sm">
            <button
              type="button"
              data-on={xMode === "revenue"}
              onClick={() => setXMode("revenue")}>
              Doanh Thu
            </button>
            <button
              type="button"
              data-on={xMode === "quantity"}
              onClick={() => setXMode("quantity")}>
              Số Lượng Bán
            </button>
          </div>
        }>
        <QtScatter
          points={products.map((p) => ({
            name: name(p),
            group: p.productType ?? BLANK,
            x: xMode === "revenue" ? p.amount : p.quantity,
            y: p.profit,
          }))}
          xName={xMode === "revenue" ? "Doanh thu" : "Số lượng bán"}
          yName="Lợi nhuận"
          xFmt={(v) =>
            xMode === "revenue" ? qtAxis(v, "amount") : qtAxis(v, "quantity")
          }
          yFmt={(v) => qtAxis(v, "profit")}
        />
      </Panel>
    </div>
  );
}

/** Cây lợi nhuận (decompositionTree: ngành hàng › danh mục › mặt hàng). */
export function ProfitTreeView({ data }: { data: QtProfitProduct }) {
  const [mode, setMode] = useState<"value" | "percent">("value");
  const all = data.allProductsProfit ?? 0;
  const tree = useMemo(
    () =>
      buildTree(
        data.products ?? [],
        (p) => [
          p.productType ?? BLANK,
          p.category ?? BLANK,
          p.name ?? p.code ?? BLANK,
        ],
        (p) => p.profit,
        (l) => l.reduce((s, v) => s + v, 0),
        (a, b) => b.values - a.values,
      ),
    [data.products],
  );
  const max = Math.max(1, ...tree.map((n) => Math.abs(n.values)));
  const cols: TreeColumn<number>[] = [
    {
      key: "v",
      label: mode === "value" ? "Lợi nhuận" : "% đóng góp",
      render: (v) =>
        mode === "value" ? moneyLabel(v) : pct2(all ? v / all : null),
      color: (v) => (v < 0 ? "#EB5757" : undefined),
    },
    {
      key: "bar",
      label: "",
      width: 220,
      render: (v) => (
        <div className="h-2.5 rounded bg-[#EEF4F5] w-[200px] overflow-hidden">
          <div
            className="h-full rounded"
            style={{
              width: `${Math.min(100, (Math.abs(v) / max) * 100)}%`,
              background: v < 0 ? "#EB5757" : VIP_COLOR,
            }}
          />
        </div>
      ),
    },
  ];
  return (
    <Panel
      title="Cây Lợi Nhuận"
      subtitle="Ngành hàng › Danh mục › Mặt hàng"
      right={
        <div className="dt-seg dt-seg-sm">
          <button
            type="button"
            data-on={mode === "value"}
            onClick={() => setMode("value")}>
            Giá trị
          </button>
          <button
            type="button"
            data-on={mode === "percent"}
            onClick={() => setMode("percent")}>
            % Phần trăm
          </button>
        </div>
      }>
      <QtTreeTable
        nodes={tree}
        columns={cols}
        total={tree.reduce((s, n) => s + n.values, 0)}
        firstLabel="Phân rã lợi nhuận"
        maxHeight={640}
        defaultOpenLevel={1}
        firstWidth={320}
      />
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// "Báo cáo kết quả kinh doanh theo hàng hóa / theo khách"
// ═══════════════════════════════════════════════════════════════════════════
interface DetailAgg extends QtDetailValues {
  /** Mẫu số contribute_profit_by_product (lợi nhuận mọi mặt hàng). */
  allProfit: number;
  types: Record<string, { amount: number; profit: number }>;
}

const TYPE_KEYS: [string, string][] = [
  ["Khách buôn", "Buôn"],
  ["Khách chuỗi", "Chuỗi"],
  ["Khách lẻ", "Lẻ"],
];

function sumDetail(list: DetailAgg[]): DetailAgg {
  const out: DetailAgg = {
    amount: 0,
    cost: 0,
    profit: 0,
    margin: null,
    quantity: 0,
    discount: 0,
    allProfit: 0,
    types: {},
  };
  for (const d of list) {
    out.amount += d.amount;
    out.cost += d.cost;
    out.profit += d.profit;
    out.quantity += d.quantity;
    out.discount += d.discount;
    out.allProfit += d.allProfit;
    for (const [k, v] of Object.entries(d.types)) {
      const t = (out.types[k] ??= { amount: 0, profit: 0 });
      t.amount += v.amount;
      t.profit += v.profit;
    }
  }
  out.margin = out.amount ? out.profit / out.amount : null;
  return out;
}

function detailColumns(colorMargin: boolean): TreeColumn<DetailAgg>[] {
  const share = (k: string) => (v: DetailAgg) =>
    pct2(v.amount ? (v.types[k]?.amount ?? 0) / v.amount : null);
  const margin = (k: string) => (v: DetailAgg) => {
    const t = v.types[k];
    return pct2(t && t.amount ? t.profit / t.amount : null);
  };
  return [
    { key: "amount", label: "Doanh Số", render: (v) => intFmt(v.amount) },
    { key: "cost", label: "Giá Vốn", render: (v) => intFmt(v.cost) },
    { key: "profit", label: "Lợi Nhuận", render: (v) => intFmt(v.profit) },
    {
      key: "margin",
      label: "% Biên LN",
      render: (v) => pct2(v.margin),
      color: colorMargin ? (v) => growthColor(v.margin) : undefined,
    },
    {
      key: "contrib",
      label: "% Đóng Góp LN",
      render: (v) => pct2(v.allProfit ? v.profit / v.allProfit : null),
    },
    { key: "qty", label: "Sản Lượng", render: (v) => num(v.quantity) },
    {
      key: "unit",
      label: "LN / Đơn Vị",
      render: (v) => intFmt(v.quantity ? v.profit / v.quantity : null),
    },
    { key: "disc", label: "Chiết Khấu SP", render: (v) => intFmt(v.discount) },
    ...TYPE_KEYS.map(([k, s]) => ({
      key: `share_${s}`,
      label: `% DS ${s}`,
      render: share(k),
    })),
    ...TYPE_KEYS.map(([k, s]) => ({
      key: `margin_${s}`,
      label: `% Biên ${s}`,
      render: margin(k),
    })),
  ];
}

export function ProductDetailTable({ data }: { data: QtProfitProduct }) {
  const all = data.allProductsProfit ?? 0;
  const tree = useMemo(
    () =>
      buildTree<QtProductRow, DetailAgg>(
        data.products ?? [],
        (p) => [
          p.productType ?? BLANK,
          p.origin ?? BLANK,
          p.name ?? p.code ?? BLANK,
        ],
        (p) => ({ ...p, allProfit: all, types: p.byCustomerType }),
        (l) => ({ ...sumDetail(l), allProfit: all }),
        (a, b) => b.values.amount - a.values.amount,
      ),
    [data.products, all],
  );
  const total = useMemo(
    () => ({ ...sumDetail(tree.map((n) => n.values)), allProfit: all }),
    [tree, all],
  );
  return (
    <Panel
      title="Báo cáo kết quả kinh doanh theo hàng hóa"
      subtitle="Ngành hàng › Nguồn gốc › Mặt hàng">
      <QtTreeTable
        nodes={tree}
        columns={detailColumns(true)}
        total={total}
        firstLabel="Hàng hoá"
        maxHeight={680}
      />
    </Panel>
  );
}

export function CustomerDetailTable({
  data,
}: {
  data: QtProfitCustomerDetail;
}) {
  const tree = useMemo(
    () =>
      buildTree<QtCustomerDetailRow, DetailAgg>(
        data.rows ?? [],
        (r) => ["Chiến Lược", r.customerType ?? BLANK, r.parentName ?? BLANK],
        (r) => ({
          ...r,
          allProfit: r.allProductsProfit,
          types: r.customerType
            ? { [r.customerType]: { amount: r.amount, profit: r.profit } }
            : {},
        }),
        sumDetail,
        (a, b) => b.values.amount - a.values.amount,
      ),
    [data.rows],
  );
  const total = useMemo(() => sumDetail(tree.map((n) => n.values)), [tree]);
  return (
    <Panel
      title="Báo cáo kết quả kinh doanh theo khách"
      subtitle="Khách chiến lược (VIP) › Nhóm khách › Khách cha">
      <QtTreeTable
        nodes={tree}
        columns={detailColumns(false)}
        total={total}
        firstLabel="Khách hàng"
        maxHeight={680}
        defaultOpenLevel={2}
      />
    </Panel>
  );
}
