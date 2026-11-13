"use client";

import { useMemo } from "react";
import type { QtMetric, QtPivotRows } from "@/lib/api/analytics-quan-tri";
import {
  BLANK,
  growthColor,
  growthOf,
  monthLabel,
  pct2,
  qtLabel,
} from "./qtFormat";
import { QtTreeTable, type TreeColumn, type TreeNode } from "./QtTreeTable";

/**
 * Bảng tháng có MoM Growth (%) (+ tỷ trọng tuỳ chọn) — thay các pivotTable
 * "Tổng hợp doanh số theo khách hàng" / "Tăng Trưởng và Tỷ Trọng…".
 * Giá trị của từng tháng: map "cur:YYYY-MM" / "prev:YYYY-MM" → số.
 */
export type MonthValues = Map<string, number | null>;

export interface PivotLeaf {
  id: string;
  label: string;
  group: string | null;
  values: MonthValues;
}

export function QtMonthPivot({
  months,
  leaves,
  groups,
  total,
  metric,
  firstLabel,
  share,
  sortKey,
}: {
  months: string[];
  leaves: PivotLeaf[];
  /** Giá trị cấp nhóm (đếm phân biệt không cộng dồn được nên lấy từ server). */
  groups: Map<string, MonthValues>;
  total: MonthValues;
  metric: QtMetric;
  firstLabel: string;
  /** Tỷ trọng (contribute_by_product): giá trị / mẫu số của tháng. */
  share?: (ym: string, v: number | null) => number | null;
  /** Giá trị dùng để sắp xếp dòng (giảm dần). */
  sortKey?: (v: MonthValues) => number;
}) {
  const keyOf = (v: MonthValues) =>
    sortKey
      ? sortKey(v)
      : months.reduce((s, m) => s + (v.get(`cur:${m}`) ?? 0), 0);
  const nodes = useMemo<TreeNode<MonthValues>[]>(() => {
    const byGroup = new Map<string, PivotLeaf[]>();
    for (const l of leaves) {
      const g = l.group ?? BLANK;
      const list = byGroup.get(g);
      if (list) list.push(l);
      else byGroup.set(g, [l]);
    }
    return [...byGroup.entries()]
      .map(([g, list]) => ({
        id: `g:${g}`,
        label: g,
        values: groups.get(g) ?? new Map(),
        children: list
          .map((l) => ({ id: l.id, label: l.label, values: l.values }))
          .sort((a, b) => keyOf(b.values) - keyOf(a.values)),
      }))
      .sort((a, b) => keyOf(b.values) - keyOf(a.values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves, groups, months]);

  const columns: TreeColumn<MonthValues>[] = months.flatMap((m) => {
    const cur = (v: MonthValues) => v.get(`cur:${m}`) ?? null;
    const mom = (v: MonthValues) =>
      growthOf(cur(v), v.get(`prev:${m}`) ?? null);
    const cols: TreeColumn<MonthValues>[] = [
      {
        key: `${m}:v`,
        group: monthLabel(m),
        label: "Giá trị",
        render: (v) => (cur(v) === null ? "" : qtLabel(cur(v), metric)),
      },
      {
        key: `${m}:mom`,
        group: monthLabel(m),
        label: "MoM",
        render: (v) => (mom(v) === null ? "" : pct2(mom(v))),
        color: (v) => growthColor(mom(v)),
      },
    ];
    if (share)
      cols.push({
        key: `${m}:share`,
        group: monthLabel(m),
        label: "Tỷ trọng",
        render: (v) => {
          const s = share(m, cur(v));
          return s === null ? "" : pct2(s);
        },
      });
    return cols;
  });

  return (
    <QtTreeTable
      nodes={nodes}
      columns={columns}
      total={total}
      firstLabel={firstLabel}
      maxHeight={620}
      firstWidth={260}
    />
  );
}

/** Dòng pivot gọn từ server (mỗi mã 1 dòng + mảng giá trị theo keys) → lá của bảng. */
export function leavesFromRows(pivot: QtPivotRows): PivotLeaf[] {
  return pivot.rows.map((r) => {
    const values: MonthValues = new Map();
    r.values.forEach((v, i) => {
      if (v !== null) values.set(pivot.keys[i], v);
    });
    return {
      id: `${r.group}\u0001${r.code}`,
      label: r.name ?? r.code ?? BLANK,
      group: r.group,
      values,
    };
  });
}

/** Gom danh sách ô {k, value} theo khoá dòng. */
export function collectMonths<
  T extends { k: string | null; value: number | null },
>(cells: T[], rowKey: (c: T) => string): Map<string, MonthValues> {
  const out = new Map<string, MonthValues>();
  for (const c of cells) {
    if (!c.k) continue;
    const id = rowKey(c);
    let m = out.get(id);
    if (!m) {
      m = new Map();
      out.set(id, m);
    }
    m.set(c.k, c.value);
  }
  return out;
}
