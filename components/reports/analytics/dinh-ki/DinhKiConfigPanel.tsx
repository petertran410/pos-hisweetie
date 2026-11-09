"use client";

// Cấu hình của báo cáo Định Kì + Hằng Tuần (thay bảng "Enter data" / quy tắc viết
// cứng trong Power BI). Gắn vào trang Phân tích › Cấu hình. Quyền: reports:analytics_config.

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  dinhKiApi,
  type DkGroupTarget,
  type DkJamFlavor,
  type DkTargetKind,
  type DkWeeklySeller,
} from "@/lib/api/analytics-dinh-ki";
import {
  useDkGroupTargets,
  useDkJamFlavors,
  useDkWeeklySellers,
} from "@/lib/hooks/useAnalyticsDinhKi";
import { useAnalyticsConfigMutation } from "@/lib/hooks/useAnalyticsReports";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

type Tab = "targets" | "jam" | "sellers";

const TABS: { key: Tab; label: string; hint: string }[] = [
  {
    key: "targets",
    label: "Chỉ tiêu nhóm hàng",
    hint: "Chỉ tiêu doanh số THÁNG theo nhóm hàng (không theo sale). Kế hoạch tuần trên các trang Tuần Này / Tuần Trước / Chi Tiết = chỉ tiêu tháng / 4. Nhóm hàng 2026 dùng cho bảng O1, nhóm hàng hiển thị cho bảng O2 trang Chi Tiết. Chỉ tiêu theo sale lấy ở bảng KPI Sale.",
  },
  {
    key: "jam",
    label: "Vị mứt Lermao / Boduo",
    hint: "Mã hàng mứt / siro → vị mứt và hãng, dùng cho bảng “So sánh theo vị mứt” trang Đối Thủ.",
  },
  {
    key: "sellers",
    label: "Người bán (Hằng Tuần)",
    hint: "Chỉ nhân viên có nhóm “Người Bán” mới được tính trong báo cáo Hằng Tuần. Để trống nhóm = không tính. Thứ tự nhỏ hơn hiện trước.",
  },
];

const inputCls =
  "w-full border rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";
const thCls =
  "px-2.5 py-2 text-left font-semibold text-[12px] whitespace-nowrap border-b";

export function DinhKiConfigPanel() {
  const [tab, setTab] = useState<Tab>("targets");
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
        {tab === "targets" && <TargetsTab />}
        {tab === "jam" && <JamTab />}
        {tab === "sellers" && <SellersTab />}
      </div>
    </div>
  );
}

// ── Chỉ tiêu nhóm hàng ───────────────────────────────────────────────────────
const BRAND_OPTIONS = [
  { value: "Lermao", label: "Lermao" },
  { value: "Boduo", label: "Boduo" },
];

const KIND_OPTIONS: { key: DkTargetKind; label: string }[] = [
  { key: "group2026", label: "Nhóm hàng 2026 (A–D)" },
  { key: "visual", label: "Nhóm hàng hiển thị (1.Boduo…)" },
];

function TargetsTab() {
  const thisYear = new Date().getFullYear();
  const [kind, setKind] = useState<DkTargetKind>("group2026");
  const [year, setYear] = useState(thisYear);
  const [newGroup, setNewGroup] = useState("");
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ g: string; m: number } | null>(null);
  const [draft, setDraft] = useState("");
  const { data: rows = [], isLoading } = useDkGroupTargets({ kind, year });

  const upsert = useAnalyticsConfigMutation(
    (d: Omit<DkGroupTarget, "id">) => dinhKiApi.upsertGroupTarget(d),
    "Đã lưu chỉ tiêu",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => dinhKiApi.deleteGroupTarget(id),
    "Đã xoá chỉ tiêu",
  );

  const groups = useMemo(() => {
    const set = new Set([...rows.map((r) => r.groupName), ...extraGroups]);
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [rows, extraGroups]);
  const cell = (g: string, m: number) =>
    rows.find((r) => r.groupName === g && r.month === m);

  const save = () => {
    if (!editing) return;
    const existing = cell(editing.g, editing.m);
    const raw = draft.replace(/[.,\s]/g, "");
    if (!raw) {
      if (existing) remove.mutate(existing.id);
    } else if (Number.isFinite(Number(raw))) {
      upsert.mutate({
        kind,
        groupName: editing.g,
        year,
        month: editing.m,
        kpiValue: Number(raw),
      });
    }
    setEditing(null);
  };

  const years = [thisYear + 1, thisYear, thisYear - 1].map((y) => ({
    key: String(y),
    label: `Năm ${y}`,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <AnalyticsSelect
          options={KIND_OPTIONS}
          value={kind}
          onChange={(k) => {
            setKind(k as DkTargetKind);
            setExtraGroups([]);
          }}
          className="w-64"
        />
        <AnalyticsSelect
          options={years}
          value={String(year)}
          onChange={(k) => setYear(Number(k))}
          className="w-36"
        />
        <div className="flex-1" />
        <input
          className={`${inputCls} max-w-[200px]`}
          placeholder="Thêm nhóm hàng…"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <button
          type="button"
          disabled={!newGroup.trim()}
          onClick={() => {
            setExtraGroups((g) => [...g, newGroup.trim()]);
            setNewGroup("");
          }}
          className="inline-flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
          style={{ background: "var(--dt-primary)" }}>
          <Plus className="w-4 h-4" /> Thêm
        </button>
      </div>
      <div
        className="border rounded-lg overflow-auto"
        style={{ borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12.5px] border-collapse">
          <thead style={{ background: "#F3F8F9" }}>
            <tr>
              <th className={thCls} style={{ borderColor: "var(--dt-border)" }}>
                Nhóm hàng
              </th>
              {Array.from({ length: 12 }, (_, i) => (
                <th
                  key={i}
                  className={`${thCls} text-right`}
                  style={{ borderColor: "var(--dt-border)" }}>
                  T{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && groups.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="p-6 text-center"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Chưa có chỉ tiêu năm {year}
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <tr
                key={g}
                className="border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">
                  {g}
                </td>
                {Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  const c = cell(g, m);
                  const on = editing?.g === g && editing.m === m;
                  return (
                    <td key={m} className="px-1.5 py-1 text-right">
                      {on ? (
                        <input
                          autoFocus
                          className={`${inputCls} text-right min-w-[110px]`}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={save}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") save();
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="dt-mono w-full text-right px-1 py-0.5 rounded hover:bg-gray-50 whitespace-nowrap"
                          title="Bấm để sửa (để trống = xoá)"
                          onClick={() => {
                            setEditing({ g, m });
                            setDraft(c ? String(c.kpiValue) : "");
                          }}>
                          {c
                            ? (c.kpiValue / 1e9).toLocaleString("vi-VN", {
                                maximumFractionDigits: 3,
                              })
                            : "—"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
        Số hiển thị theo tỷ đồng; khi sửa nhập số tiền đầy đủ (VNĐ).
      </p>
    </div>
  );
}

// ── Vị mứt ───────────────────────────────────────────────────────────────────
type JamDraft = Pick<DkJamFlavor, "productCode" | "jamFlavor" | "brand">;

function JamTab() {
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading } = useDkJamFlavors(search);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<JamDraft>({
    productCode: "",
    jamFlavor: "",
    brand: "Lermao",
  });
  const create = useAnalyticsConfigMutation(
    (d: JamDraft) => dinhKiApi.createJamFlavor(d),
    "Đã lưu vị mứt",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, d }: { id: number; d: Omit<JamDraft, "productCode"> }) =>
      dinhKiApi.updateJamFlavor(id, d),
    "Đã lưu vị mứt",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => dinhKiApi.deleteJamFlavor(id),
    "Đã xoá mã hàng",
  );
  const valid = draft.productCode.trim() && draft.jamFlavor.trim();
  const save = () => {
    if (!valid) return;
    if (editing === "new") create.mutate(draft);
    else if (typeof editing === "number")
      update.mutate({
        id: editing,
        d: { jamFlavor: draft.jamFlavor, brand: draft.brand },
      });
    setEditing(null);
  };
  const brandSelect = (
    <AnalyticsSelect
      options={BRAND_OPTIONS}
      value={draft.brand}
      onChange={(v) =>
        setDraft((d) => ({ ...d, brand: v as JamDraft["brand"] }))
      }
      className="w-full"
    />
  );
  const actions = (
    <div className="flex gap-1 justify-end">
      <button
        type="button"
        className={iconBtn}
        disabled={!valid}
        onClick={save}>
        <Check className="w-4 h-4" />
      </button>
      <button
        type="button"
        className={iconBtn}
        onClick={() => setEditing(null)}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={`${inputCls} pl-8`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã hàng, tên, vị…"
          />
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setDraft({ productCode: "", jamFlavor: "", brand: "Lermao" });
            setEditing("new");
          }}
          className="inline-flex items-center gap-1 text-[13px] font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: "var(--dt-primary)" }}>
          <Plus className="w-4 h-4" /> Thêm mã hàng
        </button>
      </div>
      <div
        className="border rounded-lg overflow-auto max-h-[560px]"
        style={{ borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="sticky top-0" style={{ background: "#F3F8F9" }}>
            <tr>
              {["Mã hàng", "Tên hàng", "Vị mứt", "Hãng", ""].map((h, i) => (
                <th
                  key={i}
                  className={thCls}
                  style={{ borderColor: "var(--dt-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editing === "new" && (
              <tr
                className="border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2 py-1.5">
                  <input
                    className={inputCls}
                    value={draft.productCode}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, productCode: e.target.value }))
                    }
                    placeholder="SP00…"
                  />
                </td>
                <td />
                <td className="px-2 py-1.5">
                  <input
                    className={inputCls}
                    value={draft.jamFlavor}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, jamFlavor: e.target.value }))
                    }
                  />
                </td>
                <td className="px-2 py-1.5">{brandSelect}</td>
                <td className="px-2 py-1.5">{actions}</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && editing !== "new" && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2.5 py-1.5 dt-mono">{r.productCode}</td>
                <td className="px-2.5 py-1.5">{r.productName ?? "—"}</td>
                {editing === r.id ? (
                  <>
                    <td className="px-2 py-1.5">
                      <input
                        className={inputCls}
                        value={draft.jamFlavor}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, jamFlavor: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">{brandSelect}</td>
                    <td className="px-2 py-1.5">{actions}</td>
                  </>
                ) : (
                  <>
                    <td className="px-2.5 py-1.5">{r.jamFlavor}</td>
                    <td className="px-2.5 py-1.5">{r.brand}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => {
                            setDraft({
                              productCode: r.productCode,
                              jamFlavor: r.jamFlavor,
                              brand: r.brand,
                            });
                            setEditing(r.id);
                          }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => {
                            if (confirm(`Xoá mã ${r.productCode}?`))
                              remove.mutate(r.id);
                          }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Người bán Hằng Tuần ──────────────────────────────────────────────────────
function SellersTab() {
  const { data: rows = [], isLoading } = useDkWeeklySellers();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ sellerGroup: "", sortOrder: 0 });
  const save = useAnalyticsConfigMutation(
    ({
      userId,
      d,
    }: {
      userId: number;
      d: { sellerGroup: string; sortOrder: number };
    }) => dinhKiApi.setWeeklySeller(userId, d),
    "Đã lưu người bán",
  );
  const remove = useAnalyticsConfigMutation(
    (userId: number) => dinhKiApi.removeWeeklySeller(userId),
    "Đã bỏ khỏi báo cáo Hằng Tuần",
  );
  const groups = [
    ...new Set(rows.map((r) => r.sellerGroup).filter(Boolean)),
  ] as string[];
  const submit = (r: DkWeeklySeller) => {
    if (!draft.sellerGroup.trim()) remove.mutate(r.userId);
    else save.mutate({ userId: r.userId, d: draft });
    setEditing(null);
  };

  return (
    <div
      className="border rounded-lg overflow-auto max-h-[560px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <datalist id="dk-seller-groups">
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0" style={{ background: "#F3F8F9" }}>
          <tr>
            {["Nhân viên", "Team sale", "Người Bán (nhóm)", "Thứ tự", ""].map(
              (h, i) => (
                <th
                  key={i}
                  className={thCls}
                  style={{ borderColor: "var(--dt-border)" }}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {!isLoading && rows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={r.userId}
              className="border-b"
              style={{
                borderColor: "var(--dt-border)",
                opacity: r.sellerGroup ? 1 : 0.6,
              }}>
              <td className="px-2.5 py-1.5">
                <div className="font-medium">{r.name}</div>
                <div
                  className="text-[11.5px]"
                  style={{ color: "var(--dt-text-muted)" }}>
                  {r.email}
                </div>
              </td>
              <td className="px-2.5 py-1.5">{r.teamName ?? "—"}</td>
              {editing === r.userId ? (
                <>
                  <td className="px-2 py-1.5">
                    <input
                      className={inputCls}
                      list="dk-seller-groups"
                      value={draft.sellerGroup}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, sellerGroup: e.target.value }))
                      }
                      placeholder="Để trống = không tính"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className={`${inputCls} max-w-[80px]`}
                      value={draft.sortOrder}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          sortOrder: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => submit(r)}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => setEditing(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2.5 py-1.5">
                    {r.sellerGroup ?? "Không tính"}
                  </td>
                  <td className="px-2.5 py-1.5 dt-mono">
                    {r.sortOrder ?? "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => {
                          setDraft({
                            sellerGroup: r.sellerGroup ?? "",
                            sortOrder: r.sortOrder ?? 0,
                          });
                          setEditing(r.userId);
                        }}>
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
