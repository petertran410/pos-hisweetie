"use client";

import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CustomerDemandStatus } from "@/lib/types/customer-demand";
import "./customer-demand.css";

export const DEMAND_STATUS_DISPLAY: Record<CustomerDemandStatus, string> = {
  DRAFT: "Chờ duyệt",
  CONFIRMED: "Đã duyệt",
  CANCELLED: "Đã hủy",
};

export function formatDemandQty(value: number) {
  return Number(value || 0).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });
}

export function formatDemandMonth(value: string) {
  const [year, month] = (value || "").split("-");
  if (!year || !month) return value || "-";
  return `${month}/${year}`;
}

export function DemandButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "md" | "tiny";
  icon?: ReactNode;
}) {
  return (
    <button
      className={`cd-btn cd-btn-${variant} ${size === "tiny" ? "cd-btn-tiny" : ""} ${className}`}
      {...props}>
      {icon ? <span className="cd-btn-icon">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function DemandStatusChip({
  status,
  label,
  pulse,
}: {
  status: CustomerDemandStatus | "mixed";
  label?: string;
  pulse?: boolean;
}) {
  const text =
    label ??
    (status === "mixed" ? "Hỗn hợp" : DEMAND_STATUS_DISPLAY[status]);
  return (
    <span className={`cd-chip cd-chip-${status.toLowerCase()}`}>
      <span className={`cd-chip-dot ${pulse ? "is-pulse" : ""}`} />
      {text}
    </span>
  );
}

export function DemandMonthChip({
  month,
  status,
}: {
  month: string;
  status: CustomerDemandStatus;
}) {
  return (
    <span
      title={`${formatDemandMonth(month)} · ${DEMAND_STATUS_DISPLAY[status]}`}
      className={`cd-month-chip cd-chip-${status.toLowerCase()}`}>
      {formatDemandMonth(month)}
    </span>
  );
}

export function DemandEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="cd-empty">
      <div className="cd-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p className="cd-subtitle mt-1 max-w-sm">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DemandModalShell({
  open,
  onClose,
  title,
  subtitle,
  size = "import",
  closeOnOverlay = false,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  size?: "form" | "import";
  closeOnOverlay?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cd-demand cd-overlay"
      onMouseDown={closeOnOverlay ? onClose : undefined}>
      <div
        className={`cd-shell cd-modal cd-modal-${size} cd-rise`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-modal-title"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="cd-core cd-modal-core">
          <header className="cd-modal-head">
            <div>
              <h2 id="cd-modal-title">{title}</h2>
              {subtitle ? (
                <div className="cd-subtitle mt-1">{subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cd-icon-btn"
              aria-label="Đóng">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </header>
          <div className="cd-modal-body">{children}</div>
          {footer ? <footer className="cd-modal-foot">{footer}</footer> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
