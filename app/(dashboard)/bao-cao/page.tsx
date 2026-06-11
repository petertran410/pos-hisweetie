"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import {
  useReportAccess,
  type ReportGroupKey,
} from "@/lib/permissions/reportPermissions";

// Thứ tự ưu tiên điều hướng (khớp thứ tự sidebar).
const GROUP_ROUTES: { group: ReportGroupKey; href: string }[] = [
  { group: "ban-hang", href: "/bao-cao/ban-hang" },
  { group: "khach-hang", href: "/bao-cao/khach-hang" },
  { group: "hang-hoa", href: "/bao-cao/hang-hoa" },
  { group: "nha-cung-cap", href: "/bao-cao/nha-cung-cap" },
  { group: "tai-chinh", href: "/bao-cao/tai-chinh" },
  { group: "cuoi-ngay", href: "/bao-cao/cuoi-ngay" },
];

export default function BaoCaoIndexPage() {
  const router = useRouter();
  const { _hasHydrated, isProfileSynced, isAuthenticated } = useAuthStore();
  const { groupAllowed, anyReport } = useReportAccess();

  const target = GROUP_ROUTES.find((g) => groupAllowed(g.group))?.href;

  // Chỉ điều hướng sau khi đã hydrate + sync profile (tránh dùng permissions cũ).
  const ready = _hasHydrated && (!isAuthenticated || isProfileSynced);

  useEffect(() => {
    if (ready && target) {
      router.replace(target);
    }
  }, [ready, target, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!anyReport || !target) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500 mb-6">
            Tài khoản của bạn chưa được cấp quyền xem báo cáo. Vui lòng liên hệ
            quản trị viên.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Đang điều hướng tới nhóm đầu tiên có quyền.
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
    </div>
  );
}
