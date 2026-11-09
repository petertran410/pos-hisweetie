"use client";

import { Fragment, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { DinhKiConfigPanel } from "./dinh-ki/DinhKiConfigPanel";
import { KinhDoanhConfigPanel } from "./kinh-doanh/KinhDoanhConfigPanel";
import { KhachHangConfigPanel } from "./khach-hang/KhachHangConfigPanel";
import { KhachHangDlclConfigPanel } from "./khach-hang-dlcl/KhachHangDlclConfigPanel";
import { KpiSaleConfigPanel } from "./kpi-sale/KpiSaleConfigPanel";
import { MuaHangConfigPanel } from "./mua-hang/MuaHangConfigPanel";
import { QuanTriConfigPanel } from "./quan-tri/QuanTriConfigPanel";
import {
  analyticsReportApi,
  type ParentRule,
  type ProductGroupRow,
  type SaleTeam,
} from "@/lib/api/analytics-reports";
import {
  useAnalyticsConfigMutation,
  useParentPreview,
  useParentRules,
  useProductGroups,
  useSaleTeams,
  useTeamMembers,
} from "@/lib/hooks/useAnalyticsReports";
import { AnalyticsSelect } from "@/components/reports/analytics/shared/AnalyticsSelect";

type Tab =
  | "parent"
  | "teams"
  | "members"
  | "groups"
  | "kinh-doanh"
  | "khach-hang"
  | "quan-tri"
  | "dlcl"
  | "dinh-ki"
  | "kpi-sale"
  | "mua-hang";

const TABS: { key: Tab; label: string; hint: string }[] = [
  {
    key: "parent",
    label: "Gộp khách (khách cha)",
    hint: "Quy tắc gộp khách vào chuỗi / khách buôn. Quy tắc có thứ tự nhỏ hơn được xét trước, khớp quy tắc đầu tiên thì dừng; không khớp thì giữ tên khách.",
  },
  {
    key: "teams",
    label: "Team sale",
    hint: "Chỉ hoá đơn của nhân viên thuộc team có bật “Tính là sale” mới được đưa vào báo cáo.",
  },
  {
    key: "members",
    label: "Nhân viên theo team",
    hint: "Gán nhân viên vào team. Nhân viên chưa có team sẽ không được tính số liệu.",
  },
  {
    key: "groups",
    label: "Nhóm hàng 2026",
    hint: "Mã hàng → Nhóm A–D. Mã chưa có ở đây: hàng tạo sau 01/12/2025 tự vào Nhóm C (thương hiệu) / Nhóm B (thương mại, OEM), còn lại “Chưa Phân Loại”.",
  },
  {
    key: "kinh-doanh",
    label: "Kinh Doanh",
    hint: "Chỉ tiêu theo nhóm hàng (sale), danh sách khách KEY, cột đại lý chiến lược, hương vị mứt (báo cáo Kinh Doanh).",
  },
  {
    key: "khach-hang",
    label: "Danh sách khách",
    hint: "Danh sách khách key theo sale (thay file Excel SharePoint), VIP lớp 2, khách Maycha, khách nội bộ, sale phụ trách và quy tắc gán sale (báo cáo Khách Hàng).",
  },
  {
    key: "quan-tri",
    label: "Loại trừ (Quản Trị)",
    hint: "Khách nội bộ và nhân viên bị loại khỏi số liệu báo cáo Quản Trị.",
  },
  {
    key: "dlcl",
    label: "Đại lý chiến lược",
    hint: "Chương trình ĐLCL (Lermao, Mứt Lermao, Boduo, Phượng Hoàng) và danh sách đại lý / khách theo từng chương trình (báo cáo Khách Hàng › ĐLCL).",
  },
  {
    key: "kpi-sale",
    label: "KPI Sale",
    hint: "Chỉ tiêu doanh số theo nhân viên / tháng và theo nhóm hàng, quy tắc gán khách cho sale, quy tắc thu nhập (báo cáo KPI Sale, Định Kì).",
  },
  {
    key: "dinh-ki",
    label: "Định Kì",
    hint: "Chỉ tiêu theo nhóm bán / nhóm hàng, hương vị mứt, danh sách người bán của báo cáo hằng tuần (báo cáo Định Kì, Hằng Tuần).",
  },
  {
    key: "mua-hang",
    label: "Mua hàng",
    hint: "Gộp mã hàng, nhân viên loại khỏi số bán, thông số mua hàng (nhà máy, đặt tối thiểu, tồn tối thiểu, quy đổi thùng), rebate (báo cáo Chuyển Kho, Thu Mua).",
  },
];

const MATCH_TYPE_OPTIONS = [
  { value: "name_contains", label: "Tên khách chứa" },
  { value: "code", label: "Mã khách là" },
];

const inputCls =
  "w-full border rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";

export function AnalyticsConfigTables() {
  const [tab, setTab] = useState<Tab>("parent");
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
        {tab === "parent" && <ParentRulesTab />}
        {tab === "teams" && <TeamsTab />}
        {tab === "members" && <MembersTab />}
        {tab === "groups" && <ProductGroupsTab />}
        {tab === "kinh-doanh" && <KinhDoanhConfigPanel />}
        {tab === "khach-hang" && <KhachHangConfigPanel />}
        {tab === "quan-tri" && <QuanTriConfigPanel />}
        {tab === "dlcl" && <KhachHangDlclConfigPanel />}
        {tab === "kpi-sale" && <KpiSaleConfigPanel />}
        {tab === "dinh-ki" && <DinhKiConfigPanel />}
        {tab === "mua-hang" && <MuaHangConfigPanel />}
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
        className={`${inputCls} pl-8`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Quy tắc khách cha ─────────────────────────────────────────────────────────
type RuleDraft = Pick<
  ParentRule,
  "matchType" | "pattern" | "parentName" | "priority"
>;

function ParentRulesTab() {
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState("");
  const { data: rules = [], isLoading } = useParentRules(search);
  const { data: previewRows = [] } = useParentPreview(preview);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<RuleDraft>({
    matchType: "name_contains",
    pattern: "",
    parentName: "",
    priority: 0,
  });

  const create = useAnalyticsConfigMutation(
    (d: RuleDraft) => analyticsReportApi.createParentRule(d),
    "Đã thêm quy tắc",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, data }: { id: number; data: Partial<ParentRule> }) =>
      analyticsReportApi.updateParentRule(id, data),
    "Đã lưu quy tắc",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsReportApi.deleteParentRule(id),
    "Đã xoá quy tắc",
  );

  const startNew = () => {
    const maxPrio = rules.reduce((m, r) => Math.max(m, r.priority), 0);
    setDraft({
      matchType: "name_contains",
      pattern: "",
      parentName: "",
      priority: maxPrio + 10,
    });
    setEditing("new");
  };
  const startEdit = (r: ParentRule) => {
    setDraft({
      matchType: r.matchType,
      pattern: r.pattern,
      parentName: r.parentName,
      priority: r.priority,
    });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.pattern.trim() || !draft.parentName.trim()) return;
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") create.mutate(draft, done);
    else if (typeof editing === "number")
      update.mutate({ id: editing, data: draft }, done);
  };

  const editRow = (
    <tr className="bg-[#F4FBFC]">
      <td className="p-2 w-24">
        <input
          type="number"
          className={inputCls}
          value={draft.priority}
          onChange={(e) =>
            setDraft({ ...draft, priority: Number(e.target.value) })
          }
        />
      </td>
      <td className="p-2 w-44">
        <AnalyticsSelect
          options={MATCH_TYPE_OPTIONS}
          value={draft.matchType}
          onChange={(v) =>
            setDraft({ ...draft, matchType: v as RuleDraft["matchType"] })
          }
          className="w-full"
        />
      </td>
      <td className="p-2">
        <input
          className={inputCls}
          value={draft.pattern}
          onChange={(e) => setDraft({ ...draft, pattern: e.target.value })}
          placeholder="vd: Mixue / KH000123"
        />
      </td>
      <td className="p-2">
        <input
          className={inputCls}
          value={draft.parentName}
          onChange={(e) => setDraft({ ...draft, parentName: e.target.value })}
          placeholder="vd: Chuỗi Mixue"
        />
      </td>
      <td />
      <td className="p-2 text-right whitespace-nowrap">
        <button
          type="button"
          className={iconBtn}
          onClick={save}
          disabled={create.isPending || update.isPending}
          title="Lưu">
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

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tìm mẫu / khách cha…"
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px]">
            <Plus className="w-4 h-4" /> Thêm quy tắc
          </button>
        </div>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
              <tr>
                <th className="p-2 w-24">Thứ tự</th>
                <th className="p-2 w-44">Kiểu</th>
                <th className="p-2">Mẫu</th>
                <th className="p-2">Khách cha</th>
                <th className="p-2 w-16">Bật</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {editing === "new" && editRow}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    Đang tải…
                  </td>
                </tr>
              )}
              {rules.map((r) =>
                editing === r.id ? (
                  <Fragment key={r.id}>{editRow}</Fragment>
                ) : (
                  <tr
                    key={r.id}
                    className={`border-t ${r.isActive ? "" : "opacity-50"}`}>
                    <td className="p-2 dt-mono">{r.priority}</td>
                    <td className="p-2">
                      {r.matchType === "code"
                        ? "Mã khách là"
                        : "Tên khách chứa"}
                    </td>
                    <td className="p-2 font-medium">{r.pattern}</td>
                    <td className="p-2">{r.parentName}</td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={(e) =>
                          update.mutate({
                            id: r.id,
                            data: { isActive: e.target.checked },
                          })
                        }
                      />
                    </td>
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
                          window.confirm(
                            `Xoá quy tắc "${r.pattern}" → "${r.parentName}"?`,
                          ) && remove.mutate(r.id)
                        }>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-2 self-start">
        <div className="text-[13px] font-semibold">Thử quy tắc</div>
        <p className="text-[12px] text-gray-500">
          Nhập tên hoặc mã khách để xem khách được gộp vào khách cha nào (theo
          quy tắc đang bật).
        </p>
        <SearchBox
          value={preview}
          onChange={setPreview}
          placeholder="Tên / mã khách…"
        />
        <ul className="max-h-[420px] overflow-y-auto divide-y text-[12.5px]">
          {previewRows.map((r) => (
            <li key={r.code} className="py-1.5">
              <div className="font-medium">{r.name}</div>
              <div className="text-gray-500">
                {r.code} →{" "}
                <span className="text-[var(--dt-primary)] font-medium">
                  {r.parent_name}
                </span>
              </div>
            </li>
          ))}
          {preview.trim().length >= 2 && !previewRows.length && (
            <li className="py-2 text-gray-400">Không tìm thấy khách</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ── Team sale ─────────────────────────────────────────────────────────────────
type TeamDraft = {
  code: string;
  name: string;
  isSale: boolean;
  sortOrder: number;
};

function TeamsTab() {
  const { data: teams = [] } = useSaleTeams();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<TeamDraft>({
    code: "",
    name: "",
    isSale: true,
    sortOrder: 0,
  });

  const create = useAnalyticsConfigMutation(
    (d: TeamDraft) => analyticsReportApi.createTeam(d),
    "Đã thêm team",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, data }: { id: number; data: Partial<TeamDraft> }) =>
      analyticsReportApi.updateTeam(id, data),
    "Đã lưu team",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsReportApi.deleteTeam(id),
    "Đã xoá team",
  );

  const save = () => {
    if (!draft.name.trim() || (editing === "new" && !draft.code.trim())) return;
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") create.mutate(draft, done);
    else if (typeof editing === "number")
      update.mutate(
        {
          id: editing,
          data: {
            name: draft.name,
            isSale: draft.isSale,
            sortOrder: draft.sortOrder,
          },
        },
        done,
      );
  };

  const editRow = (isNew: boolean) => (
    <tr className="bg-[#F4FBFC]">
      <td className="p-2 w-32">
        {isNew ? (
          <input
            className={inputCls}
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            placeholder="vd: sale 6"
          />
        ) : (
          <span className="dt-mono">{draft.code}</span>
        )}
      </td>
      <td className="p-2">
        <input
          className={inputCls}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="vd: 6. Team mới"
        />
      </td>
      <td className="p-2 w-28">
        <input
          type="checkbox"
          checked={draft.isSale}
          onChange={(e) => setDraft({ ...draft, isSale: e.target.checked })}
        />
      </td>
      <td className="p-2 w-24">
        <input
          type="number"
          className={inputCls}
          value={draft.sortOrder}
          onChange={(e) =>
            setDraft({ ...draft, sortOrder: Number(e.target.value) })
          }
        />
      </td>
      <td />
      <td className="p-2 text-right whitespace-nowrap">
        <button type="button" className={iconBtn} onClick={save} title="Lưu">
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

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setDraft({
              code: "",
              name: "",
              isSale: true,
              sortOrder: (teams.at(-1)?.sortOrder ?? 0) + 1,
            });
            setEditing("new");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px]">
          <Plus className="w-4 h-4" /> Thêm team
        </button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
            <tr>
              <th className="p-2 w-32">Mã</th>
              <th className="p-2">Tên hiển thị</th>
              <th className="p-2 w-28">Tính là sale</th>
              <th className="p-2 w-24">Thứ tự</th>
              <th className="p-2 w-28">Nhân viên</th>
              <th className="p-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {editing === "new" && editRow(true)}
            {teams.map((t: SaleTeam) =>
              editing === t.id ? (
                <Fragment key={t.id}>{editRow(false)}</Fragment>
              ) : (
                <tr key={t.id} className="border-t">
                  <td className="p-2 dt-mono">{t.code}</td>
                  <td className="p-2 font-medium">{t.name}</td>
                  <td className="p-2">{t.isSale ? "Có" : "Không"}</td>
                  <td className="p-2 dt-mono">{t.sortOrder}</td>
                  <td className="p-2 dt-mono">{t._count?.members ?? 0}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className={iconBtn}
                      title="Sửa"
                      onClick={() => {
                        setDraft({
                          code: t.code,
                          name: t.name,
                          isSale: t.isSale,
                          sortOrder: t.sortOrder,
                        });
                        setEditing(t.id);
                      }}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      title="Xoá"
                      onClick={() =>
                        window.confirm(
                          `Xoá team "${t.name}"? Nhân viên trong team sẽ bị bỏ khỏi team.`,
                        ) && remove.mutate(t.id)
                      }>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Nhân viên theo team ───────────────────────────────────────────────────────
function MembersTab() {
  const [search, setSearch] = useState("");
  const { data: teams = [] } = useSaleTeams();
  const { data: members = [], isLoading } = useTeamMembers(search);
  const setMember = useAnalyticsConfigMutation(
    ({ userId, teamId }: { userId: number; teamId: number | null }) =>
      analyticsReportApi.setMember(userId, teamId),
    "Đã cập nhật team",
  );
  const teamOptions = teams.map((t) => ({
    value: String(t.id),
    label: t.isSale ? t.name : `${t.name} (không tính)`,
  }));

  return (
    <div className="space-y-2">
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Tìm tên / email nhân viên…"
      />
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
            <tr>
              <th className="p-2">Nhân viên</th>
              <th className="p-2">Email</th>
              <th className="p-2 w-64">Team</th>
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
            {members.map((m) => (
              <tr
                key={m.userId}
                className={`border-t ${m.isActive ? "" : "opacity-50"}`}>
                <td className="p-2 font-medium">
                  {m.name}
                  {!m.isActive && (
                    <span className="ml-1.5 text-[11px] text-gray-400">
                      (ngừng hoạt động)
                    </span>
                  )}
                </td>
                <td className="p-2 text-gray-500">{m.email}</td>
                <td className="p-2">
                  <FilterSearchableSelect
                    options={teamOptions}
                    value={m.teamId ? String(m.teamId) : ""}
                    onChange={(v) =>
                      setMember.mutate({
                        userId: m.userId,
                        teamId: v ? Number(v) : null,
                      })
                    }
                    placeholder="— Không thuộc team —"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Nhóm hàng 2026 ────────────────────────────────────────────────────────────
const GROUP_OPTIONS = [
  "Nhóm A",
  "Nhóm B",
  "Nhóm C",
  "Nhóm D",
  "Chưa Phân Loại",
].map((g) => ({ value: g, label: g }));

function ProductGroupsTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = useProductGroups({ search, page, limit });
  const [newCode, setNewCode] = useState("");
  const [newGroup, setNewGroup] = useState("Nhóm A");

  const create = useAnalyticsConfigMutation(
    (d: { productCode: string; groupName: string }) =>
      analyticsReportApi.createProductGroup(d),
    "Đã thêm mã hàng",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, groupName }: { id: number; groupName: string }) =>
      analyticsReportApi.updateProductGroup(id, groupName),
    "Đã đổi nhóm",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsReportApi.deleteProductGroup(id),
    "Đã xoá mã hàng",
  );
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Tìm mã / tên hàng / nhóm…"
        />
        <div className="flex-1" />
        <input
          className={`${inputCls} w-36`}
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Mã hàng"
        />
        <div className="w-40">
          <FilterSearchableSelect
            options={GROUP_OPTIONS}
            value={newGroup}
            onChange={(v) => setNewGroup(v || "Nhóm A")}
            showClearOption={false}
          />
        </div>
        <button
          type="button"
          disabled={!newCode.trim() || create.isPending}
          onClick={() =>
            create.mutate(
              { productCode: newCode.trim(), groupName: newGroup },
              { onSuccess: () => setNewCode("") },
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px] disabled:opacity-50">
          <Plus className="w-4 h-4" /> Thêm
        </button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
            <tr>
              <th className="p-2 w-36">Mã hàng</th>
              <th className="p-2">Tên hàng</th>
              <th className="p-2 w-48">Nhóm 2026</th>
              <th className="p-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {data?.data.map((g: ProductGroupRow) => (
              <tr key={g.id} className="border-t">
                <td className="p-2 dt-mono">{g.productCode}</td>
                <td className="p-2">
                  {g.productName ?? (
                    <span className="text-gray-400">(không tìm thấy hàng)</span>
                  )}
                </td>
                <td className="p-2">
                  <FilterSearchableSelect
                    options={GROUP_OPTIONS}
                    value={g.groupName}
                    onChange={(v) =>
                      v &&
                      v !== g.groupName &&
                      update.mutate({ id: g.id, groupName: v })
                    }
                    showClearOption={false}
                    allowDeselect={false}
                  />
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    className={iconBtn}
                    title="Xoá"
                    onClick={() =>
                      window.confirm(
                        `Xoá ${g.productCode} khỏi bảng nhóm hàng 2026?`,
                      ) && remove.mutate(g.id)
                    }>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
