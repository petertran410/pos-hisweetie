"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { manufacturersApi, type PayableAllocation, type PayableRow } from "@/lib/api/manufacturers";
import { useBranchStore } from "@/lib/store/branch";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { NumericInput } from "@/components/ui/NumericInput";
import { numericClass } from "./ManufacturerMaterialsEditor";

const vnd = (amount: number) => `${amount.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} đ`;
const rowKey = (row: PayableRow) => `${row.targetType}:${row.targetId}`;
const localDateTime = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export function PayablePaymentModal({ accountType, accountId, onClose }: { accountType: "S" | "M"; accountId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranchStore();
  const { data: bankAccounts } = useBankAccountsForPayment();
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [method, setMethod] = useState("cash");
  const [bankId, setBankId] = useState<number | null>(null);
  const [date, setDate] = useState(localDateTime);
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, { cash: number; credit: number }>>({});
  const [useCredit, setUseCredit] = useState(true);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const summary = useQuery({ queryKey: ["payables", accountType, accountId], queryFn: () => manufacturersApi.payables(accountType, accountId), staleTime: 0 });
  const rows = summary.data?.data ?? [];
  const hasCny = rows.some((row) => row.currency === "CNY");
  const toVnd = (row: PayableRow, value: number) => row.currency === "CNY" ? Math.round(value * rate) : value;
  const cashTotal = rows.reduce((sum, row) => sum + toVnd(row, values[rowKey(row)]?.cash ?? 0), 0);
  const creditTotal = rows.reduce((sum, row) => sum + toVnd(row, values[rowKey(row)]?.credit ?? 0), 0);
  const suggest = () => {
    if (hasCny && !(rate > 0)) return toast.error("Nhập tỷ giá trước khi phân bổ");
    let cashLeft = amount;
    let creditLeft = useCredit ? summary.data?.availableCredit ?? 0 : 0;
    const next: typeof values = {};
    for (const row of rows) {
      const cny = row.currency === "CNY";
      const max = cny ? Number(row.foreignDebt ?? 0) : row.debtAmount;
      const credit = cny ? Math.min(max, Math.floor(creditLeft / rate * 100) / 100) : Math.min(max, creditLeft);
      creditLeft -= toVnd(row, credit);
      const cash = cny ? Math.min(Math.max(0, max - credit), Math.floor(cashLeft / rate * 100) / 100) : Math.min(Math.max(0, max - credit), cashLeft);
      cashLeft -= toVnd(row, cash);
      next[rowKey(row)] = { cash, credit };
    }
    setValues(next);
  };
  const pay = useMutation({
    mutationFn: () => {
      if (!selectedBranch) throw new Error("Vui lòng chọn chi nhánh");
      if (hasCny && !(rate > 0)) throw new Error("Nhập tỷ giá hợp lệ");
      if (cashTotal > amount + 0.005) throw new Error("Tiền phân bổ vượt tiền thực chi");
      if (creditTotal > (summary.data?.availableCredit ?? 0) + 0.005) throw new Error("Tiền cấn vượt ứng trước còn lại");
      if (method === "transfer" && !bankId) throw new Error("Vui lòng chọn tài khoản ngân hàng");
      const allocations: PayableAllocation[] = rows.flatMap((row) => {
        const value = values[rowKey(row)];
        if (!value || (!value.cash && !value.credit)) return [];
        return [{
          targetType: row.targetType, targetId: row.targetId,
          amount: toVnd(row, value.cash), creditAmount: toVnd(row, value.credit),
          ...(row.currency === "CNY" ? { foreignAmount: value.cash, creditForeignAmount: value.credit, exchangeRate: rate } : {}),
        }];
      });
      const data = { totalAmount: amount, branchId: selectedBranch.id, method, accountId: bankId ?? undefined, description: note, transDate: new Date(date).toISOString(), allocations };
      const serialized = JSON.stringify(data);
      if (request.current?.payload !== serialized) request.current = { payload: serialized, key: crypto.randomUUID() };
      return manufacturersApi.pay(accountType, accountId, { ...data, requestKey: request.current!.key });
    },
    onSuccess: () => {
      for (const key of ["payables", "suppliers", "supplier-debt-timeline", "purchase-orders", "productions", "manufacturers", "manufacturer-accounts", "cashflows"]) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Đã lưu thanh toán"); onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return createPortal(<div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-2 sm:p-5">
    <div role="dialog" aria-modal="true" aria-label="Thanh toán công nợ" className="flex max-h-[95dvh] w-full max-w-6xl flex-col rounded-lg bg-white">
      <header className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-lg font-semibold">Thanh toán {summary.data?.partnerName}</h2><button title="Đóng" onClick={onClose} disabled={pay.isPending}><X size={20} /></button></header>
      <fieldset disabled={pay.isPending} className="min-h-0 space-y-4 overflow-y-auto p-4">
        {summary.isError && <p className="text-sm text-red-600">Không tải được công nợ. <button className="underline" onClick={() => summary.refetch()}>Thử lại</button></p>}
        <dl className="grid gap-3 border-b pb-3 text-sm sm:grid-cols-4">
          <div><dt className="text-gray-500">Nợ tiền hàng</dt><dd>{vnd(summary.data?.purchaseDebt ?? 0)}</dd></div>
          <div><dt className="text-gray-500">Nợ sản xuất</dt><dd>{vnd(summary.data?.productionDebt ?? 0)}</dd></div>
          <div><dt className="text-gray-500">Ứng trước chưa cấn</dt><dd className="text-green-700">{vnd(summary.data?.availableCredit ?? 0)}</dd></div>
          <div><dt className="text-gray-500">Tổng nợ ròng</dt><dd className="font-semibold text-red-700">{vnd(summary.data?.totalDebt ?? 0)}</dd></div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Tiền thực chi (VND)<NumericInput className={numericClass} value={amount} onValueChange={setAmount} maxFractionDigits={2} /></label>
          <label className="text-sm">Phương thức<select className="w-full rounded border p-2" value={method} onChange={(event) => setMethod(event.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>
          <label className="text-sm">Ngày thanh toán<input type="datetime-local" className="w-full rounded border p-2" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          {hasCny && <label className="text-sm">Tỷ giá CNY/VND<NumericInput className={numericClass} value={rate} onValueChange={setRate} maxFractionDigits={6} /></label>}
          {method === "transfer" && <label className="text-sm sm:col-span-2">Tài khoản ngân hàng<select className="w-full rounded border p-2" value={bankId ?? ""} onChange={(event) => setBankId(Number(event.target.value) || null)}>
            <option value="">Chọn tài khoản</option>{bankAccounts?.map((account: { id: number; bankName?: string; bankCode?: string; accountNumber: string }) => <option key={account.id} value={account.id}>{account.bankName || account.bankCode} - {account.accountNumber}</option>)}</select></label>}
          <label className="text-sm sm:col-span-2">Ghi chú<input className="w-full rounded border p-2" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={useCredit} onChange={(event) => setUseCredit(event.target.checked)} />Dùng ứng trước khi gợi ý</label>
          <button type="button" className="flex items-center gap-1 rounded border px-3 py-2" onClick={suggest}><Wand2 size={15} />Gợi ý phân bổ</button>
        </div>
        <div className="overflow-x-auto border"><table className="w-full min-w-[950px] text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Loại / Mã phiếu</th><th className="p-2">Ngày</th><th className="p-2 text-right">Giá trị</th><th className="p-2 text-right">Đã trả</th><th className="p-2 text-right">Còn nợ</th><th className="w-36 p-2">Cấn ứng trước</th><th className="w-36 p-2">Trả mới</th></tr></thead>
          <tbody>{rows.map((row) => {
            const key = rowKey(row), value = values[key] ?? { cash: 0, credit: 0 };
            return <tr key={key} className="border-t">
              <td className="p-2"><div className="font-medium">{row.code}</div><div className="text-xs text-gray-500">{row.targetType === "production" ? `Sản xuất ${row.manufacturerName ?? ""}` : "Nhập hàng"}</div></td>
              <td className="p-2">{new Date(row.date).toLocaleDateString("vi-VN")}</td>
              <td className="p-2 text-right">{vnd(row.total)}</td><td className="p-2 text-right">{vnd(row.paidAmount)}</td>
              <td className="p-2 text-right font-medium">{row.currency === "CNY" ? `${row.foreignDebt?.toLocaleString("vi-VN")} CNY` : vnd(row.debtAmount)}</td>
              <td className="p-2"><NumericInput className={numericClass} value={value.credit} maxFractionDigits={2} onValueChange={(credit) => setValues({ ...values, [key]: { ...value, credit } })} /><div className="text-right text-xs text-gray-400">{row.currency}</div></td>
              <td className="p-2"><NumericInput className={numericClass} value={value.cash} maxFractionDigits={2} onValueChange={(cash) => setValues({ ...values, [key]: { ...value, cash } })} /><div className="text-right text-xs text-gray-400">{row.currency}</div></td>
            </tr>;
          })}
          {!rows.length && <tr><td colSpan={7} className="p-5 text-center text-gray-500">{summary.isLoading ? "Đang tải..." : "Không có chứng từ còn nợ"}</td></tr>}
          </tbody>
        </table></div>
        <div className="flex flex-wrap justify-end gap-5 border-t pt-3 text-sm"><span>Cấn ứng: <strong>{vnd(creditTotal)}</strong></span><span>Phân bổ tiền mới: <strong>{vnd(cashTotal)}</strong></span><span>Ứng thêm: <strong>{vnd(Math.max(0, amount - cashTotal))}</strong></span></div>
      </fieldset>
      <footer className="flex justify-end gap-2 border-t px-4 py-3"><button className="rounded border px-3 py-2 text-sm" onClick={onClose} disabled={pay.isPending}>Đóng</button>
        <button className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-sm text-white disabled:opacity-50" disabled={pay.isPending || !summary.data} onClick={() => pay.mutate()}><Check size={16} />{pay.isPending ? "Đang lưu..." : "Lưu thanh toán"}</button></footer>
    </div>
  </div>, document.body);
}
