"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function MobileSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: MobileSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="dt-m-scrim"
        data-open={open}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className="dt-m-sheet"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label={title}>
        <div className="grab" />
        <div className="sh">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="ss">{subtitle}</div>}
          </div>
          <button className="x" onClick={onClose} aria-label="Đóng">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="sb">{children}</div>
        {footer && <div className="sf">{footer}</div>}
      </aside>
    </>
  );
}
