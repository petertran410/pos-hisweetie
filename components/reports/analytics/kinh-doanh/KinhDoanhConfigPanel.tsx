"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  analyticsKdConfigApi as api,
  type KdDlclColumn,
} from "@/lib/api/analytics-kinh-doanh";
import { useAnalyticsConfigMutation } from "@/lib/hooks/useAnalyticsReports";
import { VISUAL_GROUPS } from "./kdConstants";
import { ViewTabs } from "./KdUi";

// Cấu hình cho Phân tích › Kinh Doanh (thay các bảng "Enter data" / Excel của Power BI):
//  - Chỉ tiêu tháng theo nhóm hàng hiển thị (kpi_product_group_2025)
//  - Khách KEY PerSale / VIP (dim_customer_key)
//  - Cột khách ĐLCL Lermao (field parameter KHCL Lermao)
//  - Vị mứt Lermao / Boduo (dim_boduo_lermao)
// Tự gọi API; phần khung gắn vào trang Cấu hình.

type Tab = "targets" | "keys" | "dlcl" | "jam";
const KEY = ["reports", "analytics", "kinh-doanh", "config"] as const;
const inputCls = "border rounded-md px-2 py-1 text-[12.5px]";
const btnCls =
  "inline-flex items-center gap-1 text-[12.5px] font-medium px-2.5 py-1 rounded-md text-white";

export function KinhDoanhConfigPanel() {
  const [tab, setTab] = useState<Tab>("targets");
  return (
    <div className="dt-panel p-4 space-y-3">
      <div className="text-[14.5px] font-bold">Cấu hình báo cáo Kinh Doanh</div>
      <ViewTabs
        value={tab}
        onChange={setTab}
        options={[
          { key: "targets", label: "Chỉ tiêu nhóm hàng" },
          { key: "keys", label: "Khách KEY / VIP" },
          { key: "dlcl", label: "Cột khách ĐLCL Lermao" },
          { key: "jam", label: "Vị mứt Lermao / Boduo" },
        ]}
      />
      {tab === "targets" && <TargetsTab />}
      {tab === "keys" && <KeysTab />}
      {tab === "dlcl" && <DlclTab />}
      {tab === "jam" && <JamTab />}
    </div>
  );
}

function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="border rounded-lg overflow-auto max-h-[460px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0" style={{ background: "#F3F8F9" }}>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="px-2.5 py-2 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="p-1 rounded hover:bg-red-50 text-red-500"
      onClick={() => confirm("Xoá dòng này?") && onClick()}>
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function TargetsTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data = [] } = useQuery({
    queryKey: [...KEY, "targets", year],
    queryFn: () => api.listVisualTargets(year),
  });
  const save = useAnalyticsConfigMutation(
    api.upsertVisualTarget,
    "Đã lưu chỉ tiêu",
  );
  const upd = useAnalyticsConfigMutation(
    (a: { id: number; v: number }) => api.updateVisualTarget(a.id, a.v),
    "Đã cập nhật",
  );
  const del = useAnalyticsConfigMutation(api.deleteVisualTarget, "Đã xoá");
  const [f, setF] = useState({
    visualProductGroup: VISUAL_GROUPS[0],
    month: 1,
    kpiValue: "",
  });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          className={`${inputCls} w-24`}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <span className="text-[12px] text-gray-500">Thêm / sửa:</span>
        <select
          className={inputCls}
          value={f.visualProductGroup}
          onChange={(e) => setF({ ...f, visualProductGroup: e.target.value })}>
          {VISUAL_GROUPS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          className={inputCls}
          value={f.month}
          onChange={(e) => setF({ ...f, month: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Tháng {i + 1}
            </option>
          ))}
        </select>
        <input
          className={`${inputCls} w-40`}
          placeholder="Chỉ tiêu (VNĐ)"
          value={f.kpiValue}
          onChange={(e) =>
            setF({ ...f, kpiValue: e.target.value.replace(/[^\d]/g, "") })
          }
        />
        <button
          type="button"
          className={btnCls}
          style={{ background: "var(--dt-primary)" }}
          disabled={!f.kpiValue}
          onClick={() =>
            save.mutate({
              visualProductGroup: f.visualProductGroup,
              year,
              month: f.month,
              kpiValue: Number(f.kpiValue),
            })
          }>
          <Plus className="w-3.5 h-3.5" /> Lưu
        </button>
      </div>
      <Table head={["Nhóm hàng", "Tháng", "Chỉ tiêu tháng", ""]}>
        {data.map((t) => (
          <tr key={t.id} className="border-t">
            <td className="px-2.5 py-1">{t.visualProductGroup}</td>
            <td className="px-2.5 py-1">
              {t.month}/{t.year}
            </td>
            <td className="px-2.5 py-1">
              <input
                className={`${inputCls} w-40 text-right`}
                defaultValue={t.kpiValue.toLocaleString("vi-VN")}
                onBlur={(e) => {
                  const v = Number(e.target.value.replace(/[^\d]/g, ""));
                  if (v !== t.kpiValue) upd.mutate({ id: t.id, v });
                }}
              />
            </td>
            <td className="px-2.5 py-1 text-right">
              <DelBtn onClick={() => del.mutate(t.id)} />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function KeysTab() {
  const { data = [] } = useQuery({
    queryKey: [...KEY, "keys"],
    queryFn: api.listCustomerKeys,
  });
  const add = useAnalyticsConfigMutation(
    api.createCustomerKey,
    "Đã thêm khách",
  );
  const upd = useAnalyticsConfigMutation(
    (a: { id: number; v: boolean }) => api.updateCustomerKey(a.id, a.v),
    "Đã cập nhật",
  );
  const del = useAnalyticsConfigMutation(api.deleteCustomerKey, "Đã xoá");
  const [code, setCode] = useState("");
  const [vip, setVip] = useState(false);
  return (
    <div className="space-y-2">
      <div className="text-[12px] text-gray-500">
        Khách KEY PerSale (DS Key PerSale, nhóm KEY Sale 1–5); đánh dấu VIP để
        tính “Doanh Số VIP”. Mã có hậu tố “.1” tự khớp mã gốc.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-40`}
          placeholder="Mã khách"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <label className="text-[12.5px] inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={vip}
            onChange={(e) => setVip(e.target.checked)}
          />{" "}
          VIP
        </label>
        <button
          type="button"
          className={btnCls}
          style={{ background: "var(--dt-primary)" }}
          disabled={!code.trim()}
          onClick={() => add.mutate({ customerCode: code.trim(), isVip: vip })}>
          <Plus className="w-3.5 h-3.5" /> Thêm
        </button>
        <span className="text-[12px] text-gray-500">{data.length} khách</span>
      </div>
      <Table head={["Mã khách", "Tên khách", "VIP", ""]}>
        {data.map((k) => (
          <tr key={k.id} className="border-t">
            <td className="px-2.5 py-1 dt-mono">{k.customerCode}</td>
            <td className="px-2.5 py-1">
              {k.customerName ?? (
                <i className="text-gray-400">không tìm thấy</i>
              )}
            </td>
            <td className="px-2.5 py-1">
              <input
                type="checkbox"
                checked={k.isVip}
                onChange={(e) => upd.mutate({ id: k.id, v: e.target.checked })}
              />
            </td>
            <td className="px-2.5 py-1 text-right">
              <DelBtn onClick={() => del.mutate(k.id)} />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function DlclTab() {
  const { data = [] } = useQuery({
    queryKey: [...KEY, "dlcl"],
    queryFn: api.listDlclColumns,
  });
  const add = useAnalyticsConfigMutation(api.createDlclColumn, "Đã thêm cột");
  const upd = useAnalyticsConfigMutation(
    (a: { id: number; d: Partial<Omit<KdDlclColumn, "id">> }) =>
      api.updateDlclColumn(a.id, a.d),
    "Đã cập nhật",
  );
  const del = useAnalyticsConfigMutation(api.deleteDlclColumn, "Đã xoá");
  const [f, setF] = useState({ label: "", codes: "" });
  const codes = (s: string) =>
    s
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  return (
    <div className="space-y-2">
      <div className="text-[12px] text-gray-500">
        Mỗi cột của bảng “Tình Hình Mua Hàng Của ĐLCL” = 1 khách (hoặc nhiều
        mã). Khớp khi mã khách CHỨA mã nhập (giống Power BI).
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-44`}
          placeholder="Tên cột"
          value={f.label}
          onChange={(e) => setF({ ...f, label: e.target.value })}
        />
        <input
          className={`${inputCls} w-72`}
          placeholder="Mã khách (cách nhau dấu phẩy)"
          value={f.codes}
          onChange={(e) => setF({ ...f, codes: e.target.value })}
        />
        <button
          type="button"
          className={btnCls}
          style={{ background: "var(--dt-primary)" }}
          disabled={!f.label.trim() || !codes(f.codes).length}
          onClick={() =>
            add.mutate({
              label: f.label.trim(),
              customerCodes: codes(f.codes),
              sortOrder: data.length,
            })
          }>
          <Plus className="w-3.5 h-3.5" /> Thêm
        </button>
      </div>
      <Table head={["Thứ tự", "Tên cột", "Mã khách", ""]}>
        {data.map((c) => (
          <tr key={c.id} className="border-t">
            <td className="px-2.5 py-1">
              <input
                type="number"
                className={`${inputCls} w-16`}
                defaultValue={c.sortOrder}
                onBlur={(e) =>
                  Number(e.target.value) !== c.sortOrder &&
                  upd.mutate({
                    id: c.id,
                    d: { sortOrder: Number(e.target.value) },
                  })
                }
              />
            </td>
            <td className="px-2.5 py-1">
              <input
                className={`${inputCls} w-44`}
                defaultValue={c.label}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== c.label &&
                  upd.mutate({ id: c.id, d: { label: e.target.value.trim() } })
                }
              />
            </td>
            <td className="px-2.5 py-1">
              <input
                className={`${inputCls} w-72`}
                defaultValue={c.customerCodes.join(", ")}
                onBlur={(e) => {
                  const v = codes(e.target.value);
                  if (v.length && v.join(",") !== c.customerCodes.join(","))
                    upd.mutate({ id: c.id, d: { customerCodes: v } });
                }}
              />
            </td>
            <td className="px-2.5 py-1 text-right">
              <DelBtn onClick={() => del.mutate(c.id)} />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function JamTab() {
  const { data = [] } = useQuery({
    queryKey: [...KEY, "jam"],
    queryFn: api.listJamFlavors,
  });
  const add = useAnalyticsConfigMutation(api.createJamFlavor, "Đã lưu");
  const upd = useAnalyticsConfigMutation(
    (a: { id: number; d: { brand?: string; jamFlavor?: string } }) =>
      api.updateJamFlavor(a.id, a.d),
    "Đã cập nhật",
  );
  const del = useAnalyticsConfigMutation(api.deleteJamFlavor, "Đã xoá");
  const [f, setF] = useState({
    productCode: "",
    brand: "Lermao",
    jamFlavor: "",
  });
  return (
    <div className="space-y-2">
      <div className="text-[12px] text-gray-500">
        Dùng cho bảng “So sánh theo vị mứt” ở trang Đối Thủ.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} w-36`}
          placeholder="Mã hàng"
          value={f.productCode}
          onChange={(e) => setF({ ...f, productCode: e.target.value })}
        />
        <select
          className={inputCls}
          value={f.brand}
          onChange={(e) => setF({ ...f, brand: e.target.value })}>
          <option>Lermao</option>
          <option>Boduo</option>
        </select>
        <input
          className={`${inputCls} w-44`}
          placeholder="Vị mứt"
          value={f.jamFlavor}
          onChange={(e) => setF({ ...f, jamFlavor: e.target.value })}
        />
        <button
          type="button"
          className={btnCls}
          style={{ background: "var(--dt-primary)" }}
          disabled={!f.productCode.trim() || !f.jamFlavor.trim()}
          onClick={() =>
            add.mutate({
              productCode: f.productCode.trim(),
              brand: f.brand,
              jamFlavor: f.jamFlavor.trim(),
            })
          }>
          <Plus className="w-3.5 h-3.5" /> Lưu
        </button>
      </div>
      <Table head={["Mã hàng", "Tên hàng", "Thương hiệu", "Vị mứt", ""]}>
        {data.map((j) => (
          <tr key={j.id} className="border-t">
            <td className="px-2.5 py-1 dt-mono">{j.productCode}</td>
            <td className="px-2.5 py-1">
              {j.productName ?? <i className="text-gray-400">không tìm thấy</i>}
            </td>
            <td className="px-2.5 py-1">
              <select
                className={inputCls}
                defaultValue={j.brand}
                onChange={(e) =>
                  upd.mutate({ id: j.id, d: { brand: e.target.value } })
                }>
                <option>Lermao</option>
                <option>Boduo</option>
              </select>
            </td>
            <td className="px-2.5 py-1">
              <input
                className={`${inputCls} w-40`}
                defaultValue={j.jamFlavor}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== j.jamFlavor &&
                  upd.mutate({
                    id: j.id,
                    d: { jamFlavor: e.target.value.trim() },
                  })
                }
              />
            </td>
            <td className="px-2.5 py-1 text-right">
              <DelBtn onClick={() => del.mutate(j.id)} />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
