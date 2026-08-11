"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { useDropdownPosition } from "@/components/ui/filters/useDropdownPosition";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  renderOption?: (option: Option) => React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  size?: "sm" | "md";
  footer?: React.ReactNode;
  clearable?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  renderOption,
  disabled = false,
  required = false,
  error,
  size = "md",
  footer,
  clearable = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const pos = useDropdownPosition(isOpen, triggerRef, 320);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((option) =>
    (option.value + " " + option.label)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const handleButtonClick = () => {
    if (disabled) return;
    setIsOpen((open) => !open);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
      return;
    }
    if (!filteredOptions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
      setHighlightedIndex(next);
      optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.max(highlightedIndex - 1, 0);
      setHighlightedIndex(next);
      optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      handleSelect(filteredOptions[highlightedIndex].value);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        data-required={required || undefined}
        data-invalid={error ? true : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full ${size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3 py-2"} border rounded-lg flex items-center justify-between transition-colors ${
          disabled
            ? "bg-gray-100 cursor-not-allowed opacity-60"
            : error
              ? "bg-white border-red-500"
              : "bg-white hover:border-gray-400"
        }`}>
        <span
          className={`min-w-0 flex-1 truncate text-left ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
          {selectedOption
            ? renderOption
              ? renderOption(selectedOption)
              : selectedOption.label
            : placeholder}
        </span>
        {clearable && value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Bỏ chọn"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
              }
            }}
            className="ml-auto rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </span>
        )}
        <ChevronDown
          className={`${size === "sm" ? "w-4 h-4" : "w-5 h-5"} text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        !disabled &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed z-[10000] flex flex-col overflow-hidden rounded-xl border bg-white shadow-lg"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}>
            <div className="p-2 border-b sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className={`w-full pl-9 pr-3 ${size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm"} border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand`}
                />
              </div>
            </div>

            <div className="overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                      option.value === value || index === highlightedIndex
                        ? "bg-brand-soft"
                        : ""
                    } `}>
                    <span className="text-sm">
                      {renderOption ? renderOption(option) : option.label}
                    </span>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-brand" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-gray-500">
                  Không tìm thấy kết quả
                </div>
              )}
            </div>
            {footer && <div className="border-t p-2">{footer}</div>}
          </div>,
          document.body
        )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
