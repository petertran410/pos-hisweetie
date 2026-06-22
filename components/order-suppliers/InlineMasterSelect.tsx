"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Plus, X, Search } from "lucide-react";

/** Bỏ dấu + lowercase để search không phân biệt hoa thường/dấu. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export interface InlineMasterOption {
  id: number;
  name: string;
}

interface Props {
  value?: number | null;
  options: InlineMasterOption[];
  placeholder: string;
  addLabel: string;
  newPlaceholder: string;
  /** Cho phép chọn/tạo; nếu false chỉ hiển thị tên (read-only). */
  canEdit: boolean;
  onChange: (id: number | null) => void;
  onCreate: (name: string) => Promise<InlineMasterOption | undefined>;
}

/**
 * Combobox gọn dùng trong ô bảng: chọn 1 giá trị master + tạo mới inline.
 * Dùng cho cột "Giai đoạn hiện tại" và "Tên nhà máy" trên trang đặt hàng nhập
 * chi tiết. Khi !canEdit chỉ hiển thị tên đã chọn.
 */
export function InlineMasterSelect({
  value,
  options,
  placeholder,
  addLabel,
  newPlaceholder,
  canEdit,
  onChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setNewName("");
        setQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter((o) => norm(o.name).includes(q));
  }, [options, query]);

  if (!canEdit) {
    return <span>{selected?.name || "-"}</span>;
  }

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await onCreate(name);
    if (created) {
      onChange(created.id);
      setNewName("");
      setAdding(false);
      setOpen(false);
      setQuery("");
    }
  };

  /** Mở dropdown — auto-focus ô search. */
  const openDropdown = () => {
    setOpen(true);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        className={`w-full flex items-center justify-between gap-1 border rounded px-2 py-1 text-sm bg-white transition-colors ${
          open ? "border-brand ring-1 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-40 overflow-y-auto">
            {/* Không chọn — chỉ hiện khi chưa gõ search */}
            {!query && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${
                  !value
                    ? "bg-brand-soft text-brand-dark font-medium"
                    : "hover:bg-gray-50 text-gray-500"
                }`}>
                <span>Không chọn</span>
                {!value && <Check className="w-3.5 h-3.5 text-brand" />}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                Không tìm thấy
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center justify-between gap-1 px-3 py-1.5 border-t border-gray-50 hover:bg-gray-50 text-sm text-left">
                  <span
                    className={
                      value === o.id
                        ? "text-brand-dark font-medium"
                        : "text-gray-700"
                    }>
                    {o.name}
                  </span>
                  {value === o.id && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 p-2">
            {adding ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    else if (e.key === "Escape") {
                      setAdding(false);
                      setNewName("");
                    }
                  }}
                  placeholder={newPlaceholder}
                  className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  if (query.trim()) setNewName(query.trim());
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-brand hover:bg-brand-soft rounded">
                <Plus className="w-4 h-4" />
                {addLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
