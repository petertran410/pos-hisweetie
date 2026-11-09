"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import { FilterMultiSelect } from "@/components/ui/filters";
import {
  kpiSaleApi,
  type KpiConfigOptions,
  type KpiConfigTable,
  type KpiIncomeRule,
  type KpiProductMap,
  type KpiProductTarget,
  type KpiRepRule,
  type KpiRevenueTarget,
} from "@/lib/api/analytics-kpi-sale";
import {
  useKpiConfigList,
  useKpiConfigMutation,
  useKpiConfigOptions,
} from "@/lib/hooks/useAnalyticsKpiSale";
import { fmtDate, num } from "./kpiFormat";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

// Cấu hình Phân tích › KPI Sale (quyền reports:analytics_config): chỉ tiêu
// doanh số / nhóm hàng, người đại diện của khách, điều kiện tính thu nhập,
// gộp mã hàng. Thay các bảng "Enter data" và quy tắc viết cứng của Power BI.

type Tab = KpiConfigTable;

const TABS: { key: Tab; label: string; hint: string }[] = [
  {
    key: "revenue-targets",
    label: "Chỉ tiêu doanh số",
    hint: "KPI doanh số theo nhân viên / tháng (kpi_sale_by_revenue). Mã nhân viên = phần trước @ của email.",
  },
  {
    key: "product-targets",
    label: "Chỉ tiêu nhóm hàng",
    hint: "KPI theo nhóm hàng 2026 (kpi_sale_by_product) — dùng cho Bảng Cơ Cấu Sản Phẩm và % Hiệu Quả của Bảng Thu Nhập.",
  },
  {
    key: "rep-rules",
    label: "Người đại diện",
    hint: "Khách thuộc nhóm khách mang tên mã sale (Sale PIC) → xét quy tắc theo thứ tự nhỏ trước, khớp quy tắc đầu tiên thì dừng; không khớp: lấy chính Sale PIC; khách không thuộc nhóm nào: noname. Hiệu lực tính theo ngày mua của hoá đơn (dùng khi bàn giao khách).",
  },
  {
    key: "income-rules",
    label: "Tính thu nhập",
    hint: "Dòng hàng được tính thu nhập (“Có”) khi người đại diện, loại khách, loại hàng và nhóm hàng 2026 khớp một dòng.",
  },
  {
    key: "product-maps",
    label: "Gộp mã hàng",
    hint: "Mã phụ (mã AA, mã cũ…) được tính như mã chính khi lấy loại hàng / nhóm hàng 2026.",
  },
];

const inputCls =
  "w-full border rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)] bg-white";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";

export function KpiSaleConfigPanel() {
  const [tab, setTab] = useState<Tab>("revenue-targets");
  const current = TABS.find((t) => t.key === tab)!;
  const { data: opts } = useKpiConfigOptions();
  return (
    <div className="dt-panel">
      <div
        className="flex flex-wrap gap-1 px-4 pt-3 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
        <span className="px-1 py-2 text-[13px] font-bold mr-2">KPI Sale</span>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ${
              tab === t.key
                ? "border-[var(--dt-primary)] text-[var(--dt-primary)]"
                : "border-transparent text-gray-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
          {current.hint}
        </p>
        {tab === "revenue-targets" && <RevenueTargets opts={opts} />}
        {tab === "product-targets" && <ProductTargets opts={opts} />}
        {tab === "rep-rules" && <RepRules opts={opts} />}
        {tab === "income-rules" && <IncomeRules opts={opts} />}
        {tab === "product-maps" && <ProductMaps />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bảng sửa trực tiếp dùng chung
// ─────────────────────────────────────────────────────────────────────────────
type Draft = Record<string, unknown>;

interface Field {
  key: string;
  label: string;
  kind: "text" | "int" | "money" | "date" | "select" | "multi";
  options?: { value: string; label: string }[];
  /** select: cho phép để trống (hiển thị "Tất cả"). */
  emptyLabel?: string;
  required?: boolean;
  width?: number;
  view?: (v: unknown, row: Record<string, unknown>) => ReactNode;
}

function FieldInput({
  f,
  value,
  onChange,
}: {
  f: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (f.kind === "money")
    return (
      <NumericInput
        value={Number(value ?? 0)}
        onValueChange={onChange}
        maxFractionDigits={0}
        className={`${inputCls} text-right`}
      />
    );
  if (f.kind === "int")
    return (
      <input
        type="number"
        className={inputCls}
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    );
  if (f.kind === "date")
    return (
      <input
        type="date"
        className={inputCls}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    );
  if (f.kind === "select")
    return (
      <AnalyticsSelect
        options={f.options ?? []}
        value={(value as string) ?? ""}
        onChange={(v) => onChange(v || null)}
        clearLabel={f.emptyLabel ?? "— Chọn —"}
        className="w-full min-w-[120px]"
      />
    );
  if (f.kind === "multi")
    return (
      <FilterMultiSelect
        options={f.options ?? []}
        values={(value as string[]) ?? []}
        onChange={onChange}
        placeholder="— Chọn —"
        searchable
        multiLabel={(n) => `${n} mục`}
      />
    );
  return (
    <input
      className={inputCls}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ConfigTable<T extends { id: number }>({
  table,
  rows,
  loading,
  fields,
  blank,
  activeKey,
  toolbar,
}: {
  table: KpiConfigTable;
  rows: T[];
  loading: boolean;
  fields: Field[];
  blank: () => Draft;
  /** Cột bật / tắt (is_active) nếu bảng có. */
  activeKey?: keyof T & string;
  toolbar?: ReactNode;
}) {
  const { create, update, remove } = useKpiConfigMutation();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const busy = create.isPending || update.isPending;

  const startNew = () => {
    setDraft(blank());
    setEditing("new");
  };
  const startEdit = (r: T) => {
    const d: Draft = {};
    for (const f of fields) d[f.key] = (r as Record<string, unknown>)[f.key];
    setDraft(d);
    setEditing(r.id);
  };
  const missing = fields.some(
    (f) =>
      f.required &&
      (draft[f.key] === null ||
        draft[f.key] === undefined ||
        draft[f.key] === "" ||
        (Array.isArray(draft[f.key]) && !(draft[f.key] as unknown[]).length)),
  );
  const save = () => {
    if (missing) return;
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") create.mutate({ table, data: draft }, done);
    else if (typeof editing === "number")
      update.mutate({ table, id: editing, data: draft }, done);
  };

  const editRow = (
    <tr className="bg-[#F4FBFC] align-top">
      {fields.map((f) => (
        <td key={f.key} className="p-1.5" style={{ minWidth: f.width }}>
          <FieldInput
            f={f}
            value={draft[f.key]}
            onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
          />
        </td>
      ))}
      {activeKey && <td />}
      <td className="p-1.5 text-right whitespace-nowrap">
        <button
          type="button"
          className={iconBtn}
          onClick={save}
          disabled={busy || missing}
          title={missing ? "Điền đủ các ô bắt buộc" : "Lưu"}>
          <Check className="w-4 h-4 text-[var(--dt-primary)]" />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setEditing(null)}
          title="Huỷ">
          <X className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );

  const colSpan = fields.length + (activeKey ? 2 : 1);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <div className="flex-1" />
        <span className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
          {rows.length} dòng
        </span>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px]">
          <Plus className="w-4 h-4" /> Thêm
        </button>
      </div>
      <div className="border rounded-lg overflow-auto max-h-[560px]">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500 sticky top-0 z-10">
            <tr>
              {fields.map((f) => (
                <th
                  key={f.key}
                  className={`p-2 whitespace-nowrap ${f.kind === "money" ? "text-right" : ""}`}>
                  {f.label}
                  {f.required && <span className="text-red-400"> *</span>}
                </th>
              ))}
              {activeKey && <th className="p-2 w-14">Bật</th>}
              <th className="p-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {editing === "new" && editRow}
            {loading && (
              <tr>
                <td colSpan={colSpan} className="p-4 text-center text-gray-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && editing !== "new" && (
              <tr>
                <td colSpan={colSpan} className="p-4 text-center text-gray-400">
                  Chưa có dữ liệu
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const rec = r as Record<string, unknown>;
              const active = activeKey ? (rec[activeKey] as boolean) : true;
              return editing === r.id ? (
                <Fragment key={r.id}>{editRow}</Fragment>
              ) : (
                <tr
                  key={r.id}
                  className={`border-t ${active ? "" : "opacity-50"}`}>
                  {fields.map((f) => (
                    <td
                      key={f.key}
                      className={`p-2 ${f.kind === "money" ? "text-right dt-mono" : ""}`}>
                      {f.view
                        ? f.view(rec[f.key], rec)
                        : f.kind === "money"
                          ? num(rec[f.key] as number)
                          : f.kind === "date"
                            ? rec[f.key]
                              ? fmtDate(String(rec[f.key]))
                              : ""
                            : f.kind === "multi"
                              ? ((rec[f.key] as string[]) ?? []).join(", ")
                              : String(rec[f.key] ?? f.emptyLabel ?? "")}
                    </td>
                  ))}
                  {activeKey && (
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) =>
                          update.mutate({
                            table,
                            id: r.id,
                            data: { [activeKey]: e.target.checked },
                          })
                        }
                      />
                    </td>
                  )}
                  <td className="p-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className={iconBtn}
                      onClick={() => startEdit(r)}
                      title="Sửa">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      title="Xoá"
                      onClick={() =>
                        window.confirm("Xoá dòng cấu hình này?") &&
                        remove.mutate({ table, id: r.id })
                      }>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Từng bảng
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));
const toOpts = (list: string[] = []) =>
  list.map((v) => ({ value: v, label: v }));

function useUserOptions(opts?: KpiConfigOptions) {
  return useMemo(
    () =>
      (opts?.users ?? []).map((u) => ({
        value: u.code,
        label: `${u.name} (${u.code})`,
      })),
    [opts],
  );
}

function YearPicker({
  year,
  onChange,
}: {
  year: number;
  onChange: (y: number) => void;
}) {
  const now = new Date().getFullYear();
  return (
    <AnalyticsSelect
      options={[now + 1, now, now - 1, now - 2].map((y) => ({
        value: y,
        label: `Năm ${y}`,
      }))}
      value={year}
      onChange={(v) => onChange(Number(v))}
      className="w-36"
    />
  );
}

/** Chỉ tiêu theo năm, lọc thêm theo nhân viên. */
function useYearFilter<T extends { saleCode: string }>(
  rows: T[] | undefined,
  code: string,
) {
  return useMemo(
    () => (rows ?? []).filter((r) => !code || r.saleCode === code),
    [rows, code],
  );
}

function SaleCodeFilter({
  value,
  onChange,
  users,
}: {
  value: string;
  onChange: (v: string) => void;
  users: { value: string; label: string }[];
}) {
  return (
    <AnalyticsSelect
      options={users}
      value={value}
      onChange={onChange}
      clearLabel="Tất cả nhân viên"
      className="w-56"
    />
  );
}

function RevenueTargets({ opts }: { opts?: KpiConfigOptions }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [code, setCode] = useState("");
  const users = useUserOptions(opts);
  const { data, isLoading } = useKpiConfigList<KpiRevenueTarget>(
    "revenue-targets",
    () => kpiSaleApi.listRevenueTargets(year),
    year,
  );
  const rows = useYearFilter(data, code);
  const fields: Field[] = [
    { key: "year", label: "Năm", kind: "int", required: true, width: 90 },
    {
      key: "month",
      label: "Tháng",
      kind: "select",
      options: MONTHS,
      required: true,
      width: 110,
    },
    {
      key: "saleCode",
      label: "Nhân viên",
      kind: "select",
      options: users,
      required: true,
      width: 200,
    },
    {
      key: "kpiValue",
      label: "KPI doanh số",
      kind: "money",
      required: true,
      width: 160,
    },
    { key: "basicSalary", label: "Lương cơ bản", kind: "money", width: 140 },
  ];
  return (
    <ConfigTable<KpiRevenueTarget>
      table="revenue-targets"
      rows={rows}
      loading={isLoading}
      fields={fields}
      blank={() => ({
        year,
        month: null,
        saleCode: code || null,
        kpiValue: 0,
        basicSalary: 0,
      })}
      toolbar={
        <>
          <YearPicker year={year} onChange={setYear} />
          <SaleCodeFilter value={code} onChange={setCode} users={users} />
        </>
      }
    />
  );
}

function ProductTargets({ opts }: { opts?: KpiConfigOptions }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [code, setCode] = useState("");
  const users = useUserOptions(opts);
  const { data, isLoading } = useKpiConfigList<KpiProductTarget>(
    "product-targets",
    () => kpiSaleApi.listProductTargets(year),
    year,
  );
  const rows = useYearFilter(data, code);
  const fields: Field[] = [
    { key: "year", label: "Năm", kind: "int", required: true, width: 90 },
    {
      key: "month",
      label: "Tháng",
      kind: "select",
      options: MONTHS,
      required: true,
      width: 110,
    },
    {
      key: "saleCode",
      label: "Nhân viên",
      kind: "select",
      options: users,
      required: true,
      width: 200,
    },
    {
      key: "productGroup",
      label: "Nhóm hàng 2026",
      kind: "select",
      options: toOpts(opts?.productGroups),
      required: true,
      width: 150,
    },
    {
      key: "kpiValue",
      label: "KPI",
      kind: "money",
      required: true,
      width: 160,
    },
  ];
  return (
    <ConfigTable<KpiProductTarget>
      table="product-targets"
      rows={rows}
      loading={isLoading}
      fields={fields}
      blank={() => ({
        year,
        month: null,
        saleCode: code || null,
        productGroup: null,
        kpiValue: 0,
      })}
      toolbar={
        <>
          <YearPicker year={year} onChange={setYear} />
          <SaleCodeFilter value={code} onChange={setCode} users={users} />
        </>
      }
    />
  );
}

function RepRules({ opts }: { opts?: KpiConfigOptions }) {
  const users = useUserOptions(opts);
  const { data, isLoading } = useKpiConfigList<KpiRepRule>("rep-rules", () =>
    kpiSaleApi.listRepRules(),
  );
  const fields: Field[] = [
    {
      key: "priority",
      label: "Thứ tự",
      kind: "int",
      required: true,
      width: 80,
    },
    {
      key: "salePic",
      label: "Sale PIC (nhóm khách)",
      kind: "select",
      options: toOpts(opts?.customerGroups),
      required: true,
      width: 160,
    },
    {
      key: "customerType",
      label: "Loại khách",
      kind: "select",
      options: toOpts(opts?.customerTypes),
      emptyLabel: "Tất cả",
      width: 130,
    },
    {
      key: "region",
      label: "Vùng",
      kind: "select",
      options: toOpts(opts?.regions),
      emptyLabel: "Tất cả",
      width: 120,
    },
    {
      key: "saleCode",
      label: "Người đại diện",
      kind: "select",
      options: users,
      required: true,
      width: 190,
    },
    { key: "validFrom", label: "Từ ngày", kind: "date", width: 140 },
    { key: "validTo", label: "Đến ngày", kind: "date", width: 140 },
    { key: "note", label: "Ghi chú", kind: "text", width: 200 },
  ];
  const rows = data ?? [];
  return (
    <ConfigTable<KpiRepRule>
      table="rep-rules"
      rows={rows}
      loading={isLoading}
      fields={fields}
      activeKey="isActive"
      blank={() => ({
        priority: rows.reduce((m, r) => Math.max(m, r.priority), 0) + 10,
        salePic: null,
        customerType: null,
        region: null,
        saleCode: null,
        validFrom: null,
        validTo: null,
        note: "",
      })}
    />
  );
}

function IncomeRules({ opts }: { opts?: KpiConfigOptions }) {
  const users = useUserOptions(opts);
  const { data, isLoading } = useKpiConfigList<KpiIncomeRule>(
    "income-rules",
    () => kpiSaleApi.listIncomeRules(),
  );
  const fields: Field[] = [
    {
      key: "saleCode",
      label: "Người đại diện",
      kind: "select",
      options: users,
      required: true,
      width: 190,
    },
    {
      key: "customerTypes",
      label: "Loại khách",
      kind: "multi",
      options: toOpts(opts?.customerTypes),
      required: true,
      width: 170,
    },
    {
      key: "productTypes",
      label: "Loại hàng",
      kind: "multi",
      options: toOpts(opts?.productTypes),
      required: true,
      width: 190,
    },
    {
      key: "productGroups",
      label: "Nhóm hàng 2026",
      kind: "multi",
      options: toOpts(opts?.productGroups),
      required: true,
      width: 170,
    },
    { key: "note", label: "Ghi chú", kind: "text", width: 200 },
  ];
  return (
    <ConfigTable<KpiIncomeRule>
      table="income-rules"
      rows={data ?? []}
      loading={isLoading}
      fields={fields}
      activeKey="isActive"
      blank={() => ({
        saleCode: null,
        customerTypes: [],
        productTypes: [],
        productGroups: ["Nhóm A", "Nhóm B", "Nhóm C", "Nhóm D"],
        note: "",
      })}
    />
  );
}

function ProductMaps() {
  const { data, isLoading } = useKpiConfigList<KpiProductMap>(
    "product-maps",
    () => kpiSaleApi.listProductMaps(),
  );
  const named = (nameKey: "fromName" | "toName") =>
    function View(v: unknown, row: Record<string, unknown>) {
      const name = row[nameKey] as string | null;
      return (
        <span>
          <b>{String(v ?? "")}</b>
          {name && (
            <span className="ml-1.5" style={{ color: "var(--dt-text-muted)" }}>
              {name}
            </span>
          )}
        </span>
      );
    };
  const fields: Field[] = [
    {
      key: "fromCode",
      label: "Mã phụ",
      kind: "text",
      required: true,
      width: 150,
      view: named("fromName"),
    },
    {
      key: "toCode",
      label: "Gộp vào mã chính",
      kind: "text",
      required: true,
      width: 150,
      view: named("toName"),
    },
    { key: "note", label: "Ghi chú", kind: "text", width: 240 },
  ];
  return (
    <ConfigTable<KpiProductMap>
      table="product-maps"
      rows={data ?? []}
      loading={isLoading}
      fields={fields}
      blank={() => ({ fromCode: "", toCode: "", note: "" })}
    />
  );
}
