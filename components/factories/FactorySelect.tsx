"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Factory as FactoryIcon,
  ChevronDown,
  Search,
  Plus,
  Pencil,
  Check,
} from "lucide-react";
import { useFactories } from "@/lib/hooks/useFactories";
import { Factory } from "@/lib/api/factories";
import { usePermission } from "@/lib/hooks/usePermissions";
import { FactoryQuickFormModal } from "./FactoryQuickFormModal";

interface FactorySelectProps {
  value?: number | null;
  onChange: (factoryId: number | null) => void;
  placeholder?: string;
  /** Loại trừ 1 factoryId khỏi danh sách (tránh chọn trùng primary/backup). */
  excludeFactoryId?: number | null;
  /** Loại trừ nhiều factoryId — dùng khi sản phẩm gắn nhiều nhà máy. */
  excludeFactoryIds?: number[];
  disabled?: boolean;
  className?: string;
  label?: string;
}

function factoryLabel(f: Factory): string {
  const parts: string[] = [];
  if (f.code) parts.push(f.code);
  parts.push(f.name);
  const base = parts.join(" — ");
  return f.country ? `${base} (${f.country})` : base;
}

/**
 * Custom dropdown chọn nhà máy (thay thế <select> mặc định của browser).
 *
 * Tính năng: search, bỏ chọn ("— Chưa gắn —"), tạo nhanh nhà máy mới, sửa nhà
 * máy ngay trong danh sách. Giữ cùng props với FactoriesDropdown cũ để thay 1-1.
 */
export function FactorySelect({
  value,
  onChange,
  placeholder = "— Chưa gắn —",
  excludeFactoryId,
  excludeFactoryIds,
  disabled,
  className = "",
  label,
}: FactorySelectProps) {
  const data = useFactories({ includeInactive: false, limit: 500 });
  const isLoading = !data;
  const allFactories: Factory[] = useMemo(() => data?.data ?? [], [data]);

  const canCreate = usePermission("factories", "create");
  const canUpdate = usePermission("factories", "update");

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Nhà máy đang chọn (kể cả khi nó bị exclude ở dropdown còn lại).
  const selected = allFactories.find((f) => f.id === value) ?? null;

  // Danh sách hiển thị: loại trừ nhà máy đã gắn + lọc theo search.
  const visibleFactories = useMemo(() => {
    const q = search.toLowerCase().trim();
    const excluded = new Set<number>(excludeFactoryIds ?? []);
    if (excludeFactoryId != null) excluded.add(excludeFactoryId);
    // Nhà máy đang chọn vẫn phải hiện để người dùng thấy lựa chọn hiện tại.
    if (value != null) excluded.delete(value);
    return allFactories
      .filter((f) => !excluded.has(f.id))
      .filter(
        (f) =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          (f.code ?? "").toLowerCase().includes(q)
      );
  }, [allFactories, excludeFactoryId, excludeFactoryIds, search, value]);

  // Đóng khi click ra ngoài.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus ô search khi mở.
  useEffect(() => {
    if (open) {
      setSearch("");
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const toggleOpen = () => {
    if (disabled || isLoading) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (factoryId: number | null) => {
    onChange(factoryId);
    setOpen(false);
  };

  const openCreateModal = () => {
    setEditingFactory(null);
    setModalMode("create");
    setOpen(false);
  };

  const openEditModal = (factory: Factory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFactory(factory);
    setModalMode("edit");
    setOpen(false);
  };

  const handleModalSaved = (factory: Factory) => {
    // Sau khi tạo -> auto chọn nhà máy vừa tạo. Sau khi sửa -> giữ lựa chọn
    // hiện tại nếu đang chọn chính nó (list sẽ tự refresh qua invalidate).
    if (modalMode === "create") {
      onChange(factory.id);
    }
    setModalMode(null);
    setEditingFactory(null);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative" ref={rootRef}>
        {/* Trigger */}
        <button
          type="button"
          onClick={toggleOpen}
          disabled={disabled || isLoading}
          className={`w-full flex items-center gap-2 pl-3 pr-2.5 py-2 border rounded-lg text-sm bg-white text-left transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
            open
              ? "border-brand ring-2 ring-brand-soft"
              : "border-gray-200 hover:border-gray-300"
          }`}>
          <FactoryIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span
            className={`flex-1 truncate ${
              selected ? "text-gray-900" : "text-gray-400"
            }`}>
            {isLoading
              ? "Đang tải danh sách nhà máy..."
              : selected
              ? factoryLabel(selected)
              : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Panel */}
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nhà máy..."
                className="flex-1 outline-none text-sm bg-transparent placeholder:text-gray-400"
              />
            </div>

            {/* List */}
            <div className="max-h-[240px] overflow-y-auto py-1">
              {/* Mục bỏ chọn */}
              <div
                onClick={() => handleSelect(null)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                  value == null
                    ? "bg-brand-soft text-brand-dark font-medium"
                    : "hover:bg-gray-50 text-gray-500"
                }`}>
                <span>{placeholder}</span>
                {value == null && (
                  <Check className="w-4 h-4 text-brand flex-shrink-0" />
                )}
              </div>

              {visibleFactories.length > 0 ? (
                visibleFactories.map((f) => {
                  const isSelected = f.id === value;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelect(f.id)}
                      className={`group px-3 py-2 cursor-pointer flex items-center justify-between gap-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-brand-soft text-brand-dark font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}>
                      <span className="truncate flex-1">
                        {factoryLabel(f)}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={(e) => openEditModal(f, e)}
                            title="Sửa nhà máy"
                            className="p-1 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-brand" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-6 text-sm text-gray-400 text-center flex flex-col items-center gap-2">
                  <Search className="w-5 h-5 text-gray-300" />
                  Không tìm thấy nhà máy
                </div>
              )}
            </div>

            {/* Tạo mới */}
            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 border-t border-gray-100 bg-gray-50 text-brand-dark text-sm font-medium hover:bg-brand-soft transition-colors">
                <Plus className="w-4 h-4" />
                Thêm nhà máy mới
              </button>
            )}
          </div>
        )}
      </div>

      {modalMode && (
        <FactoryQuickFormModal
          factory={modalMode === "edit" ? editingFactory : null}
          onSaved={handleModalSaved}
          onClose={() => {
            setModalMode(null);
            setEditingFactory(null);
          }}
        />
      )}
    </div>
  );
}
