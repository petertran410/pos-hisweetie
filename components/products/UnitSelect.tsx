"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Lock, Pencil, Search } from "lucide-react";
import { useUnits } from "@/lib/hooks/useUnits";
import { usePermission } from "@/lib/hooks/usePermissions";
import { normalizeUnitKey, type Unit } from "@/lib/api/units";
import { UnitModal } from "./UnitModal";

interface UnitSelectProps {
  value?: string | null;
  onChange: (name: string) => void;
  className?: string;
}

/**
 * Ô chọn Đơn vị tính từ danh mục, thay cho ô gõ tự do. Quản lý danh mục ngay
 * tại đây (giống ô Thương hiệu): "+ Tạo mới" ở đầu danh sách, rê chuột vào
 * dòng để sửa tên / gộp / xóa. Cần quyền units:manage.
 */
export function UnitSelect({
  value,
  onChange,
  className = "",
}: UnitSelectProps) {
  const { data: units = [] } = useUnits();
  const canManage = usePermission("units", "manage");

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // undefined = đóng, null = thêm mới, Unit = sửa
  const [editing, setEditing] = useState<Unit | null | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const key = normalizeUnitKey(search);
    return key
      ? units.filter((u) => normalizeUnitKey(u.name).includes(key))
      : units;
  }, [units, search]);

  const select = (name: string) => {
    onChange(name);
    setSearch("");
    setOpen(false);
  };

  const openModal = (unit: Unit | null) => {
    setEditing(unit);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between border rounded px-3 py-2 bg-white text-left ${className}`}>
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || "Chọn đơn vị tính"}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length === 1) select(filtered[0].name);
                }
              }}
              placeholder="Tìm đơn vị..."
              className="w-full border rounded pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>

          {canManage && (
            <div className="p-2 border-b">
              <button
                type="button"
                onClick={() => openModal(null)}
                className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-brand-soft rounded">
                + Tạo mới
              </button>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.map((u) => {
              const selected =
                normalizeUnitKey(u.name) === normalizeUnitKey(value);
              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 group ${
                    selected ? "bg-brand-soft" : ""
                  }`}>
                  <button
                    type="button"
                    onClick={() => select(u.name)}
                    className={`flex-1 flex items-center gap-2 text-left ${
                      selected ? "text-brand-dark font-medium" : ""
                    }`}>
                    {u.name}
                    {u.isSystem && (
                      <span
                        title="Đơn vị của hệ thống, dùng cho cách nhập theo thùng trong công thức sản xuất"
                        className="inline-flex items-center gap-0.5 text-[10px] text-blue-600">
                        <Lock className="w-3 h-3" />
                        Hệ thống
                      </span>
                    )}
                  </button>
                  {selected && <Check className="w-4 h-4 text-brand mr-1" />}
                  {canManage && !u.isSystem && (
                    <button
                      type="button"
                      title="Sửa / gộp / xóa"
                      onClick={() => openModal(u)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}

      {editing !== undefined && (
        <UnitModal
          unit={editing}
          initialName={search}
          onClose={() => setEditing(undefined)}
          onSaved={(name) => {
            // Thêm mới → chọn luôn; sửa đúng đơn vị đang chọn → cập nhật tên.
            if (
              !editing ||
              normalizeUnitKey(editing.name) === normalizeUnitKey(value)
            ) {
              onChange(name);
            }
            setSearch("");
          }}
        />
      )}
    </div>
  );
}
