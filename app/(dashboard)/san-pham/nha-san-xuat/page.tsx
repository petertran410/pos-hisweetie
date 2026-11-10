"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { usePermission } from "@/lib/hooks/usePermissions";
import { manufacturersApi, type Manufacturer } from "@/lib/api/manufacturers";
import { PartnerPicker } from "@/components/manufacturers/ProductionPickers";
import { ManufacturerSidebar, type ManufacturerView } from "@/components/manufacturers/ManufacturerSidebar";
import { ManufacturerDetailPanel, PanelState } from "@/components/manufacturers/ManufacturerDetailPanel";

export default function ManufacturersPage() {
  return <PagePermissionGuard resource="productions" action="view"><ManufacturersView /></PagePermissionGuard>;
}

function ManufacturersView() {
  const canCreate = usePermission("productions", "create");
  const canUpdate = usePermission("productions", "update");
  const [view, setView] = useState<ManufacturerView>("info");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Manufacturer | "new" | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useQuery({
    queryKey: ["manufacturers", query, page, includeInactive],
    queryFn: () => manufacturersApi.list({ search: query, pageSize: 20, currentItem: page * 20, includeInactive }),
  });
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const active = rows.filter((row) => row.isActive).length;
  const linked = rows.filter((row) => row.supplierId).length;
  const titles: Record<ManufacturerView, string> = {
    info: "Tổng hợp nhà sản xuất",
    debt: "Công nợ theo nhà sản xuất",
    productions: "Phiếu gửi theo nhà sản xuất",
    templates: "Mẫu phối trộn theo nhà sản xuất",
  };
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-gray-50/50">
      <ManufacturerSidebar
        view={view} onViewChange={setView}
        search={search} onSearchChange={(value) => { setSearch(value); setSelected(null); }}
        includeInactive={includeInactive} onIncludeInactiveChange={(value) => { setIncludeInactive(value); setPage(0); setSelected(null); }}
        selected={selected} onSelect={setSelected}
        mobileOpen={mobileFilters} onClose={() => setMobileFilters(false)}
      />
      <section aria-label="Dữ liệu nhà sản xuất" className="m-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:my-4 lg:ml-0 lg:mr-4">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 lg:hidden">
          <span className="text-sm font-medium text-gray-800">Nhà sản xuất</span>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600"
            onClick={() => setMobileFilters(true)} aria-expanded={mobileFilters}><SlidersHorizontal size={15} />Bộ lọc</button>
        </div>
        {selected ? (
          <ManufacturerDetailPanel key={selected} id={selected} view={view} onBack={() => setSelected(null)} onEdit={setEditing} />
        ) : (
          <>
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-gray-900">{titles[view]}</h2>
                {list.data && <span className="text-sm text-gray-500">{total.toLocaleString("vi-VN")} nhà sản xuất</span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" title="Làm mới danh sách" aria-label="Làm mới danh sách" disabled={list.isFetching} onClick={() => list.refetch()}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={15} className={list.isFetching ? "animate-spin" : ""} /></button>
                {canCreate && <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                  <Plus size={15} />Thêm nhà sản xuất
                </button>}
              </div>
            </header>
            {list.data && rows.length > 0 && !list.isError && (
              <div className="flex shrink-0 flex-wrap gap-x-8 gap-y-1 border-b bg-gray-50 px-4 py-2 text-sm">
                <span className="text-gray-500">Đang hiển thị: <strong className="font-semibold text-gray-900">{rows.length}</strong></span>
                <span className="text-gray-500">Đang hoạt động: <strong className="font-semibold text-green-700">{active}</strong></span>
                <span className="text-gray-500">Có NCC liên kết: <strong className="font-semibold text-brand-dark">{linked}</strong></span>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-auto">
              {list.isLoading ? <PanelState loading /> : list.isError ? <PanelState onRetry={() => list.refetch()}>Không tải được danh sách nhà sản xuất</PanelState> :
                !rows.length ? <PanelState>{query ? "Không tìm thấy nhà sản xuất phù hợp" : "Chưa có nhà sản xuất"}</PanelState> : (
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>{["STT", "Mã nhà sản xuất", "Nhà sản xuất", "Điện thoại", "NCC liên kết", "Tiền tệ", "Trạng thái"].map((label) => (
                        <th key={label} className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-600">{label}</th>
                      ))}<th className="w-12"><span className="sr-only">Thao tác</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="bg-amber-50 font-semibold">
                        <td className="px-3 py-2" /><td className="px-3 py-2 text-gray-800" colSpan={2}>Tổng trang này</td>
                        <td className="px-3 py-2 text-gray-700">{rows.length} NSX</td>
                        <td className="px-3 py-2 text-brand-dark">{linked} liên kết</td><td />
                        <td className="px-3 py-2 text-green-700">{active} hoạt động</td><td />
                      </tr>
                      {rows.map((row, index) => (
                        <tr key={row.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelected(row.id)}>
                          <td className="px-3 py-2.5 text-gray-400">{page * 20 + index + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <button type="button" className="text-left font-medium text-brand hover:underline" onClick={(event) => { event.stopPropagation(); setSelected(row.id); }}>{row.code}</button>
                          </td>
                          <td className="min-w-48 max-w-80 px-3 py-2.5">
                            <button type="button" className="break-words text-left font-medium text-gray-900 hover:text-brand" onClick={(event) => { event.stopPropagation(); setSelected(row.id); }}>{row.name}</button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{row.contactNumber || "-"}</td>
                          <td className="max-w-64 break-words px-3 py-2.5 text-gray-600">{row.supplier?.name ?? "-"}</td>
                          <td className="px-3 py-2.5 text-gray-600">{row.currency}</td>
                          <td className={`whitespace-nowrap px-3 py-2.5 ${row.isActive ? "text-green-700" : "text-gray-400"}`}>{row.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</td>
                          <td className="px-3 py-2.5">{canUpdate && <button type="button" title="Sửa nhà sản xuất" aria-label={`Sửa ${row.name}`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand"
                            onClick={(event) => { event.stopPropagation(); setEditing(row); }}><Pencil size={15} /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-sm text-gray-500">
              <span>{total > 0 ? `${page * 20 + 1}–${Math.min((page + 1) * 20, total)} / ${total.toLocaleString("vi-VN")} nhà sản xuất` : "0 nhà sản xuất"}</span>
              <div className="flex items-center gap-2">
                <button type="button" title="Trang trước" disabled={page === 0 || list.isLoading} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40" onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
                <span className="min-w-16 text-center">Trang {page + 1}/{totalPages}</span>
                <button type="button" title="Trang sau" disabled={page + 1 >= totalPages || list.isLoading} className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40" onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
              </div>
            </footer>
          </>
        )}
      </section>
      {editing && <ManufacturerEditor value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
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
