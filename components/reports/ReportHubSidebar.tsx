"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Package,
  Truck,
  Store,
  Wallet,
  ClipboardList,
} from "lucide-react";
import {
  useReportAccess,
  type ReportGroupKey,
} from "@/lib/permissions/reportPermissions";

interface ReportGroup {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

// Danh sách nhóm báo cáo (theo KiotViet). Hiện chỉ "Bán hàng" và "Khách hàng"
// có dữ liệu thật; các nhóm còn lại để "Sắp có", dễ bật khi có endpoint.
const REPORT_GROUPS: ReportGroup[] = [
  {
    key: "ban-hang",
    label: "Bán hàng",
    href: "/bao-cao/ban-hang",
    icon: BarChart3,
    available: true,
  },
  {
    key: "khach-hang",
    label: "Khách hàng",
    href: "/bao-cao/khach-hang",
    icon: Users,
    available: true,
  },
  {
    key: "hang-hoa",
    label: "Hàng hóa",
    href: "/bao-cao/hang-hoa",
    icon: Package,
    available: true,
  },
  {
    key: "nha-cung-cap",
    label: "Nhà cung cấp",
    href: "/bao-cao/nha-cung-cap",
    icon: Truck,
    available: true,
  },
  {
    key: "kenh-ban-hang",
    label: "Kênh bán hàng",
    href: "/bao-cao/kenh-ban-hang",
    icon: Store,
    available: false,
  },
  {
    key: "tai-chinh",
    label: "Tài chính",
    href: "/bao-cao/tai-chinh",
    icon: Wallet,
    available: true,
  },
  {
    key: "cuoi-ngay",
    label: "Cuối ngày",
    href: "/bao-cao/cuoi-ngay",
    icon: ClipboardList,
    available: true,
  },
];

export function ReportHubSidebar() {
  const pathname = usePathname();
  const { groupAllowed } = useReportAccess();

  // Ẩn nhóm mà user không có quyền nào. Nhóm "Sắp có" (available:false) vẫn
  // hiển thị dạng disabled như cũ (không gắn với quyền backend).
  const visibleGroups = REPORT_GROUPS.filter(
    (g) => !g.available || groupAllowed(g.key as ReportGroupKey),
  );

  return (
    <aside className="w-56 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col shrink-0">
      <div className="px-4 py-2.5 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Báo cáo</h2>
      </div>
      <nav className="p-2 space-y-0.5 overflow-y-auto flex-1">
        {visibleGroups.map((g) => {
          const Icon = g.icon;
          const active = pathname.startsWith(g.href);

          if (!g.available) {
            return (
              <div
                key={g.key}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{g.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  Sắp có
                </span>
              </div>
            );
          }

          return (
            <Link
              key={g.key}
              href={g.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{g.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
