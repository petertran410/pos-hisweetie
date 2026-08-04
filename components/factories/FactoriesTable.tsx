"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Factory as FactoryIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useFactories, useDeleteFactory } from "@/lib/hooks/useFactories";
import { usePermission } from "@/lib/hooks/usePermissions";
import { FactoryQueryParams, Factory } from "@/lib/api/factories";
import { FactoryDetailRow } from "./FactoryDetailRow";

interface FactoriesTableProps {
  filters: FactoryQueryParams & { page: number; limit: number };
  onPageChange: (page: number) => void;
}

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

export function FactoriesTable({ filters, onPageChange }: FactoriesTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [limit, setLimit] = useState(filters.limit ?? 15);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const deleteFactory = useDeleteFactory();
  const canCreate = usePermission("factories", "create");
  const canUpdate = usePermission("factories", "update");
  const canDelete = usePermission("factories", "delete");

  // Debounce search 300ms.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset về trang 1 khi từ khóa tìm kiếm thay đổi.
  useEffect(() => {
    onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const effectiveFilters = useMemo(() => {
    const next = { ...filters, limit };
    if (debouncedSearch) next.search = debouncedSearch;
    if (activeStatusTab === "inactive") next.includeInactive = true;
    return next;
  }, [filters, limit, activeStatusTab, debouncedSearch]);

  const response = useFactories(effectiveFilters);
  const factories: Factory[] = response?.data ?? [];
  const total = response?.total ?? 0;
  const page = filters.page ?? 1;
  const totalPages = Math.ceil(total / limit) || 1;

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === factories.length ? [] : factories.map((factory) => factory.id));
  };

  const handleDelete = async (factory: Factory) => {
    const result = await Swal.fire({
      title: "Xóa nhà máy?",
      text: `Nhà máy "${factory.name}" sẽ được ẩn nếu đang được sử dụng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteFactory.mutateAsync(factory.id);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa nhà máy");
    }
  };

  const renderStatus = (factory: Factory) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${factory.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
      {factory.isActive ? "Hoạt động" : "Ngừng hoạt động"}
    </span>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0" style={{ borderColor: "var(--dt-border)" }}>
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0" style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 whitespace-nowrap">Nhà máy</h1>
          <input
            type="text"
            placeholder="Theo mã, tên nhà máy"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ borderColor: "var(--dt-border)" }}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canCreate && (
            <Link href="/san-pham/nha-may/new" className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Tạo nhà máy
            </Link>
          )}
        </div>
      </div>

      <div className="border-b px-4 flex items-center gap-1 shrink-0" style={{ borderColor: "var(--dt-border)" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setActiveStatusTab(tab.value); onPageChange(1); }}
            className={`px-3 py-2.5 text-sm border-b-2 ${activeStatusTab === tab.value ? "border-brand text-brand font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                <input type="checkbox" checked={factories.length > 0 && selectedIds.length === factories.length} onChange={toggleAll} className="cursor-pointer" />
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Mã nhà máy</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Tên nhà máy</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Nhà cung cấp</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Quốc gia</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs uppercase tracking-wide">SP chính</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs uppercase tracking-wide">SP backup</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Trạng thái</th>
              <th className="px-4 py-2.5 w-32" />
            </tr>
          </thead>
          <tbody>
            {!response ? (
              <tr><td colSpan={9} className="py-16 text-center text-gray-400"><div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent mx-auto mb-2" />Đang tải...</td></tr>
            ) : factories.length === 0 ? (
              <tr><td colSpan={9} className="py-20 text-center text-gray-400"><FactoryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" /><div className="text-sm">Không có nhà máy nào</div></td></tr>
            ) : factories.map((factory) => {
              const expanded = expandedId === factory.id;
              return (
                <Fragment key={factory.id}>
                  <tr className={`cursor-pointer transition-colors ${expanded ? "bg-brand-soft" : "border-b hover:bg-gray-50"}`} onClick={() => setExpandedId(expanded ? null : factory.id)}>
                    <td className={`px-4 py-2.5 sticky left-0 z-10 ${expanded ? "bg-brand-soft border-t-2 border-l-2 border-brand" : "bg-white"}`} onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(factory.id)} onChange={() => setSelectedIds((ids) => ids.includes(factory.id) ? ids.filter((id) => id !== factory.id) : [...ids, factory.id])} className="cursor-pointer" />
                    </td>
                    <td className={`px-4 py-2.5 font-mono text-xs ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.code || "-"}</td>
                    <td className={`px-4 py-2.5 font-medium ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.name}</td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.supplier?.name || "-"}</td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.country || "-"}</td>
                    <td className={`px-4 py-2.5 text-center ${expanded ? "border-t-2 border-brand" : ""}`}><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">{factory._count?.primaryForProducts ?? 0}</span></td>
                    <td className={`px-4 py-2.5 text-center ${expanded ? "border-t-2 border-brand" : ""}`}><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">{factory._count?.backupForProducts ?? 0}</span></td>
                    <td className={`px-4 py-2.5 ${expanded ? "border-t-2 border-brand" : ""}`}>{renderStatus(factory)}</td>
                    <td className={`px-4 py-2.5 ${expanded ? "border-t-2 border-r-2 border-brand" : ""}`} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/san-pham/nha-may/${factory.id}/san-pham`} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Xem sản phẩm"><Eye className="w-4 h-4" /></Link>
                        {canUpdate && <Link href={`/san-pham/nha-may/${factory.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Sửa"><Pencil className="w-4 h-4" /></Link>}
                        {canDelete && <button type="button" onClick={() => handleDelete(factory)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Xóa"><Trash2 className="w-4 h-4" /></button>}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </td>
                  </tr>
                  {expanded && <FactoryDetailRow factory={factory} colSpan={9} onEdit={() => window.location.assign(`/san-pham/nha-may/${factory.id}`)} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0" style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Hiển thị</span><select value={limit} onChange={(event) => { const value = Number(event.target.value); setLimit(value); onPageChange(1); }} className="border rounded px-2 py-1 text-xs bg-white"><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option><option value={50}>50</option></select><span className="text-xs text-gray-500">/ trang</span></div>
        <div className="flex items-center gap-1"><button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="px-2 text-xs text-gray-500">Trang {page}/{totalPages}</span><button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div>
        <span className="text-xs text-gray-400">{total} nhà máy</span>
      </div>
    </div>
  );
}
