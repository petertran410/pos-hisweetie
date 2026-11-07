"use client";

import { useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  analyticsMuaHangApi,
  type CodeMergeRow,
  type PurchaseProductInput,
  type PurchaseProductRow,
  type RebateInput,
  type RebateRow,
} from "@/lib/api/analytics-mua-hang";
import {
  useCodeMerges,
  useExcludedSellers,
  useMuaHangConfigMutation,
  usePurchaseProducts,
  useRebates,
} from "@/lib/hooks/useAnalyticsMuaHang";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

/**
 * Cấu hình cho Phân tích › Chuyển Kho + Thu Mua (thay quy tắc viết cứng / bảng
 * "Enter data" của Power BI dataset_purchasing). Tự gọi API; gắn vào trang Cấu hình.
 */
type Tab = "merges" | "sellers" | "products" | "rebates";

const TABS: { key: Tab; label: string; hint: string }[] = [
  {
    key: "merges",
    label: "Gộp mã hàng",
    hint: "Khi tính số bán (Sản lượng 90 ngày, Nhóm Hàng, Nguồn Hàng), dòng hoá đơn của mã gộp được tính vào mã chính (Power BI viết cứng trong Power Query: mã AA, mã đổi bao bì…).",
  },
  {
    key: "sellers",
    label: "Nhân viên loại trừ",
    hint: "Hoá đơn của các nhân viên được đánh dấu không tính vào số bán của báo cáo Thu Mua (filter report của Power BI).",
  },
  {
    key: "products",
    label: "Thông số mua hàng",
    hint: "Nhà máy, quy cách, phân loại, đặt tối thiểu, tồn tối thiểu HN/SG, số lượng/thùng, danh mục R&D theo mã hàng (bảng nhập tay dim_manufactory, dim_minimum_inventory, dim_convert_box, dim_category_rd của Power BI). Hiện chưa trang nào dùng — lưu lại để không mất dữ liệu khi bỏ Power BI.",
  },
  {
    key: "rebates",
    label: "Rebate nhà máy",
    hint: "Chương trình rebate theo năm và nhà máy (bảng nhập tay dim_rebate của Power BI). Hiện chưa trang nào dùng.",
  },
];

const inputCls =
  "w-full border rounded-lg px-2 py-1 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";
const btnPrimary =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px] disabled:opacity-50";

export function MuaHangConfigPanel() {
  const [tab, setTab] = useState<Tab>("merges");
  const current = TABS.find((t) => t.key === tab)!;
  return (
    <div className="dt-panel">
      <div
        className="flex flex-wrap gap-1 px-4 pt-3 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
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
        {tab === "merges" && <CodeMergesTab />}
        {tab === "sellers" && <SellersTab />}
        {tab === "products" && <PurchaseProductsTab />}
        {tab === "rebates" && <RebatesTab />}
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className={`${inputCls} pl-8 py-1.5`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Bảng sửa tại chỗ dùng chung ──────────────────────────────────────────────
interface ColDef<T> {
  key: keyof T & string;
  label: string;
  type: "text" | "int" | "float" | "select";
  options?: { value: string; label: string }[];
  width?: string;
  /** Chỉ nhập khi thêm mới (vd mã hàng). */
  createOnly?: boolean;
  required?: boolean;
  render?: (row: T) => ReactNode;
}

type Draft = Record<string, string>;

const toDraft = <T,>(row: T, cols: ColDef<T>[]): Draft =>
  Object.fromEntries(
    cols.map((c) => {
      const v = row[c.key];
      return [c.key, v === null || v === undefined ? "" : String(v)];
    }),
  );

/** Chuỗi trong ô nhập → giá trị gửi API ("" = null). Trả undefined nếu số sai. */
function parseCell<T>(c: ColDef<T>, s: string): unknown {
  const t = s.trim();
  if (c.type === "text" || c.type === "select") return t === "" ? null : t;
  if (t === "") return null;
  // Số nguyên: bỏ dấu phân cách nghìn. Số thực: có dấu phẩy thì hiểu kiểu Việt
  // (1.234,5), không có thì dấu chấm là phần thập phân (0.01).
  const n =
    c.type === "int"
      ? Number(t.replace(/[.,\s]/g, ""))
      : t.includes(",")
        ? Number(t.replace(/[.\s]/g, "").replace(",", "."))
        : Number(t.replace(/\s/g, ""));
  if (!Number.isFinite(n)) return undefined;
  return c.type === "int" ? Math.round(n) : n;
}

const showCell = <T,>(c: ColDef<T>, row: T): ReactNode => {
  if (c.render) return c.render(row);
  const v = row[c.key] as unknown;
  if (v === null || v === undefined || v === "")
    return <span className="text-gray-300">—</span>;
  if (typeof v === "number")
    return v.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
  return c.options?.find((o) => o.value === v)?.label ?? String(v);
};

function EditableTable<T extends { id: number }>({
  cols,
  rows,
  loading,
  onSave,
  onCreate,
  onDelete,
  deleteConfirm,
  saving,
}: {
  cols: ColDef<T>[];
  rows: T[];
  loading?: boolean;
  onSave: (id: number, patch: Record<string, unknown>) => void;
  onCreate: (data: Record<string, unknown>, done: () => void) => void;
  onDelete: (row: T) => void;
  deleteConfirm: (row: T) => string;
  saving?: boolean;
}) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [err, setErr] = useState("");

  const collect = (forCreate: boolean, original?: T) => {
    const out: Record<string, unknown> = {};
    for (const c of cols) {
      if (c.createOnly && !forCreate) continue;
      const v = parseCell(c, draft[c.key] ?? "");
      if (v === undefined) {
        setErr(`“${c.label}” không phải số hợp lệ`);
        return null;
      }
      if (c.required && (v === null || v === "")) {
        setErr(`Chưa nhập “${c.label}”`);
        return null;
      }
      if (forCreate) {
        if (v !== null) out[c.key] = v;
      } else if (original && (original[c.key] ?? null) !== v) out[c.key] = v;
    }
    setErr("");
    return out;
  };

  const inputFor = (c: ColDef<T>) =>
    c.type === "select" ? (
      <AnalyticsSelect
        options={c.options ?? []}
        value={draft[c.key] ?? ""}
        onChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))}
        className="w-full min-w-[140px]"
      />
    ) : (
      <input
        className={`${inputCls} ${c.type !== "text" ? "text-right" : ""}`}
        value={draft[c.key] ?? ""}
        inputMode={c.type === "text" ? undefined : "decimal"}
        onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}
      />
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {err && <span className="text-[12.5px] text-red-600">{err}</span>}
        <div className="flex-1" />
        <button
          type="button"
          className={btnPrimary}
          disabled={editing !== null}
          onClick={() => {
            const d: Draft = {};
            for (const c of cols)
              d[c.key] =
                c.type === "select" ? (c.options?.[0]?.value ?? "") : "";
            setDraft(d);
            setEditing("new");
            setErr("");
          }}>
          <Plus className="w-4 h-4" /> Thêm dòng
        </button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`p-2 whitespace-nowrap ${c.type === "int" || c.type === "float" ? "text-right" : ""}`}
                  style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              <th className="p-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={cols.length + 1}
                  className="p-4 text-center text-gray-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {editing === "new" && (
              <tr className="border-t bg-[#F7FBFC]">
                {cols.map((c) => (
                  <td key={c.key} className="p-1.5">
                    {inputFor(c)}
                  </td>
                ))}
                <td className="p-1.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className={iconBtn}
                    title="Lưu"
                    disabled={saving}
                    onClick={() => {
                      const data = collect(true);
                      if (data) onCreate(data, () => setEditing(null));
                    }}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    title="Huỷ"
                    onClick={() => setEditing(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const on = editing === r.id;
              return (
                <tr key={r.id} className="border-t align-top">
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`p-${on ? "1.5" : "2"} ${
                        !on && (c.type === "int" || c.type === "float")
                          ? "text-right dt-mono"
                          : ""
                      }`}>
                      {on && !c.createOnly ? inputFor(c) : showCell(c, r)}
                    </td>
                  ))}
                  <td className="p-1.5 text-right whitespace-nowrap">
                    {on ? (
                      <>
                        <button
                          type="button"
                          className={iconBtn}
                          title="Lưu"
                          disabled={saving}
                          onClick={() => {
                            const patch = collect(false, r);
                            if (!patch) return;
                            if (Object.keys(patch).length) onSave(r.id, patch);
                            setEditing(null);
                          }}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          title="Huỷ"
                          onClick={() => setEditing(null)}>
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={iconBtn}
                          title="Sửa"
                          disabled={editing !== null}
                          onClick={() => {
                            setDraft(toDraft(r, cols));
                            setEditing(r.id);
                            setErr("");
                          }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          title="Xoá"
                          disabled={editing !== null}
                          onClick={() =>
                            window.confirm(deleteConfirm(r)) && onDelete(r)
                          }>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && !rows.length && editing !== "new" && (
              <tr>
                <td
                  colSpan={cols.length + 1}
                  className="p-4 text-center text-gray-400">
                  Chưa có dòng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const nameHint = (code: string, name: string | null) => (
  <div>
    <div className="dt-mono">{code}</div>
    <div className="text-[11.5px] text-gray-500">
      {name ?? <span className="text-red-400">(không tìm thấy hàng)</span>}
    </div>
  </div>
);

// ── Gộp mã hàng ─────────────────────────────────────────────────────────────
function CodeMergesTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useCodeMerges(search);
  const create = useMuaHangConfigMutation(
    (d: { fromCode: string; toCode: string; note?: string }) =>
      analyticsMuaHangApi.createCodeMerge(d),
    "Đã thêm mã gộp",
  );
  const update = useMuaHangConfigMutation(
    ({
      id,
      patch,
    }: {
      id: number;
      patch: { toCode?: string; note?: string | null };
    }) => analyticsMuaHangApi.updateCodeMerge(id, patch),
    "Đã lưu",
  );
  const remove = useMuaHangConfigMutation(
    (id: number) => analyticsMuaHangApi.deleteCodeMerge(id),
    "Đã xoá mã gộp",
  );
  const cols: ColDef<CodeMergeRow>[] = [
    {
      key: "fromCode",
      label: "Mã gộp (trên hoá đơn)",
      type: "text",
      createOnly: true,
      required: true,
      width: "30%",
      render: (r) => nameHint(r.fromCode, r.fromName),
    },
    {
      key: "toCode",
      label: "Tính vào mã chính",
      type: "text",
      required: true,
      width: "30%",
      render: (r) => nameHint(r.toCode, r.toName),
    },
    { key: "note", label: "Ghi chú", type: "text" },
  ];
  return (
    <div className="space-y-2">
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Tìm mã / tên hàng…"
      />
      <EditableTable
        cols={cols}
        rows={data}
        loading={isLoading}
        saving={create.isPending || update.isPending}
        onCreate={(d, done) =>
          create.mutate(
            d as { fromCode: string; toCode: string; note?: string },
            {
              onSuccess: done,
            },
          )
        }
        onSave={(id, patch) => update.mutate({ id, patch })}
        onDelete={(r) => remove.mutate(r.id)}
        deleteConfirm={(r) => `Bỏ gộp ${r.fromCode} → ${r.toCode}?`}
      />
    </div>
  );
}

// ── Nhân viên loại trừ ──────────────────────────────────────────────────────
function SellersTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useExcludedSellers();
  const add = useMuaHangConfigMutation(
    (userId: number) => analyticsMuaHangApi.addExcludedSeller(userId),
    "Đã loại nhân viên khỏi số bán Thu Mua",
  );
  const remove = useMuaHangConfigMutation(
    (userId: number) => analyticsMuaHangApi.removeExcludedSeller(userId),
    "Đã tính lại nhân viên vào số bán",
  );
  const term = search.trim().toLowerCase();
  const rows = data.filter(
    (u) =>
      !term ||
      u.name.toLowerCase().includes(term) ||
      (u.email ?? "").toLowerCase().includes(term),
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Tìm tên / email nhân viên…"
        />
        <span className="text-[12.5px] text-gray-500">
          Đang loại trừ {data.filter((u) => u.excluded).length} nhân viên
        </span>
      </div>
      <div className="border rounded-lg overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500 sticky top-0">
            <tr>
              <th className="p-2 w-24 text-center">Loại trừ</th>
              <th className="p-2">Nhân viên</th>
              <th className="p-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr
                key={u.id}
                className={`border-t ${u.isActive ? "" : "opacity-60"}`}>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.excluded}
                    disabled={add.isPending || remove.isPending}
                    onChange={(e) =>
                      e.target.checked ? add.mutate(u.id) : remove.mutate(u.id)
                    }
                  />
                </td>
                <td className="p-2 font-medium">
                  {u.name}
                  {!u.isActive && (
                    <span className="ml-1.5 text-[11px] text-gray-400">
                      (ngừng hoạt động)
                    </span>
                  )}
                </td>
                <td className="p-2 text-gray-500">{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Thông số mua hàng theo mã ───────────────────────────────────────────────
const SUPPLY_TYPES = ["Hàng ổn định", "Đặt Theo Đơn", "Mùa Vụ"];

function PurchaseProductsTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = usePurchaseProducts({ search, page, limit });
  const create = useMuaHangConfigMutation(
    (d: PurchaseProductInput & { productCode: string }) =>
      analyticsMuaHangApi.createPurchaseProduct(d),
    "Đã thêm mã hàng",
  );
  const update = useMuaHangConfigMutation(
    ({ id, patch }: { id: number; patch: PurchaseProductInput }) =>
      analyticsMuaHangApi.updatePurchaseProduct(id, patch),
    "Đã lưu",
  );
  const remove = useMuaHangConfigMutation(
    (id: number) => analyticsMuaHangApi.deletePurchaseProduct(id),
    "Đã xoá mã hàng",
  );
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));
  const cols: ColDef<PurchaseProductRow>[] = [
    {
      key: "productCode",
      label: "Mã hàng",
      type: "text",
      createOnly: true,
      required: true,
      width: "200px",
      render: (r) => nameHint(r.productCode, r.productName),
    },
    { key: "manufactory", label: "Nhà máy", type: "text" },
    { key: "spec", label: "Quy cách", type: "text" },
    {
      key: "supplyType",
      label: "Phân loại",
      type: "select",
      options: [
        { value: "", label: "—" },
        ...SUPPLY_TYPES.map((s) => ({ value: s, label: s })),
      ],
    },
    { key: "minOrderBox", label: "Đặt tối thiểu (thùng)", type: "int" },
    { key: "minStockHn", label: "Tồn tối thiểu HN", type: "int" },
    { key: "minStockSg", label: "Tồn tối thiểu SG", type: "int" },
    { key: "packDetail", label: "Quy cách thùng", type: "text" },
    { key: "convertQuantity", label: "SL / thùng", type: "int" },
    { key: "subCateLv1", label: "Danh mục R&D 1", type: "text" },
    { key: "subCateLv2", label: "Danh mục R&D 2", type: "text" },
  ];
  return (
    <div className="space-y-2">
      <SearchBox
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Tìm mã / tên hàng / nhà máy / danh mục…"
      />
      <EditableTable
        cols={cols}
        rows={data?.data ?? []}
        loading={isLoading}
        saving={create.isPending || update.isPending}
        onCreate={(d, done) =>
          create.mutate(d as PurchaseProductInput & { productCode: string }, {
            onSuccess: done,
          })
        }
        onSave={(id, patch) =>
          update.mutate({ id, patch: patch as PurchaseProductInput })
        }
        onDelete={(r) => remove.mutate(r.id)}
        deleteConfirm={(r) => `Xoá thông số mua hàng của ${r.productCode}?`}
      />
      <div className="flex items-center justify-end gap-2 text-[12.5px] text-gray-500">
        <span>
          {data?.total ?? 0} mã · trang {page}/{totalPages}
        </span>
        <button
          type="button"
          className="px-2 py-1 border rounded disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}>
          Trước
        </button>
        <button
          type="button"
          className="px-2 py-1 border rounded disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}>
          Sau
        </button>
      </div>
    </div>
  );
}

// ── Rebate ──────────────────────────────────────────────────────────────────
const REBATE_TYPES = [
  { value: "percent", label: "% doanh số" },
  { value: "value", label: "Hoàn tiền (giá trị)" },
  { value: "both", label: "% + tặng hàng" },
];

function RebatesTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useRebates(search);
  const create = useMuaHangConfigMutation(
    (d: RebateInput) => analyticsMuaHangApi.createRebate(d),
    "Đã thêm rebate",
  );
  const update = useMuaHangConfigMutation(
    ({ id, patch }: { id: number; patch: RebateInput }) =>
      analyticsMuaHangApi.updateRebate(id, patch),
    "Đã lưu",
  );
  const remove = useMuaHangConfigMutation(
    (id: number) => analyticsMuaHangApi.deleteRebate(id),
    "Đã xoá rebate",
  );
  const cols: ColDef<RebateRow>[] = [
    {
      key: "applyYear",
      label: "Năm",
      type: "int",
      required: true,
      width: "80px",
    },
    { key: "manufactory", label: "Nhà máy", type: "text", required: true },
    {
      key: "rebateName",
      label: "Mức rebate",
      type: "text",
      required: true,
      width: "28%",
    },
    { key: "targetCny", label: "Chỉ tiêu (CNY)", type: "float" },
    { key: "targetVnd", label: "Chỉ tiêu (VNĐ)", type: "float" },
    { key: "rebateType", label: "Loại", type: "select", options: REBATE_TYPES },
    { key: "mainValue", label: "Giá trị chính", type: "float" },
    { key: "subValue", label: "Giá trị phụ", type: "float" },
  ];
  return (
    <div className="space-y-2">
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Tìm nhà máy / mức rebate…"
      />
      <EditableTable
        cols={cols}
        rows={data}
        loading={isLoading}
        saving={create.isPending || update.isPending}
        onCreate={(d, done) =>
          create.mutate(d as RebateInput, { onSuccess: done })
        }
        onSave={(id, patch) =>
          update.mutate({ id, patch: patch as RebateInput })
        }
        onDelete={(r) => remove.mutate(r.id)}
        deleteConfirm={(r) =>
          `Xoá rebate “${r.rebateName}” (${r.manufactory} ${r.applyYear})?`
        }
      />
    </div>
  );
}
