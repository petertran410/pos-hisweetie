"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import {
  AnalyticsTable,
  type AnalyticsColumn,
} from "@/components/reports/analytics/shared/AnalyticsTable";
import type {
  KpiIncomeRule,
  KpiProductMap,
  KpiRepRule,
  KpiSaleLogic,
} from "@/lib/api/analytics-kpi-sale";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import { KpiMatrix, type MatrixMeasure, type MatrixRow } from "./KpiMatrix";
import { BLANK, fmtDate, num, pct } from "./kpiFormat";

/**
 * Trang Logic: trong Power BI trang này chỉ còn bộ lọc (các bảng bị ẩn). Ở đây
 * hiển thị các quy tắc tính KPI đang áp dụng (trước viết cứng trong DAX / SQL)
 * và doanh số tách theo người đại diện × loại khách × loại hàng.
 */
export function LogicView({ data }: { data: KpiSaleLogic }) {
  const { has } = useReportAccess();
  return (
    <div className="space-y-3">
      <Panel
        title="Doanh số theo người đại diện và điều kiện tính thu nhập"
        subtitle="Bấm vào người đại diện để xem theo loại khách · loại hàng">
        <SplitMatrix data={data} />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Người đại diện của khách"
          subtitle="Khách thuộc nhóm khách mang tên mã sale (Sale PIC) → xét quy tắc theo thứ tự; không khớp: lấy Sale PIC; không có Sale PIC: noname"
          right={has("reports:analytics_config") ? <ConfigLink /> : null}>
          <RepRules rules={data.repRules} />
        </Panel>
        <Panel
          title="Điều kiện tính thu nhập"
          subtitle="Dòng hàng “Có” tính thu nhập khi người đại diện, loại khách, loại hàng và nhóm hàng 2026 khớp một dòng dưới đây">
          <IncomeRules rules={data.incomeRules} />
        </Panel>
      </div>

      <Panel
        title="Gộp mã hàng & loại trừ"
        subtitle={`Doanh số không tính mã ${data.exclude.productCode} từ ngày ${fmtDate(data.exclude.from)}. Nhóm hàng / loại hàng của mã phụ lấy theo mã chính.`}>
        <ProductMaps maps={data.productMaps} />
      </Panel>
    </div>
  );
}

function ConfigLink() {
  return (
    <Link
      href="/bao-cao/phan-tich/cau-hinh"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--dt-primary)] hover:underline whitespace-nowrap">
      <Settings2 className="w-3.5 h-3.5" /> Sửa cấu hình
    </Link>
  );
}

function SplitMatrix({ data }: { data: KpiSaleLogic }) {
  const measures: MatrixMeasure[] = [
    { key: "revenue", label: "Doanh Số", format: num },
    { key: "income", label: "Được Tính Thu Nhập", format: num },
    { key: "rate", label: "% Được Tính", format: pct },
  ];
  const reps = new Map<string, { row: MatrixRow; kids: MatrixRow[] }>();
  const total: MatrixRow = { key: "__total", label: "Tổng", cells: {} };
  const add = (row: MatrixRow, rev: number | null, inc: number | null) => {
    const c = (row.cells[""] ??= { revenue: null, income: null, rate: null });
    if (rev !== null) c.revenue = (c.revenue ?? 0) + rev;
    if (inc !== null) c.income = (c.income ?? 0) + inc;
    c.rate = c.revenue ? (c.income ?? 0) / c.revenue : null;
  };
  for (const r of data.split) {
    const key = r.code ?? "";
    let e = reps.get(key);
    if (!e) {
      const label = r.code
        ? r.name
          ? `${r.name} (${r.code})`
          : r.code
        : `${BLANK} — hoá đơn không có khách`;
      e = { row: { key, label, cells: {} }, kids: [] };
      reps.set(key, e);
    }
    const kid: MatrixRow = {
      key: `${r.customerType ?? ""}|${r.productType ?? ""}`,
      label: `${r.customerType ?? BLANK} · ${r.productType ?? BLANK}`,
      cells: {},
    };
    add(kid, r.revenue, r.income);
    e.kids.push(kid);
    add(e.row, r.revenue, r.income);
    add(total, r.revenue, r.income);
  }
  const rows = [...reps.values()]
    .map(({ row, kids }) => ({
      ...row,
      children: kids.sort(
        (a, b) => (b.cells[""]?.revenue ?? 0) - (a.cells[""]?.revenue ?? 0),
      ),
    }))
    .sort((a, b) => (b.cells[""]?.revenue ?? 0) - (a.cells[""]?.revenue ?? 0));
  return (
    <KpiMatrix
      rowHeader="Người đại diện › Loại khách · Loại hàng"
      groups={[]}
      measures={measures}
      rows={rows}
      total={rows.length ? total : null}
    />
  );
}

const any = (v: string | null) => v ?? "Tất cả";

function RepRules({ rules }: { rules: KpiRepRule[] }) {
  const columns: AnalyticsColumn<KpiRepRule>[] = [
    { key: "priority", label: "Thứ tự", align: "center" },
    { key: "salePic", label: "Sale PIC" },
    {
      key: "customerType",
      label: "Loại khách",
      format: (v) => any(v as string | null),
    },
    { key: "region", label: "Vùng", format: (v) => any(v as string | null) },
    {
      key: "validFrom",
      label: "Hiệu lực",
      format: (_, r) =>
        r.validFrom || r.validTo
          ? `${r.validFrom ? fmtDate(r.validFrom) : "…"} – ${r.validTo ? fmtDate(r.validTo) : "…"}`
          : "Luôn",
    },
    {
      key: "saleCode",
      label: "Người đại diện",
      format: (v) => <b>{String(v)}</b>,
    },
  ];
  return (
    <AnalyticsTable
      columns={columns}
      rows={rules}
      rowKey={(r) => r.id}
      maxHeight={360}
      empty="Chưa có quy tắc — mọi khách là noname"
    />
  );
}

function IncomeRules({ rules }: { rules: KpiIncomeRule[] }) {
  const list = (v: unknown) => (v as string[]).join(", ");
  const columns: AnalyticsColumn<KpiIncomeRule>[] = [
    {
      key: "saleCode",
      label: "Người đại diện",
      format: (v) => <b>{String(v)}</b>,
    },
    { key: "customerTypes", label: "Loại khách", format: list },
    { key: "productTypes", label: "Loại hàng", format: list },
    { key: "productGroups", label: "Nhóm hàng 2026", format: list },
  ];
  return (
    <AnalyticsTable
      columns={columns}
      rows={rules}
      rowKey={(r) => r.id}
      maxHeight={360}
      empty="Chưa có quy tắc — không dòng hàng nào được tính thu nhập"
    />
  );
}

function ProductMaps({ maps }: { maps: KpiProductMap[] }) {
  const columns: AnalyticsColumn<KpiProductMap>[] = [
    { key: "fromCode", label: "Mã phụ" },
    { key: "fromName", label: "Tên hàng (mã phụ)" },
    { key: "toCode", label: "Gộp vào mã" },
    { key: "toName", label: "Tên hàng (mã chính)" },
  ];
  return (
    <AnalyticsTable
      columns={columns}
      rows={maps}
      rowKey={(r) => r.id}
      maxHeight={300}
      empty="Không gộp mã nào"
    />
  );
}
