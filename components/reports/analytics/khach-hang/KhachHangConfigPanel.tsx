"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  analyticsKhachHangApi,
  type KhListKey,
  type KhSalePic,
  type KhSaleRepRule,
} from "@/lib/api/analytics-khach-hang";
import { useAnalyticsConfigMutation } from "@/lib/hooks/useAnalyticsReports";
import {
  useKhCustomerList,
  useKhSalePics,
  useKhSaleRepRules,
} from "@/lib/hooks/useAnalyticsKhachHang";

// Màn cấu hình của báo cáo Phân tích › Khách Hàng (thay Excel dim_customer_key và
// các quy tắc viết cứng trong DAX). Tự gọi API; gắn vào trang Cấu hình.

type Tab = KhListKey | "sale_pics" | "sale_reps";

const TABS: { key: Tab; label: string; hint: string }[] = [
  {
    key: "key_persale",
    label: "Khách Key PerSale",
    hint: "Thay file Excel dim_customer_key (SharePoint). Khách có mã trong danh sách (hoặc mã bỏ đuôi “.1”) được tính vào DS Key PerSale.",
  },
  {
    key: "vip_layer2",
    label: "Khách VIP (lớp 2)",
    hint: "Các dòng dim_customer_key có cột is_customer_vip. Khách có mã trong danh sách (hoặc mã bỏ đuôi “.1”) được tính vào Doanh Số VIP.",
  },
  {
    key: "demand_maycha",
    label: "Khách theo dõi Demand",
    hint: "Khách hiển thị ở trang Demand (dim_customers[is_customer_maycha]). So khớp đúng mã khách.",
  },
  {
    key: "internal_customers",
    label: "Khách nội bộ",
    hint: "Bỏ qua khi tính ngày bán đầu tiên của sản phẩm (bộ lọc Giai đoạn SP mới).",
  },
  {
    key: "sale_pics",
    label: "Sale phụ trách",
    hint: "Nhóm khách POS dùng làm “sale phụ trách” (sale_pic) và team tương ứng (bảng Retention theo nhóm sale). Khách thuộc nhiều nhóm sẽ ghép tên, không gán team.",
  },
  {
    key: "sale_reps",
    label: "Sale đại diện",
    hint: "Quy tắc sale đại diện của khách (cột Sale Phụ Trách ở trang Repeat): xét theo thứ tự nhỏ trước, khớp sale phụ trách + loại khách + vùng (để trống = mọi giá trị); không khớp → “noname”.",
  },
];

const inputCls =
  "w-full border rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";
const thCls = "px-2.5 py-2 text-left font-semibold text-[12px]";

export function KhachHangConfigPanel() {
  const [tab, setTab] = useState<Tab>("key_persale");
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
        {tab === "sale_pics" ? (
          <SalePicsTab />
        ) : tab === "sale_reps" ? (
          <SaleRepsTab />
        ) : (
          <CustomerListTab key={tab} listKey={tab} />
        )}
      </div>
    </div>
  );
}

function TableBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border rounded-lg overflow-auto max-h-[520px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  );
}

// ── Danh sách mã khách ──────────────────────────────────────────────────────
function CustomerListTab({ listKey }: { listKey: KhListKey }) {
  const { data: rows = [], isLoading } = useKhCustomerList(listKey);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const add = useAnalyticsConfigMutation(
    () =>
      analyticsKhachHangApi.addCustomerList({
        listKey,
        customerCode: code.trim(),
        note: note.trim() || undefined,
      }),
    "Đã thêm khách",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsKhachHangApi.deleteCustomerList(id),
    "Đã xoá khách",
  );
  const q = search.trim().toLowerCase();
  const list = q
    ? rows.filter(
        (r) =>
          r.customerCode.toLowerCase().includes(q) ||
          (r.customerName ?? "").toLowerCase().includes(q),
      )
    : rows;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} max-w-[200px]`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã khách, vd KH000274"
        />
        <input
          className={`${inputCls} max-w-[260px]`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (tuỳ chọn)"
        />
        <button
          type="button"
          disabled={!code.trim() || add.isPending}
          onClick={() =>
            add.mutate(undefined, {
              onSuccess: () => {
                setCode("");
                setNote("");
              },
            })
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--dt-primary)" }}>
          <Plus className="w-4 h-4" />
          Thêm
        </button>
        <div className="flex-1" />
        <input
          className={`${inputCls} max-w-[240px]`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm mã / tên khách"
        />
      </div>
      <TableBox>
        <thead style={{ background: "#F3F8F9" }}>
          <tr>
            <th className={thCls}>Mã khách</th>
            <th className={thCls}>Tên khách (POS)</th>
            <th className={thCls}>Ghi chú</th>
            <th className="w-12" />
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
          {!isLoading && !list.length && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-400">
                Chưa có khách
              </td>
            </tr>
          )}
          {list.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-2.5 py-1.5 dt-mono">{r.customerCode}</td>
              <td className="px-2.5 py-1.5">
                {r.customerName ?? ""}
                {!r.inPos && (
                  <span className="ml-1.5 text-[11.5px] text-amber-600">
                    (chưa có mã này trong POS)
                  </span>
                )}
              </td>
              <td className="px-2.5 py-1.5 text-gray-500">{r.note ?? ""}</td>
              <td className="px-2 py-1 text-right">
                <button
                  type="button"
                  className={iconBtn}
                  title="Xoá"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Xoá ${r.customerCode} khỏi danh sách?`))
                      remove.mutate(r.id);
                  }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableBox>
      <p className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
        {rows.length} khách
      </p>
    </div>
  );
}

// ── Sale phụ trách ──────────────────────────────────────────────────────────
type PicDraft = Omit<KhSalePic, "id">;

function SalePicsTab() {
  const { data: rows = [] } = useKhSalePics();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<PicDraft>({
    groupName: "",
    teamName: "",
    sortOrder: 0,
  });
  const create = useAnalyticsConfigMutation(
    (d: PicDraft) => analyticsKhachHangApi.createSalePic(d),
    "Đã thêm",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, d }: { id: number; d: PicDraft }) =>
      analyticsKhachHangApi.updateSalePic(id, d),
    "Đã lưu",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsKhachHangApi.deleteSalePic(id),
    "Đã xoá",
  );
  const save = () => {
    if (!draft.groupName.trim()) return;
    const d = { ...draft, teamName: draft.teamName?.trim() || null };
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") create.mutate(d, done);
    else if (typeof editing === "number")
      update.mutate({ id: editing, d }, done);
  };
  const editCells = (
    <>
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
      <td className="p-2">
        <input
          className={inputCls}
          value={draft.groupName}
          onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}
          placeholder="Tên nhóm khách POS, vd thanhptp"
        />
      </td>
      <td className="p-2">
        <input
          className={inputCls}
          value={draft.teamName ?? ""}
          onChange={(e) => setDraft({ ...draft, teamName: e.target.value })}
          placeholder="vd Team Sale 1"
        />
      </td>
      <td className="p-2 whitespace-nowrap text-right">
        <button type="button" className={iconBtn} onClick={save}>
          <Check className="w-4 h-4 text-[var(--dt-primary)]" />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setEditing(null)}>
          <X className="w-4 h-4" />
        </button>
      </td>
    </>
  );
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setDraft({
            groupName: "",
            teamName: "",
            sortOrder: rows.reduce((m, r) => Math.max(m, r.sortOrder), 0) + 1,
          });
          setEditing("new");
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
        style={{ background: "var(--dt-primary)" }}>
        <Plus className="w-4 h-4" />
        Thêm nhóm
      </button>
      <TableBox>
        <thead style={{ background: "#F3F8F9" }}>
          <tr>
            <th className={thCls}>Thứ tự</th>
            <th className={thCls}>Nhóm khách (sale phụ trách)</th>
            <th className={thCls}>Team</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
            <tr className="bg-[#F4FBFC] border-t">{editCells}</tr>
          )}
          {rows.map((r) =>
            editing === r.id ? (
              <tr key={r.id} className="bg-[#F4FBFC] border-t">
                {editCells}
              </tr>
            ) : (
              <tr key={r.id} className="border-t">
                <td className="px-2.5 py-1.5">{r.sortOrder}</td>
                <td className="px-2.5 py-1.5 font-medium">{r.groupName}</td>
                <td className="px-2.5 py-1.5">{r.teamName ?? ""}</td>
                <td className="px-2 py-1 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      setDraft({
                        groupName: r.groupName,
                        teamName: r.teamName ?? "",
                        sortOrder: r.sortOrder,
                      });
                      setEditing(r.id);
                    }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      if (confirm(`Xoá nhóm ${r.groupName}?`))
                        remove.mutate(r.id);
                    }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </TableBox>
    </div>
  );
}

// ── Quy tắc sale đại diện ───────────────────────────────────────────────────
type RepDraft = Omit<KhSaleRepRule, "id">;

function SaleRepsTab() {
  const { data: rows = [] } = useKhSaleRepRules();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<RepDraft>({
    salePic: "",
    customerType: null,
    region: null,
    saleRep: "",
    priority: 0,
  });
  const create = useAnalyticsConfigMutation(
    (d: RepDraft) => analyticsKhachHangApi.createSaleRepRule(d),
    "Đã thêm quy tắc",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, d }: { id: number; d: RepDraft }) =>
      analyticsKhachHangApi.updateSaleRepRule(id, d),
    "Đã lưu quy tắc",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsKhachHangApi.deleteSaleRepRule(id),
    "Đã xoá quy tắc",
  );
  const save = () => {
    if (!draft.salePic.trim() || !draft.saleRep.trim()) return;
    const d = {
      ...draft,
      customerType: draft.customerType?.trim() || null,
      region: draft.region?.trim() || null,
    };
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new") create.mutate(d, done);
    else if (typeof editing === "number")
      update.mutate({ id: editing, d }, done);
  };
  const field = (k: keyof RepDraft, placeholder: string, type = "text") => (
    <input
      type={type}
      className={inputCls}
      value={(draft[k] as string | number | null) ?? ""}
      placeholder={placeholder}
      onChange={(e) =>
        setDraft({
          ...draft,
          [k]: type === "number" ? Number(e.target.value) : e.target.value,
        })
      }
    />
  );
  const editCells = (
    <>
      <td className="p-2 w-24">{field("priority", "", "number")}</td>
      <td className="p-2">{field("salePic", "vd thanhptp")}</td>
      <td className="p-2">{field("customerType", "Mọi loại khách")}</td>
      <td className="p-2">{field("region", "Mọi vùng")}</td>
      <td className="p-2">{field("saleRep", "vd tranglt")}</td>
      <td className="p-2 whitespace-nowrap text-right">
        <button type="button" className={iconBtn} onClick={save}>
          <Check className="w-4 h-4 text-[var(--dt-primary)]" />
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={() => setEditing(null)}>
          <X className="w-4 h-4" />
        </button>
      </td>
    </>
  );
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setDraft({
            salePic: "",
            customerType: null,
            region: null,
            saleRep: "",
            priority: rows.reduce((m, r) => Math.max(m, r.priority), 0) + 10,
          });
          setEditing("new");
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
        style={{ background: "var(--dt-primary)" }}>
        <Plus className="w-4 h-4" />
        Thêm quy tắc
      </button>
      <TableBox>
        <thead style={{ background: "#F3F8F9" }}>
          <tr>
            <th className={thCls}>Thứ tự</th>
            <th className={thCls}>Sale phụ trách</th>
            <th className={thCls}>Loại khách</th>
            <th className={thCls}>Vùng</th>
            <th className={thCls}>Sale đại diện</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {editing === "new" && (
            <tr className="bg-[#F4FBFC] border-t">{editCells}</tr>
          )}
          {rows.map((r) =>
            editing === r.id ? (
              <tr key={r.id} className="bg-[#F4FBFC] border-t">
                {editCells}
              </tr>
            ) : (
              <tr key={r.id} className="border-t">
                <td className="px-2.5 py-1.5">{r.priority}</td>
                <td className="px-2.5 py-1.5 font-medium">{r.salePic}</td>
                <td className="px-2.5 py-1.5">{r.customerType ?? "(mọi)"}</td>
                <td className="px-2.5 py-1.5">{r.region ?? "(mọi)"}</td>
                <td className="px-2.5 py-1.5">{r.saleRep}</td>
                <td className="px-2 py-1 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      setDraft({
                        salePic: r.salePic,
                        customerType: r.customerType,
                        region: r.region,
                        saleRep: r.saleRep,
                        priority: r.priority,
                      });
                      setEditing(r.id);
                    }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    onClick={() => {
                      if (confirm("Xoá quy tắc này?")) remove.mutate(r.id);
                    }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </TableBox>
    </div>
  );
}
