"use client";

import { useState, useRef, useEffect } from "react";
import { useMisaEmployees } from "@/lib/hooks/useMisa";
import { MisaEmployee } from "@/lib/api/misa";

interface MisaEmployeeDropdownProps {
  label: string;
  placeholder: string;
  /** Mã nhân viên Misa đang gắn (misaEmployeeCode) */
  value?: string;
  /** Tên nhân viên Misa đang gắn (misaEmployeeName) — hiển thị khi list chưa tải */
  valueName?: string;
  onChange: (employee: MisaEmployee | null) => void;
}

export function MisaEmployeeDropdown({
  label,
  placeholder,
  value,
  valueName,
  onChange,
}: MisaEmployeeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chỉ fetch khi mở dropdown (list nhân viên nhỏ, lọc phía client).
  const { data: employees, isLoading } = useMisaEmployees(isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = employees?.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    );
  });

  const selected = employees?.find((e) => e.code === value);
  const displayLabel = selected
    ? `${selected.code} - ${selected.name}`
    : value
      ? valueName
        ? `${value} - ${valueName}`
        : value
      : "";

  const handleSelect = (employee: MisaEmployee) => {
    onChange(employee);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1 sm:mb-2">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded px-3 py-1.5 sm:py-2 text-left flex items-center justify-between hover:bg-gray-50 min-h-[36px] sm:min-h-[42px]">
        <span className={displayLabel ? "text-gray-900" : "text-gray-500"}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e as any);
                }
              }}
              className="hover:bg-gray-200 rounded p-1 cursor-pointer">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Đang tải...</div>
            ) : filtered && filtered.length > 0 ? (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSelect(emp)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    value === emp.code
                      ? "bg-brand-soft text-brand-dark font-medium"
                      : ""
                  }`}>
                  <span className="font-medium">{emp.code}</span>
                  <span className="text-gray-600"> - {emp.name}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
