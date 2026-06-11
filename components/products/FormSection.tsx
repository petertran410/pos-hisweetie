"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Nội dung phụ hiển thị bên phải tiêu đề (vd: toggle) */
  headerRight?: ReactNode;
  /** Cho phép gập section. Mặc định true */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  headerRight,
  collapsible = true,
  defaultOpen = true,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border rounded-card shadow-card bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          disabled={!collapsible}>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {collapsible && (
            <ChevronUp
              className={`w-4 h-4 text-gray-400 transition-transform ${
                open ? "" : "rotate-180"
              }`}
            />
          )}
        </button>
        {headerRight}
      </div>

      {open && (
        <div className="px-4 pb-4">
          {description && (
            <p className="text-xs text-gray-500 mb-3 -mt-1">{description}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
