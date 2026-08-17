"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Factory as FactoryIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useFactories, useDeleteFactory } from "@/lib/hooks/useFactories";
import { usePermission } from "@/lib/hooks/usePermissions";
import { FactoryQueryParams, Factory, factoriesApi } from "@/lib/api/factories";
import { FactoryDetailRow } from "./FactoryDetailRow";
import { FactoryForm } from "./FactoryForm";
import { FactoryProductImportModal } from "./FactoryProductImportModal";
import { FactoryImportModal } from "./FactoryImportModal";

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFactoryImportModal, setShowFactoryImportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDetail, setIsExportingDetail] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const deleteFactory = useDeleteFactory();
  const canCreate = usePermission("factories", "create");
  const canUpdate = usePermission("factories", "update");
  const canDelete = usePermission("factories", "delete");

  // Đóng dropdown "Xuất file" khi click ra ngoài.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  /** Bộ lọc dùng chung cho cả 2 API xuất (danh sách / chi tiết). */
  const exportParams = () => ({
    ...filters,
    search: debouncedSearch || undefined,
    // Tab "Tất cả" và "Ngừng hoạt động" đều cần lấy cả bản ghi inactive;
    // tab "Hoạt động" để mặc định BE chỉ lấy isActive=true.
    includeInactive: activeStatusTab !== "active",
  });

  const exportFactories = async () => {
    setShowExportDropdown(false);
    setIsExporting(true);
    try {
      const blob = await factoriesApi.exportAll(exportParams());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "danh-sach-nha-may.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không thể xuất danh sách nhà máy");
    } finally {
      setIsExporting(false);
    }
  };

  const exportFactoriesDetail = async () => {
    setShowExportDropdown(false);
    setIsExportingDetail(true);
    try {
      const blob = await factoriesApi.exportAllDetail(exportParams());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "chi-tiet-nha-may.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không thể xuất chi tiết nhà máy");
    } finally {
      setIsExportingDetail(false);
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
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown((value) => !value)}
              disabled={isExporting || isExportingDetail}
              className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
              style={{ borderColor: "var(--dt-border)" }}
              title="Xuất Excel theo bộ lọc hiện tại">
              {isExporting || isExportingDetail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Xuất file
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportDropdown ? "rotate-180" : ""}`} />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-20 w-56 overflow-hidden" style={{ borderColor: "var(--dt-border)" }}>
                <button
                  type="button"
                  onClick={() => void exportFactories()}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                  <div className="font-medium text-gray-700">Tổng quan</div>
                  <div className="text-xs text-gray-400">Danh sách nhà máy</div>
                </button>
                <button
                  type="button"
                  onClick={() => void exportFactoriesDetail()}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t" style={{ borderColor: "var(--dt-border)" }}>
                  <div className="font-medium text-gray-700">Chi tiết</div>
                  <div className="text-xs text-gray-400">Kèm sản phẩm liên kết</div>
                </button>
              </div>
            )}
          </div>
          {canCreate && (
            <button type="button" onClick={() => setShowFactoryImportModal(true)} className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" style={{ borderColor: "var(--dt-border)" }} title="Import nhà máy từ Excel">
              <Upload className="w-4 h-4" /> Import nhà máy
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={() => setShowImportModal(true)} className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" style={{ borderColor: "var(--dt-border)" }} title="Import liên kết sản phẩm - nhà máy từ Excel">
              <Upload className="w-4 h-4" /> Import liên kết
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={() => setShowCreateModal(true)} className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Tạo nhà máy
            </button>
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
              <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide min-w-[260px]">Tên đầy đủ</th>
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
              <tr><td colSpan={10} className="py-16 text-center text-gray-400"><div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent mx-auto mb-2" />Đang tải...</td></tr>
            ) : factories.length === 0 ? (
              <tr><td colSpan={10} className="py-20 text-center text-gray-400"><FactoryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" /><div className="text-sm">Không có nhà máy nào</div></td></tr>
            ) : factories.map((factory) => {
              const expanded = expandedId === factory.id;
              return (
                <Fragment key={factory.id}>
                  <tr className={`cursor-pointer transition-colors ${expanded ? "bg-brand-soft" : "border-b hover:bg-gray-50"}`} onClick={() => setExpandedId(expanded ? null : factory.id)}>
                    <td className={`px-4 py-2.5 sticky left-0 z-10 ${expanded ? "bg-brand-soft border-t-2 border-l-2 border-brand" : "bg-white"}`} onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(factory.id)} onChange={() => setSelectedIds((ids) => ids.includes(factory.id) ? ids.filter((id) => id !== factory.id) : [...ids, factory.id])} className="cursor-pointer" />
                    </td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.code || "-"}</td>
                    <td className={`px-4 py-2.5 font-medium ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.name}</td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.fullName ? <span className="block truncate max-w-[320px]" title={factory.fullName}>{factory.fullName}</span> : <span className="text-gray-300">-</span>}</td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.supplier?.name || "-"}</td>
                    <td className={`px-4 py-2.5 text-gray-700 ${expanded ? "border-t-2 border-brand" : ""}`}>{factory.country || "-"}</td>
                    <td className={`px-4 py-2.5 text-center ${expanded ? "border-t-2 border-brand" : ""}`}><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">{factory.mappingCounts?.primary ?? 0}</span></td>
                    <td className={`px-4 py-2.5 text-center ${expanded ? "border-t-2 border-brand" : ""}`}><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">{factory.mappingCounts?.backup ?? 0}</span></td>
                    <td className={`px-4 py-2.5 ${expanded ? "border-t-2 border-brand" : ""}`}>{renderStatus(factory)}</td>
                    <td className={`px-4 py-2.5 ${expanded ? "border-t-2 border-r-2 border-brand" : ""}`} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && <button type="button" onClick={() => setEditingFactory(factory)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Sửa"><Pencil className="w-4 h-4" /></button>}
                        {canDelete && <button type="button" onClick={() => handleDelete(factory)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Xóa"><Trash2 className="w-4 h-4" /></button>}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </td>
                  </tr>
                  {expanded && <FactoryDetailRow factory={factory} colSpan={10} />}
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

      {showCreateModal && <FactoryForm mode="create" onClose={() => setShowCreateModal(false)} />}
      {showFactoryImportModal && <FactoryImportModal onClose={() => setShowFactoryImportModal(false)} />}
      {showImportModal && <FactoryProductImportModal onClose={() => setShowImportModal(false)} />}
      {editingFactory && <FactoryForm mode="edit" factoryId={editingFactory.id} onClose={() => setEditingFactory(null)} />}
    </div>
  );
}
