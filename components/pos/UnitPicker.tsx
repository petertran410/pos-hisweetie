"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface UnitPickerProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  size?: "default" | "quantity";
  revealOnHover?: boolean;
}

export function UnitPicker({
  value,
  options,
  onChange,
  size = "default",
  revealOnHover = false,
}: UnitPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const isQuantityPicker = size === "quantity";

  return (
    <div
      ref={ref}
      onMouseLeave={() => {
        if (revealOnHover) setOpen(false);
      }}
      className={`relative inline-flex ${
        revealOnHover
          ? "lg:w-0 lg:min-w-0 lg:-ml-2 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none lg:group-hover/line:ml-0 lg:group-hover/line:w-auto lg:group-hover/line:overflow-visible lg:group-hover/line:opacity-100 lg:group-hover/line:pointer-events-auto lg:group-focus-within/line:ml-0 lg:group-focus-within/line:w-auto lg:group-focus-within/line:overflow-visible lg:group-focus-within/line:opacity-100 lg:group-focus-within/line:pointer-events-auto"
          : ""
      }`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center justify-center font-medium transition-colors ${
          isQuantityPicker
            ? "h-6 gap-1 rounded-full border border-transparent bg-gray-100 px-2.5 text-xs text-gray-800 hover:bg-gray-200 lg:h-8 lg:px-3 lg:text-sm"
            : "gap-0.5 rounded border px-1.5 py-0.5 text-xs"
        } ${
          open
            ? isQuantityPicker
              ? "border-transparent bg-gray-200 text-gray-900"
              : "border-brand bg-brand-soft text-brand"
            : isQuantityPicker
              ? "text-gray-800"
              : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
        }`}>
        <span>{selected?.label || value}</span>
        <ChevronDown
          className={`${isQuantityPicker ? "w-3.5 h-3.5" : "w-3 h-3"} shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 pt-1">
          <div
            className={`bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden ${
              isQuantityPicker ? "min-w-[96px]" : "min-w-[56px]"
            }`}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 ${
                  isQuantityPicker ? "text-sm" : "text-xs"
                } transition-colors ${
                  value === opt.value
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                <span>{opt.label}</span>
                {value === opt.value && (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
