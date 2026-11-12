import { useRef, useState } from "react";
import { toast } from "sonner";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import type { InternalFundQuery } from "@/lib/api/internal-fund";

export function useExportInternalFund() {
  const [exporting, setExporting] = useState<"overview" | "detail" | null>(
    null,
  );
  const inFlight = useRef(false);

  const exportFile = async (
    kind: "overview" | "detail",
    filters: InternalFundQuery,
    columns?: string[],
  ) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setExporting(kind);
    try {
      const url = new URL(
        `${API_URL}/internal-fund/${kind === "detail" ? "export-detail" : "export"}`,
      );
      for (const [key, value] of Object.entries(filters)) {
        if (key === "page" || key === "limit") continue;
        if (value !== undefined && value !== null && value !== "")
          url.searchParams.set(key, String(value));
      }
      if (columns?.length) url.searchParams.set("columns", columns.join(","));
      const response = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          ...(filters.branchId
            ? { "X-Branch-Id": String(filters.branchId) }
            : {}),
        },
      });
      if (!response.ok) {
        let message = "Xuất file sổ quỹ thất bại";
        const body = await response.json().catch(() => null);
        if (Array.isArray(body?.message)) message = body.message.join(", ");
        else if (typeof body?.message === "string") message = body.message;
        throw new Error(message);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename =
        disposition.match(/filename="?([^";]+)"?/)?.[1] ||
        `SoQuy_${kind === "detail" ? "ChiTiet" : "TongQuan"}_${Date.now()}.xlsx`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      try {
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(objectUrl);
      }
      toast.success("Xuất file thành công");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Xuất file sổ quỹ thất bại",
      );
      return false;
    } finally {
      inFlight.current = false;
      setExporting(null);
    }
  };

  return { exportFile, exporting };
}
