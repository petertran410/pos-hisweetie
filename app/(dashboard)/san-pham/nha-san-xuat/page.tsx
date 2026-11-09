"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePermission } from "@/lib/hooks/usePermissions";
import { manufacturersApi, type Manufacturer, type PayableSummary } from "@/lib/api/manufacturers";
import { apiClient } from "@/lib/config/api";
import type { Production } from "@/lib/api/productions";
import { PartnerPicker } from "@/components/manufacturers/ProductionPickers";
import { PayablePaymentModal } from "@/components/manufacturers/PayablePaymentModal";

interface AccountGroup extends PayableSummary {
  manufacturerProductionDebt: number;
  heldMaterialValue: number;
  batches: Array<{ id: number; totalAmount: number; status: number; transDate: string; cashFlow?: { id: number; code: string } | null; allocations: Array<{ targetCode: string; amount: number }> }>;
}
interface AccountsResponse { manufacturer: Manufacturer; productions: Production[]; groups: AccountGroup[] }
const money = (amount: unknown) => `${Number(amount ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} đ`;

export default function ManufacturersPage() {
  return <PagePermissionGuard resource="productions" action="view"><ManufacturersView /></PagePermissionGuard>;
}

function ManufacturersView() {
  const queryClient = useQueryClient();
  const canCreate = usePermission("productions", "create");
  const canUpdate = usePermission("productions", "update");
  const canDelete = usePermission("productions", "delete");
  const canPay = usePermission("cash_flows", "create");
  const canCancelPayment = usePermission("cash_flows", "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Manufacturer | "new" | null>(null);
  const [paying, setPaying] = useState<{ type: "S" | "M"; id: number } | null>(null);
  const list = useQuery({ queryKey: ["manufacturers", search, page, includeInactive], queryFn: () => manufacturersApi.list({ search, pageSize: 20, currentItem: page * 20, includeInactive }) });
  const accounts = useQuery({ queryKey: ["manufacturer-accounts", selected], queryFn: () => apiClient.get<AccountsResponse>(`/manufacturers/${selected}/accounts`), enabled: !!selected });
  const templates = useQuery({ queryKey: ["manufacturer-templates", selected], queryFn: () => manufacturersApi.templates(selected!), enabled: !!selected });
  const cancel = useMutation({
    mutationFn: manufacturersApi.cancelPayment,
    onSuccess: () => {
      for (const key of ["manufacturer-accounts", "payables", "suppliers", "productions", "purchase-orders", "cashflows", "supplier-debt-timeline"]) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Đã hủy thanh toán");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const removeTemplate = useMutation({
    mutationFn: manufacturersApi.removeTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manufacturer-templates"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  return <div className="flex h-full min-h-0 flex-col bg-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><h1 className="text-xl font-semibold">Nhà sản xuất</h1>
      {canCreate && <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded bg-brand px-3 py-2 text-sm text-white"><Plus size={16} />Thêm nhà sản xuất</button>}</header>
    <div className="flex min-h-0 flex-1 flex-col overflow-auto xl:flex-row">
      <section className="min-w-0 border-r xl:w-[40%]">
        <div className="flex flex-wrap gap-2 p-3"><label className="relative min-w-48 flex-1"><Search size={16} className="absolute left-2 top-2.5 text-gray-400" /><input aria-label="Tìm nhà sản xuất" className="w-full rounded border py-2 pl-8 pr-2 text-sm" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm nhà sản xuất" /></label>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={includeInactive} onChange={(event) => { setIncludeInactive(event.target.checked); setPage(0); }} />Cả ngừng hoạt động</label></div>
        {list.isError && <p className="p-3 text-sm text-red-600">Không tải được nhà sản xuất</p>}
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">Nhà sản xuất</th><th className="p-3">NCC liên kết</th><th className="w-10" /></tr></thead><tbody>
          {list.data?.data.map((row) => <tr key={row.id} className={`cursor-pointer border-b ${selected === row.id ? "bg-brand-soft" : "hover:bg-gray-50"}`} onClick={() => setSelected(row.id)}>
            <td className="p-3"><button className="text-left font-medium">{row.name}</button><div className="text-xs text-gray-500">{row.code}{!row.isActive ? " · Ngừng hoạt động" : ""}</div></td>
            <td className="p-3">{row.supplier?.name ?? "-"}</td><td className="p-2">{canUpdate && <button title="Sửa nhà sản xuất" className="p-1" onClick={(event) => { event.stopPropagation(); setEditing(row); }}><Pencil size={16} /></button>}</td>
          </tr>)}
          {!list.data?.data.length && <tr><td colSpan={3} className="p-6 text-center text-gray-500">{list.isLoading ? "Đang tải..." : "Chưa có nhà sản xuất"}</td></tr>}
        </tbody></table>
        <div className="flex items-center justify-between p-3 text-sm"><span>{list.data?.total ?? 0} nhà sản xuất</span><div className="flex items-center gap-2">
          <button title="Trang trước" disabled={page === 0} className="rounded border p-1 disabled:opacity-40" onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
          <span>{page + 1}</span><button title="Trang sau" disabled={(page + 1) * 20 >= (list.data?.total ?? 0)} className="rounded border p-1 disabled:opacity-40" onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></div>
      </section>
      <section className="min-w-0 flex-1 space-y-5 p-4">
        {!selected ? <p className="text-sm text-gray-500">Chọn nhà sản xuất</p> : accounts.isLoading ? <p>Đang tải công nợ...</p> : accounts.isError ? <p className="text-sm text-red-600">Không tải được công nợ NSX</p> : <>
          <div><h2 className="text-lg font-semibold">{accounts.data?.manufacturer.name}</h2><div className="text-sm text-gray-500">{accounts.data?.manufacturer.contactNumber} {accounts.data?.manufacturer.address}</div></div>
          {accounts.data?.groups.map((group) => <section key={`${group.accountType}:${group.accountId}`} className="space-y-3 border-y py-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{group.accountType === "S" ? `Thanh toán qua NCC: ${group.partnerName}` : "Thanh toán riêng NSX"}</h3>
              {canPay && <button className="flex items-center gap-1 rounded border px-2 py-1 text-sm" onClick={() => setPaying({ type: group.accountType, id: group.accountId })}><Wallet size={15} />Thanh toán / ứng trước</button>}</div>
            <div className="flex flex-wrap gap-4 text-sm"><span>Nợ NSX này: <strong>{money(group.manufacturerProductionDebt)}</strong></span><span>Hàng đang gửi: <strong>{money(group.heldMaterialValue)}</strong></span><span>Ứng trước chung: <strong className="text-green-700">{money(group.availableCredit)}</strong></span><span>Tổng nợ đối tác: <strong className="text-red-700">{money(group.totalDebt)}</strong></span></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-2">Thanh toán</th><th className="p-2">Ngày</th><th className="p-2 text-right">Thực chi</th><th className="p-2">Chứng từ phân bổ</th><th /></tr></thead>
              <tbody>{group.batches.map((batch) => <tr key={batch.id} className="border-b"><td className="p-2">{batch.cashFlow?.code ?? `Cấn ứng #${batch.id}`}{batch.status === 2 && <span className="block text-xs text-red-600">Đã hủy</span>}</td><td className="p-2">{new Date(batch.transDate).toLocaleDateString("vi-VN")}</td><td className="p-2 text-right">{money(batch.totalAmount)}</td><td className="p-2">{[...new Set(batch.allocations.map((line) => line.targetCode))].join(", ") || "Ứng trước"}</td><td className="p-2">{canCancelPayment && batch.status !== 2 && <button title="Hủy lần thanh toán" disabled={cancel.isPending} className="p-1 text-red-600" onClick={() => { if (confirm("Hủy toàn bộ lần thanh toán và các phân bổ liên quan?")) cancel.mutate(batch.id); }}><X size={15} /></button>}</td></tr>)}
                {!group.batches.length && <tr><td colSpan={5} className="p-3 text-center text-gray-500">Chưa có thanh toán</td></tr>}</tbody>
            </table></div>
          </section>)}
          <section className="space-y-2"><h3 className="text-sm font-semibold">Phiếu gửi sản xuất</h3><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-2">Phiếu / thành phẩm</th><th className="p-2">Trạng thái</th><th className="p-2 text-right">Phải trả</th><th className="p-2 text-right">Còn nợ</th></tr></thead><tbody>
            {accounts.data?.productions.map((row) => <tr key={row.id} className="border-b"><td className="p-2"><Link className="text-brand" href={`/san-pham/san-xuat?Code=${row.code}`}>{row.code}</Link><div className="text-xs text-gray-500">{row.productName}</div></td><td className="p-2">{({ 1: "Phiếu tạm", 2: "Hoàn thành", 3: "Đã hủy", 4: "Đã gửi" } as Record<number, string>)[row.status]}</td><td className="p-2 text-right">{money(row.totalPayable)}</td><td className="p-2 text-right">{row.status === 2 ? money(row.debtAmount) : "-"}</td></tr>)}
          </tbody></table></div></section>
          <section className="space-y-2"><h3 className="text-sm font-semibold">Mẫu phối trộn</h3>{templates.data?.map((row) => <div key={row.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{row.name} · {Number(row.baseQuantity).toLocaleString("vi-VN")}</span>{canDelete && <button title="Ngừng dùng mẫu" disabled={removeTemplate.isPending} className="p-1 text-red-600" onClick={() => { if (confirm("Ngừng dùng mẫu phối trộn này?")) removeTemplate.mutate(row.id); }}><Trash2 size={15} /></button>}</div>)}</section>
        </>}
      </section>
    </div>
    {editing && <ManufacturerEditor value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    {paying && <PayablePaymentModal accountType={paying.type} accountId={paying.id} onClose={() => setPaying(null)} />}
  </div>;
}

function ManufacturerEditor({ value, onClose }: { value: Manufacturer | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(value?.name ?? "");
  const [contactNumber, setContact] = useState(value?.contactNumber ?? "");
  const [email, setEmail] = useState(value?.email ?? "");
  const [address, setAddress] = useState(value?.address ?? "");
  const [note, setNote] = useState(value?.note ?? "");
  const [currency, setCurrency] = useState<"VND" | "CNY">(value?.currency ?? "VND");
  const [supplierId, setSupplierId] = useState<number | null>(value?.supplierId ?? null);
  const [isActive, setActive] = useState(value?.isActive ?? true);
  const save = useMutation({
    mutationFn: () => {
      const data = { name, contactNumber, email, address, note, currency, supplierId, isActive };
      return value ? manufacturersApi.update(value.id, { ...data, code: value.code }) : manufacturersApi.create(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manufacturers"] }); queryClient.invalidateQueries({ queryKey: ["manufacturer"] }); queryClient.invalidateQueries({ queryKey: ["manufacturer-accounts"] }); toast.success("Đã lưu nhà sản xuất"); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return createPortal(<div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-3"><div role="dialog" aria-modal="true" aria-label="Nhà sản xuất" className="max-h-[95dvh] w-full max-w-lg overflow-auto rounded-lg bg-white">
    <header className="flex justify-between border-b p-4"><h2 className="font-semibold">{value ? "Cập nhật nhà sản xuất" : "Thêm nhà sản xuất"}</h2><button title="Đóng" onClick={onClose}><X size={18} /></button></header>
    <fieldset disabled={save.isPending} className="space-y-3 p-4 text-sm">{[
      { label: "Tên nhà sản xuất", value: name, set: setName }, { label: "Điện thoại", value: contactNumber, set: setContact },
      { label: "Email", value: email, set: setEmail }, { label: "Địa chỉ", value: address, set: setAddress },
    ].map((field) => <label key={field.label} className="block">{field.label}<input className="mt-1 w-full rounded border px-2 py-2" value={field.value} onChange={(event) => field.set(event.target.value)} /></label>)}
      <label className="block">NCC liên kết<PartnerPicker value={supplierId} label="Chọn NCC nếu có" onChange={setSupplierId} /></label>
      <label className="block">Tiền tệ<select className="w-full rounded border p-2" value={currency} onChange={(event) => setCurrency(event.target.value as "VND" | "CNY")}><option>VND</option><option>CNY</option></select></label>
      <label className="block">Ghi chú<textarea className="w-full rounded border p-2" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(event) => setActive(event.target.checked)} />Đang hoạt động</label>
    </fieldset><footer className="flex justify-end gap-2 border-t p-4"><button className="rounded border px-3 py-2 text-sm" onClick={onClose} disabled={save.isPending}>Đóng</button><button className="rounded bg-brand px-3 py-2 text-sm text-white" onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>{save.isPending ? "Đang lưu..." : "Lưu"}</button></footer>
  </div></div>, document.body);
}
