"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CustomerDemandFilters } from "@/lib/types/customer-demand";
import { API_URL, getAuthHeaders } from "@/lib/config/api";

interface Props {
  filters: CustomerDemandFilters;
  search?: string;
  groupBy?: "product" | "customer";
  canExport: boolean;
}

export function CustomerDemandExportMenu({
  filters,
  search,
  groupBy = "product",
  canExport,
}: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"summary" | "detail" | null>(
    null
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  if (!canExport) return null;

  const exportFile = async (kind: "summary" | "detail") => {
    setExporting(kind);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      if (search?.trim()) params.set("search", search.trim());
      if (kind === "summary" && groupBy === "customer") {
        params.set("groupBy", "customer");
      }

      const response = await fetch(
        `${API_URL}/customer-demand/export/${kind}?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error("Không thể xuất file Demand");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename =
        disposition.match(/filename="?([^"]+)"?/)?.[1] ??
        `demand-khach-hang-${kind}.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xuất file Demand"
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={!!exporting}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="hidden xl:inline">Xuất file</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => void exportFile("summary")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
            <FileSpreadsheet className="h-4 w-4 text-brand" />
            {groupBy === "customer"
              ? "Tổng quan theo khách/tháng"
              : "Tổng quan theo mã/tháng"}
          </button>
          <button
            type="button"
            onClick={() => void exportFile("detail")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
            <FileText className="h-4 w-4 text-brand" />
            Chi tiết từng phiếu
          </button>
        </div>
      )}
    </div>
  );
}
