"use client";

import { usePathname, useRouter } from "next/navigation";
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
    </div>
  );
}
