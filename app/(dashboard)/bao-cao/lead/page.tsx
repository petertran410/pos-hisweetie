"use client";

import { ShieldOff } from "lucide-react";
import { LeadDashboard } from "@/components/reports/lead/LeadDashboard";
import { useReportAccess } from "@/lib/permissions/reportPermissions";

export default function LeadReportPage() {
  const { groupAllowed } = useReportAccess();

  if (!groupAllowed("lead")) {
    return (
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div>
          <ShieldOff className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-gray-600">Bạn chưa có quyền xem báo cáo này.</p>
        </div>
      </div>
    );
  }

  return <LeadDashboard />;
}
