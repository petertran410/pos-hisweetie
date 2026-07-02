"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { useDropdownPosition } from "./useDropdownPosition";

export interface SimpleDropdownOption {
  value: string;
  label: string;
}

export interface SimpleDropdownProps {
  options: SimpleDropdownOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}

/**
 * Dropdown single-select không search, tự lật hướng mở theo viewport.
 */
export function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: SimpleDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const PANEL_MAX_H = 264;
  const pos = useDropdownPosition(open, triggerRef, PANEL_MAX_H);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        panelRef.current &&
        !panelRef.current.contains(t)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed bg-white border rounded-lg shadow-lg z-[1000] overflow-y-auto"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}
          >
            {value && (
              <button
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-sm text-left text-gray-400 hover:bg-gray-50 border-b border-gray-50"
              >
                {placeholder}
              </button>
            )}
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value === value ? "" : opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                  opt.value === value
                    ? "bg-brand-soft text-brand-dark font-medium"
                    : "hover:bg-gray-50 text-gray-700"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
