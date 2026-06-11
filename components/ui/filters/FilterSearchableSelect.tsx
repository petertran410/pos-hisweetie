"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { useDropdownPosition } from "./useDropdownPosition";
import type { FilterOption } from "./FilterMultiSelect";

interface FilterSearchableSelectProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Bật ô tìm kiếm bên trong (mặc định true). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Cho phép bỏ chọn khi bấm lại item đang chọn (mặc định true). */
  allowDeselect?: boolean;
  /** Hiển thị dòng "placeholder" như tuỳ chọn xoá ở đầu list (mặc định true). */
  showClearOption?: boolean;
}

/**
 * Dropdown single-select + ô tìm kiếm tùy chọn, tự lật hướng mở (lên/xuống)
 * theo khoảng trống viewport, render qua portal.
 */
export function FilterSearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Tất cả",
  searchable = true,
  searchPlaceholder = "Tìm kiếm...",
  allowDeselect = true,
  showClearOption = true,
}: FilterSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const PANEL_MAX_H = 280;
  const pos = useDropdownPosition(open, triggerRef, PANEL_MAX_H);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        panelRef.current &&
        !panelRef.current.contains(t)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open && searchable) searchInputRef.current?.focus();
  }, [open, searchable]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      (o.value + " " + o.label).toLowerCase().includes(q)
    );
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  const select = (v: string) => {
    onChange(allowDeselect && value === v ? "" : v);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] flex flex-col overflow-hidden"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}>
            {searchable && (
              <div className="p-2 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {showClearOption && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                    !value
                      ? "bg-brand-soft text-brand-dark font-medium"
                      : "hover:bg-gray-50 text-gray-500"
                  }`}>
                  <span>{placeholder}</span>
                  {!value && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              )}
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center border-t border-gray-50">
                  Không tìm thấy
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors border-t border-gray-50 ${
                      value === opt.value
                        ? "bg-brand-soft text-brand-dark font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}>
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && (
                      <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
