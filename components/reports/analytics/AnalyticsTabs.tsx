"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { analyticsReportApi } from "@/lib/api/analytics-reports";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import {
  ANALYTICS_CONFIG_PERM,
  ANALYTICS_REPORTS,
  reportHref,
} from "./reportRegistry";

// Tab cấp 1 của nhóm Phân tích: mỗi report Power BI là 1 tab; "Cấu hình" chỉ
// hiện với người có quyền sửa cấu hình.
const TABS = [
  ...ANALYTICS_REPORTS.map((r) => ({
    href: reportHref(r.slug),
    label: r.label,
    perm: r.perm,
  })),
  {
    href: "/bao-cao/phan-tich/cau-hinh",
    label: "Cấu hình",
    perm: ANALYTICS_CONFIG_PERM,
  },
];

export function AnalyticsTabs({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { has } = useReportAccess();
  const tabs = TABS.filter((t) => has(t.perm));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="dt-seg flex-wrap max-w-full">
        {tabs.map((t) => (
          <button
            key={t.href}
            type="button"
            data-on={pathname === t.href || pathname.startsWith(`${t.href}/`)}
            onClick={() => router.push(t.href)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      {right}
      <RefreshButton />
    </div>
  );
}

/** Số liệu được lưu tạm 5 phút (backend + trình duyệt) — nút này lấy số mới ngay. */
function RefreshButton() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await analyticsReportApi.refresh();
      await qc.invalidateQueries({ queryKey: ["reports", "analytics"] });
    } catch {
      toast.error("Không làm mới được số liệu, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Số liệu được lưu tạm tối đa 5 phút. Bấm để tính lại ngay."
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
      style={{ borderColor: "var(--dt-border)" }}>
      <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
      Làm mới
    </button>
  );
}
