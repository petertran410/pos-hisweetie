"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { useDropdownPosition } from "./useDropdownPosition";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterMultiSelectProps {
  options: FilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Bật ô tìm kiếm bên trong (mặc định true). Tắt cho list ngắn như status. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Nhãn khi chọn nhiều: (n) => string. Mặc định "Đã chọn n". */
  multiLabel?: (count: number) => string;
}

/**
 * Dropdown multi-select (checkbox) + ô tìm kiếm tùy chọn, tự lật hướng mở
 * (lên/xuống) theo khoảng trống viewport, render qua portal.
 */
export function FilterMultiSelect({
  options,
  values,
  onChange,
  placeholder = "Tất cả",
  searchable = true,
  searchPlaceholder = "Tìm kiếm...",
  multiLabel = (n) => `Đã chọn ${n}`,
}: FilterMultiSelectProps) {
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
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(
    () => options.filter((o) => values.includes(o.value)).map((o) => o.label),
    [options, values]
  );

  const toggle = (v: string) => {
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v]
    );
  };

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : multiLabel(selectedLabels.length);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none bg-white ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span
          className={`truncate ${
            selectedLabels.length ? "text-gray-800" : "text-gray-400"
          }`}>
          {summary}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {values.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
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
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  Không tìm thấy
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const checked = values.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                        checked ? "bg-brand-soft" : "hover:bg-gray-50"
                      } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 accent-brand flex-shrink-0"
                      />
                      <span
                        className={`flex-1 truncate ${
                          checked ? "text-brand-dark font-medium" : "text-gray-700"
                        }`}>
                        {opt.label}
                      </span>
                      {checked && (
                        <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
