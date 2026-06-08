"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface UnitPickerProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function UnitPicker({ value, options, onChange }: UnitPickerProps) {
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

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs font-medium transition-colors ${
          open
            ? "border-brand bg-brand-soft text-brand"
            : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
        }`}>
        {selected?.label || value}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[56px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs transition-colors ${
                value === opt.value
                  ? "bg-brand-soft text-brand"
                  : "text-gray-700 hover:bg-gray-50"
              }`}>
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
