"use client";

import { Fragment, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { FilterSearchableSelect } from "@/components/ui/filters";
import {
  analyticsDlclApi,
  type DistributorInput,
  type StrategicDistributor,
  type StrategicProgram,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { useAnalyticsConfigMutation } from "@/lib/hooks/useAnalyticsReports";
import {
  useStrategicDistributors,
  useStrategicPrograms,
} from "@/lib/hooks/useAnalyticsKhachHangDlcl";

const inputCls =
  "w-full border rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const iconBtn =
  "p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-40";

/** Mô tả từng chương trình trên màn cấu hình. */
const PROGRAM_HINT: Record<string, string> = {
  lermao:
    "Trang ĐLCL Lermao: mỗi đại lý là 1 cột sản lượng. Mã khách so khớp kiểu “mã khách CHỨA chuỗi” (như Power BI), nhiều mã cách nhau dấu phẩy.",
  "mut-lermao":
    "Trang ĐLCL Mứt Lermao: khách thuộc nhóm khách bên dưới, mọi mặt hàng.",
  boduo:
    "Trang ĐLCL Boduo: khách thuộc nhóm khách + ngành hàng / thương hiệu bên dưới.",
  "phuong-hoang":
    "Trang ĐLCL Phượng Hoàng: khách thuộc nhóm khách + ngành hàng / thương hiệu bên dưới.",
  internal:
    "Khách nội bộ: bỏ qua khi tính ngày bán đầu tiên của sản phẩm (bộ lọc “Giai đoạn SP” — Mới / Giai đoạn 2 / 3…). So khớp đúng mã.",
};

/**
 * Cấu hình các trang ĐLCL (Phân tích › Khách Hàng): chương trình đại lý chiến lược
 * (nhóm khách, ngành hàng, thương hiệu) và danh sách đại lý / khách nội bộ.
 * Thay các mã khách viết cứng trong DAX của Power BI.
 */
export function KhachHangDlclConfigPanel() {
  const { data, isLoading } = useStrategicPrograms();
  const programs = data?.programs ?? [];
  const [code, setCode] = useState<string>("lermao");
  const current = programs.find((p) => p.code === code) ?? programs[0];

  return (
    <div className="dt-panel">
      <div
        className="flex flex-wrap gap-1 px-4 pt-3 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
        {programs.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => setCode(p.code)}
            className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ${
              current?.code === p.code
                ? "border-[var(--dt-primary)] text-[var(--dt-primary)]"
                : "border-transparent text-gray-500"
            }`}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-4">
        {isLoading && <p className="text-[13px] text-gray-400">Đang tải…</p>}
        {!isLoading && !programs.length && (
          <p className="text-[13px] text-red-600">
            Chưa có bảng cấu hình ĐLCL (analytics_strategic_programs). Cần chạy
            khach-hang-dlcl-tables.sql và seed.
          </p>
        )}
        {current && data && (
          <>
            <p
              className="text-[12.5px]"
              style={{ color: "var(--dt-text-muted)" }}>
              {PROGRAM_HINT[current.code] ?? ""}
            </p>
            {current.code !== "internal" && (
              <ProgramForm
                key={`${current.code}|${current.customerGroupName}|${current.productType}|${current.brand}`}
                program={current}
                customerGroups={data.customerGroups}
                productTypes={data.productTypes}
                brands={data.brands}
              />
            )}
            {(current.code === "lermao" || current.code === "internal") && (
              <DistributorTable
                program={current.code}
                single={current.code === "internal"}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Chương trình: nhóm khách / ngành hàng / thương hiệu ──────────────────────
function ProgramForm({
  program,
  customerGroups,
  productTypes,
  brands,
}: {
  program: StrategicProgram;
  customerGroups: string[];
  productTypes: string[];
  brands: string[];
}) {
  const [draft, setDraft] = useState({
    customerGroupName: program.customerGroupName ?? "",
    productType: program.productType ?? "",
    brand: program.brand ?? "",
  });
  const save = useAnalyticsConfigMutation(
    () =>
      analyticsDlclApi.updateProgram(program.code, {
        customerGroupName: draft.customerGroupName || null,
        productType: draft.productType || null,
        brand: draft.brand || null,
      }),
    "Đã lưu chương trình",
  );
  const dirty =
    draft.customerGroupName !== (program.customerGroupName ?? "") ||
    draft.productType !== (program.productType ?? "") ||
    draft.brand !== (program.brand ?? "");
  const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] items-end">
      <label className="space-y-1 text-[12px] text-gray-500">
        <span>Nhóm khách (khách thuộc chương trình)</span>
        <FilterSearchableSelect
          options={opts(customerGroups)}
          value={draft.customerGroupName}
          onChange={(v) => setDraft({ ...draft, customerGroupName: v })}
          placeholder="Không lọc nhóm khách"
        />
      </label>
      <label className="space-y-1 text-[12px] text-gray-500">
        <span>Ngành hàng</span>
        <FilterSearchableSelect
          options={opts(productTypes)}
          value={draft.productType}
          onChange={(v) => setDraft({ ...draft, productType: v })}
          placeholder="Mọi ngành hàng"
        />
      </label>
      <label className="space-y-1 text-[12px] text-gray-500">
        <span>Thương hiệu</span>
        <FilterSearchableSelect
          options={opts(brands)}
          value={draft.brand}
          onChange={(v) => setDraft({ ...draft, brand: v })}
          placeholder="Mọi thương hiệu"
        />
      </label>
      <button
        type="button"
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate(undefined)}
        className="px-4 py-2 rounded-lg bg-brand text-white text-[13px] disabled:opacity-40">
        Lưu
      </button>
    </div>
  );
}

// ── Danh sách đại lý / khách nội bộ ──────────────────────────────────────────
type Draft = {
  name: string;
  codes: string;
  matchAll: boolean;
  sortOrder: number;
};

const toCodes = (s: string) =>
  s
    .split(/[,;\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

function DistributorTable({
  program,
  single,
}: {
  program: string;
  single: boolean;
}) {
  const { data: rows = [], isLoading } = useStrategicDistributors(program);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    codes: "",
    matchAll: false,
    sortOrder: 0,
  });

  const create = useAnalyticsConfigMutation(
    (d: DistributorInput) => analyticsDlclApi.createDistributor(d),
    "Đã thêm",
  );
  const update = useAnalyticsConfigMutation(
    ({ id, data }: { id: number; data: Partial<DistributorInput> }) =>
      analyticsDlclApi.updateDistributor(id, data),
    "Đã lưu",
  );
  const remove = useAnalyticsConfigMutation(
    (id: number) => analyticsDlclApi.deleteDistributor(id),
    "Đã xoá",
  );

  const startNew = () => {
    const max = rows.reduce((m, r) => Math.max(m, r.sortOrder), -1);
    setDraft({ name: "", codes: "", matchAll: false, sortOrder: max + 1 });
    setEditing("new");
  };
  const startEdit = (r: StrategicDistributor) => {
    setDraft({
      name: r.name,
      codes: r.customerCodes.join(", "),
      matchAll: r.matchAll,
      sortOrder: r.sortOrder,
    });
    setEditing(r.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    const body = {
      name: draft.name.trim(),
      customerCodes: draft.matchAll ? [] : toCodes(draft.codes),
      matchAll: draft.matchAll,
      sortOrder: draft.sortOrder,
    };
    const done = { onSuccess: () => setEditing(null) };
    if (editing === "new")
      create.mutate({ ...body, programCode: program }, done);
    else if (typeof editing === "number")
      update.mutate({ id: editing, data: body }, done);
  };

  const editRow = (
    <tr className="bg-[#F4FBFC] align-top">
      {!single && (
        <td className="p-2 w-20">
          <input
            type="number"
            className={inputCls}
            value={draft.sortOrder}
            onChange={(e) =>
              setDraft({ ...draft, sortOrder: Number(e.target.value) })
            }
          />
        </td>
      )}
      <td className="p-2 w-48">
        <input
          className={inputCls}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Tên cột, vd: Freddo"
        />
      </td>
      <td className="p-2">
        {draft.matchAll ? (
          <span className="text-[12.5px] text-gray-500">Tất cả khách</span>
        ) : (
          <textarea
            rows={2}
            className={inputCls}
            value={draft.codes}
            onChange={(e) => setDraft({ ...draft, codes: e.target.value })}
            placeholder="KH001042, KH005623"
          />
        )}
        {!single && (
          <label className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500">
            <input
              type="checkbox"
              checked={draft.matchAll}
              onChange={(e) =>
                setDraft({ ...draft, matchAll: e.target.checked })
              }
            />
            Cột “Tất cả khách”
          </label>
        )}
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
    <div className="space-y-2">
      {!single && (
        <div className="flex items-center">
          <div className="text-[13px] font-semibold">Các cột đại lý</div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px]">
            <Plus className="w-4 h-4" /> Thêm đại lý
          </button>
        </div>
      )}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-left text-[12px] text-gray-500">
            <tr>
              {!single && <th className="p-2 w-20">Thứ tự</th>}
              <th className="p-2 w-48">Tên</th>
              <th className="p-2">Mã khách → khách khớp</th>
              <th className="p-2 w-16">Bật</th>
              <th className="p-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {editing === "new" && editRow}
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  Đang tải…
                </td>
              </tr>
            )}
            {rows.map((r) =>
              editing === r.id ? (
                <Fragment key={r.id}>{editRow}</Fragment>
              ) : (
                <tr
                  key={r.id}
                  className={`border-t align-top ${r.isActive ? "" : "opacity-50"}`}>
                  {!single && <td className="p-2 dt-mono">{r.sortOrder}</td>}
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2">
                    {r.matchAll ? (
                      <span className="text-gray-500">Tất cả khách</span>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="dt-mono text-[12px]">
                          {r.customerCodes.join(", ")}
                        </div>
                        <div className="text-[12px] text-gray-500">
                          {r.matches?.length
                            ? r.matches
                                .map((m) => `${m.code} · ${m.name}`)
                                .join(" | ")
                            : "Không khớp khách nào"}
                        </div>
                      </div>
                    )}
                  </td>
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
                    {!single && (
                      <button
                        type="button"
                        className={iconBtn}
                        title="Xoá"
                        onClick={() =>
                          window.confirm(`Xoá đại lý "${r.name}"?`) &&
                          remove.mutate(r.id)
                        }>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
