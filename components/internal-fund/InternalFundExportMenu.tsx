"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  X,
} from "lucide-react";
import type { InternalFundQuery } from "@/lib/api/internal-fund";
import { useExportInternalFund } from "@/lib/hooks/useExportInternalFund";

const DETAIL_COLUMNS = [
  { key: "branchName", label: "Chi nhánh" },
  { key: "code", label: "Mã giao dịch quỹ" },
  { key: "entryCode", label: "Mã phiếu" },
  { key: "occurredAt", label: "Ngày ghi quỹ" },
  { key: "entryDate", label: "Ngày phiếu" },
  { key: "direction", label: "Phân loại" },
  { key: "type", label: "Loại" },
  { key: "description", label: "Nội dung" },
  { key: "receipt", label: "Tiền thu" },
  { key: "expense", label: "Tiền chi" },
  { key: "status", label: "Trạng thái" },
  { key: "amount", label: "Số tiền" },
  { key: "weeklyBatchCode", label: "Approval tuần" },
  { key: "approvalCode", label: "Mã đơn duyệt" },
  { key: "transferCode", label: "Mã chuyển quỹ" },
  { key: "createdAt", label: "Ngày tạo" },
  { key: "cancelledAt", label: "Ngày hủy" },
  { key: "cancelReason", label: "Lý do hủy" },
];
const STORAGE_KEY = "internal-fund-export-detail-cols";
const allKeys = DETAIL_COLUMNS.map((column) => column.key);

export function InternalFundExportMenu({
  filters,
  disabled,
}: {
  filters: InternalFundQuery;
  disabled?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [columns, setColumns] = useState(() => {
    if (typeof window === "undefined") return allKeys;
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null",
      );
      if (Array.isArray(saved)) {
        const valid = allKeys.filter((key) => saved.includes(key));
        if (valid.length) return valid;
      }
    } catch {
      // Keep defaults when browser storage is unavailable.
    }
    return allKeys;
  });
  const { exportFile, exporting } = useExportInternalFund();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
      // Export remains available without storage.
    }
  }, [columns]);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus();
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <Dialog.Root
      open={showDetail}
      onOpenChange={(open) => {
        if (!exporting) setShowDetail(open);
      }}
    >
      <div ref={menuRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || !!exporting}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          onClick={() => setMenuOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setMenuOpen(true);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Xuất file
          <ChevronDown className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div
            id={menuId}
            role="menu"
            aria-label="Xuất file"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                setMenuOpen(false);
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitem"]',
                ),
              );
              const current = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            }}
            className="absolute right-0 top-full z-50 mt-1 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-white p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void exportFile("overview", filters);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
            >
              <FileSpreadsheet className="h-4 w-4" /> Tổng quan
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setShowDetail(true);
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
            >
              <ListChecks className="h-4 w-4" /> Chi tiết (chọn cột)
            </button>
          </div>
        )}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <Dialog.Title className="text-base font-semibold text-gray-800">
              Chọn cột xuất chi tiết
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                title="Đóng"
                disabled={!!exporting}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex items-center gap-2 px-4 pb-1 pt-3">
            <button
              type="button"
              disabled={!!exporting}
              onClick={() =>
                setColumns(columns.length === allKeys.length ? [] : allKeys)
              }
              className="text-sm font-medium text-brand hover:text-brand-dark"
            >
              {columns.length === allKeys.length ? "Bỏ tất cả" : "Chọn tất cả"}
            </button>
            <span className="text-xs text-gray-500">
              ({columns.length}/{allKeys.length} cột)
            </span>
          </div>
          <div className="grid min-h-0 grid-cols-1 gap-1 overflow-y-auto p-4 min-[400px]:grid-cols-2">
            {DETAIL_COLUMNS.map((column) => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={columns.includes(column.key)}
                  disabled={!!exporting}
                  onChange={() =>
                    setColumns((current) =>
                      current.includes(column.key)
                        ? current.filter((key) => key !== column.key)
                        : [...current, column.key],
                    )
                  }
                  className="accent-brand"
                />
                <span className="text-sm text-gray-700">{column.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={!!exporting}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={!columns.length || !!exporting}
              onClick={async () => {
                if (await exportFile("detail", filters, columns))
                  setShowDetail(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Xuất {columns.length} cột
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
