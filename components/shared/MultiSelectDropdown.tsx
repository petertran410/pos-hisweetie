"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { useDropdownPosition } from "./useDropdownPosition";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  values: string[];
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (v: string[]) => void;
}

/**
 * Dropdown có ô tìm kiếm, chọn nhiều giá trị, tự lật hướng mở (lên/xuống)
 * theo khoảng trống còn lại của viewport — giống cách KiotViet xử lý.
 */
export function MultiSelectDropdown({
  options,
  values,
  placeholder,
  searchPlaceholder = "Tìm kiếm...",
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const PANEL_MAX_H = 280;
  const pos = useDropdownPosition(open, triggerRef, PANEL_MAX_H);

  // Đóng khi click ra ngoài (cả trigger lẫn panel render qua portal).
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

  // Focus ô tìm kiếm khi mở.
  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(
    () => options.filter((o) => values.includes(o.value)).map((o) => o.label),
    [options, values],
  );

  const toggle = (v: string) => {
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v],
    );
  };

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `Đã chọn ${selectedLabels.length}`;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        <span
          className={`truncate ${
            selectedLabels.length ? "text-gray-900" : "text-gray-400"
          }`}
        >
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
              className="text-gray-400 hover:text-gray-600"
            >
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
            className="fixed bg-white border rounded-lg shadow-lg z-[1000] flex flex-col"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}
          >
            {/* Ô tìm kiếm */}
            <div className="p-2 border-b bg-white rounded-t-lg">
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

            {/* Danh sách lựa chọn */}
            <div className="overflow-y-auto z-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                      onClick={() => toggle(opt.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        checked
                          ? "bg-brand-soft text-brand-dark font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      } ${idx > 0 ? "border-t border-gray-50" : ""}`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          checked
                            ? "bg-brand border-brand"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
