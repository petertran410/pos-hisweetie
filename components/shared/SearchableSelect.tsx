"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SearchableOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface Props {
  value: number; // 0 = chưa chọn
  options: SearchableOption[];
  onChange: (value: number) => void;
  placeholder?: string;
  /** Nhãn cho mục "bỏ chọn" (value = 0). Bỏ qua nếu không muốn hiển thị. */
  emptyLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

/**
 * Combobox có ô tìm kiếm, thay cho <select> mặc định của HTML.
 * Lọc theo label + sublabel (không phân biệt hoa thường, bỏ dấu cách thừa).
 */
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Chọn...",
  emptyLabel,
  searchPlaceholder = "Tìm kiếm...",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus ô tìm kiếm ngay khi mở.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.sublabel ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white transition-colors ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : open
              ? "border-brand ring-2 ring-brand-soft"
              : "hover:border-gray-400"
        }`}>
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border rounded-lg pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {emptyLabel !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onChange(0);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${
                  !value
                    ? "bg-brand-soft text-brand-dark font-medium"
                    : "hover:bg-gray-50 text-gray-500"
                }`}>
                <span>{emptyLabel}</span>
                {!value && <Check className="w-3.5 h-3.5 text-brand" />}
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-50 hover:bg-gray-50 text-sm text-left">
                  <span className="min-w-0">
                    <span
                      className={`block truncate ${
                        value === o.value
                          ? "text-brand-dark font-medium"
                          : "text-gray-700"
                      }`}>
                      {o.label}
                    </span>
                    {o.sublabel && (
                      <span className="block truncate text-xs text-gray-400">
                        {o.sublabel}
                      </span>
                    )}
                  </span>
                  {value === o.value && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-brand" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
