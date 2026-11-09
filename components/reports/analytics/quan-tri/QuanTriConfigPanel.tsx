"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  analyticsQuanTriApi,
  type QtExclusion,
  type QtExclusionKind,
} from "@/lib/api/analytics-quan-tri";
import {
  useQtConfigMutation,
  useQtExclusions,
} from "@/lib/hooks/useAnalyticsQuanTri";

/**
 * Cấu hình báo cáo Phân tích › Quản Trị: khách / nhân viên KHÔNG tính vào báo cáo
 * (thay dim_customers[is_include_from_report] và bước lọc sold_by_id <> 2 viết cứng
 * trong Power BI). Tự gọi API; gắn vào trang Cấu hình.
 */
const KINDS: {
  key: QtExclusionKind;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "customer",
    label: "Khách không tính",
    hint: "Mã khách nội bộ / kho / hàng bục rách… Hoá đơn của các khách này bị bỏ khỏi mọi trang Quản Trị.",
    placeholder: "Mã khách, vd KH003124",
  },
  {
    key: "seller",
    label: "Nhân viên không tính",
    hint: "Id nhân viên (users.id). Hoá đơn do nhân viên này bán bị bỏ khỏi báo cáo (kể cả khi tính khách mới).",
    placeholder: "Id nhân viên, vd 2",
  },
];

const inputCls =
  "border rounded-lg px-2 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]";
const btnPrimary =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px] disabled:opacity-50";

export function QuanTriConfigPanel() {
  const [kind, setKind] = useState<QtExclusionKind>("customer");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const { data, isLoading } = useQtExclusions();
  const current = KINDS.find((k) => k.key === kind)!;
  const rows = (data ?? []).filter((r) => r.kind === kind);

  const create = useQtConfigMutation(
    (d: { kind: QtExclusionKind; code: string; note?: string }) =>
      analyticsQuanTriApi.createExclusion(d),
    "Đã thêm",
  );
  const update = useQtConfigMutation(
    (d: { id: number; isActive?: boolean; note?: string }) =>
      analyticsQuanTriApi.updateExclusion(d.id, {
        isActive: d.isActive,
        note: d.note,
      }),
    "Đã lưu",
  );
  const remove = useQtConfigMutation(
    (id: number) => analyticsQuanTriApi.deleteExclusion(id),
    "Đã xoá",
  );

  const add = () => {
    if (!code.trim()) return;
    create.mutate(
      { kind, code: code.trim(), note: note.trim() || undefined },
      {
        onSuccess: () => {
          setCode("");
          setNote("");
        },
      },
    );
  };

  return (
    <div className="dt-panel">
      <div
        className="flex flex-wrap gap-1 px-4 pt-3 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ${
              kind === k.key
                ? "border-[var(--dt-primary)] text-[var(--dt-primary)]"
                : "border-transparent text-gray-500"
            }`}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
          {current.hint}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputCls} w-52`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={current.placeholder}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            className={`${inputCls} flex-1 min-w-[200px]`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={!code.trim() || create.isPending}
            onClick={add}>
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
        <div
          className="border rounded-lg overflow-auto max-h-[480px]"
          style={{ borderColor: "var(--dt-border)" }}>
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0" style={{ background: "#F3F8F9" }}>
              <tr
                className="text-left text-[12px]"
                style={{ color: "var(--dt-text-secondary)" }}>
                <th className="px-3 py-2 font-semibold">Mã</th>
                <th className="px-3 py-2 font-semibold">Tên</th>
                <th className="px-3 py-2 font-semibold">Ghi chú</th>
                <th className="px-3 py-2 font-semibold text-center">Áp dụng</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Chưa có
                  </td>
                </tr>
              )}
              {rows.map((r: QtExclusion) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-3 py-1.5 dt-mono">{r.code}</td>
                  <td className="px-3 py-1.5">
                    {r.label ?? (
                      <span className="text-red-500">Không tìm thấy</span>
                    )}
                  </td>
                  <td
                    className="px-3 py-1.5"
                    style={{ color: "var(--dt-text-secondary)" }}>
                    {r.note}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) =>
                        update.mutate({ id: r.id, isActive: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                      title="Xoá"
                      onClick={() => {
                        if (confirm(`Xoá ${r.code} khỏi danh sách?`))
                          remove.mutate(r.id);
                      }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
