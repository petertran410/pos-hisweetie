"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, Info } from "lucide-react";
import {
  DebtTrackingRow,
  MIN_PAYMENT_RATIO_WARN,
} from "@/lib/api/debt-tracking";
import { useCreateDebtTicket } from "@/lib/hooks/useDebtTickets";
import { useUsersForFilter } from "@/lib/hooks/useUsers";

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

export function CreateDebtTicketModal({
  rows,
  onClose,
  onCreated,
}: {
  rows: DebtTrackingRow[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { data: usersData } = useUsersForFilter();
  const create = useCreateDebtTicket();
  const users = usersData ?? [];

  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Số tiền tối thiểu mặc định = phần nợ ĐÃ ĐẾN HẠN (quá hạn + tới hạn) —
  // đúng con số hệ thống gợi ý. Không có gì đến hạn thì lấy toàn bộ nợ.
  const [lines, setLines] = useState(
    rows.map((r) => {
      const due = r.overdueAmount + r.dueAmount;
      return {
        customerId: r.customerId,
        customerName: r.name,
        customerCode: r.code,
        totalDebt: r.totalDebt,
        minimumPayment: String(Math.round(due > 0 ? due : r.totalDebt)),
        confirmedAmount: "",
        confirmedDate: "",
        note: "",
      };
    })
  );

  const setLine = (i: number, patch: Partial<(typeof lines)[number]>) => {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  };

  const totalDebt = lines.reduce((s, l) => s + l.totalDebt, 0);
  const totalMinimum = lines.reduce(
    (s, l) => s + (Number(l.minimumPayment) || 0),
    0
  );

  /** Cảnh báo mềm: tối thiểu dưới 30% nợ hiện tại. */
  const isBelowRatio = (l: (typeof lines)[number]) =>
    l.totalDebt > 0 &&
    Number(l.minimumPayment) < l.totalDebt * MIN_PAYMENT_RATIO_WARN;

  const belowCount = lines.filter(isBelowRatio).length;

  const handleSubmit = () => {
    setError(null);
    if (!assigneeId) {
      setError("Vui lòng chọn nhân viên phụ trách");
      return;
    }

    create.mutate(
      {
        title: title.trim() || undefined,
        assigneeId: Number(assigneeId),
        note: note.trim() || undefined,
        customers: lines.map((l) => ({
          customerId: l.customerId,
          minimumPayment:
            l.minimumPayment !== "" ? Number(l.minimumPayment) : undefined,
          confirmedAmount:
            l.confirmedAmount !== "" ? Number(l.confirmedAmount) : undefined,
          confirmedDate: l.confirmedDate || undefined,
          note: l.note.trim() || undefined,
        })),
      },
      {
        onSuccess: () => {
          onCreated?.();
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-semibold">Tạo phiếu thu hồi nợ</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {rows.length} khách hàng · Tổng nợ {fmt(totalDebt)} đ
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Nhân viên phụ trách <span className="text-red-500">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) =>
                  setAssigneeId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">— Chọn nhân viên —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Tiêu đề
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Thu hồi nợ khu vực Hà Nội tuần 12"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm resize-y"
              placeholder="Ghi chú chung cho phiếu…"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Danh sách khách ({lines.length})
              </label>
              <span className="text-xs text-gray-500">
                Tổng tối thiểu cần thu:{" "}
                <b className="text-gray-800">{fmt(totalMinimum)} đ</b>
              </span>
            </div>

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">
                      Khách hàng
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Nợ đầu kì
                    </th>
                    <th className="text-right px-3 py-2 font-medium w-44">
                      Số tiền tối thiểu
                    </th>
                    <th className="text-right px-3 py-2 font-medium w-44">
                      Khách xác nhận
                    </th>
                    <th className="text-left px-3 py-2 font-medium w-36">
                      Ngày xác nhận
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((l, i) => {
                    const below = isBelowRatio(l);
                    return (
                      <tr key={l.customerId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{l.customerName}</div>
                          <div className="text-xs text-gray-400">
                            {l.customerCode}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(l.totalDebt)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={l.minimumPayment}
                            onChange={(e) =>
                              setLine(i, { minimumPayment: e.target.value })
                            }
                            className={`w-full border rounded px-2 py-1 text-sm text-right tabular-nums ${
                              below ? "border-amber-400 bg-amber-50" : ""
                            }`}
                          />
                          {below && (
                            <div className="text-[11px] text-amber-600 mt-0.5 text-right">
                              Dưới 30% nợ
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={l.confirmedAmount}
                            onChange={(e) =>
                              setLine(i, { confirmedAmount: e.target.value })
                            }
                            placeholder="Chưa xác nhận"
                            className="w-full border rounded px-2 py-1 text-sm text-right tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={l.confirmedDate}
                            onChange={(e) =>
                              setLine(i, { confirmedDate: e.target.value })
                            }
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-start gap-1.5 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <b>Số tiền tối thiểu</b> do hệ thống gợi ý (phần nợ đã đến
                  hạn), sửa được. <b>Khách xác nhận</b> là số khách cam kết trả
                  — có thể nhỏ hơn mức tối thiểu và chính là mốc đối chiếu để
                  đánh dấu đã thu.
                </span>
              </div>
              {belowCount > 0 && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {belowCount} khách có số tiền tối thiểu dưới 30% nợ hiện
                    tại. Vẫn lưu được, chỉ là nhắc để bạn kiểm tra lại.
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="px-4 py-2 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo phiếu
          </button>
        </div>
      </div>
    </div>
  );
}
