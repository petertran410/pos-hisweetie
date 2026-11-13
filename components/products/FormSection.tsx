"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";

interface FormSectionProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  /** Nội dung phụ hiển thị bên phải tiêu đề (vd: toggle, tổng số dòng) */
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
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
          disabled={!collapsible}>
          <span aria-hidden className="h-4 w-1 rounded-full bg-brand" />
          <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
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
        <div className="px-5 pb-5">
          {description && (
            <p className="text-xs text-gray-500 mb-4 -mt-1">{description}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
