"use client";

import { ShieldOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SmaxDashboard } from "@/components/reports/smax/SmaxDashboard";
import { DailyChatReport } from "@/components/reports/smax/DailyChatReport";
import { useReportAccess } from "@/lib/permissions/reportPermissions";
import { useCan } from "@/lib/hooks/useCan";

export default function SmaxReportPage() {
  const { groupAllowed } = useReportAccess();
  // Báo cáo chat cuối ngày (AI): quyền dùng Trợ lý AI, như API backend
  const canDaily = useCan("ai_assistant", "use");
  const canStats = groupAllowed("smax");
  const router = useRouter();
  const params = useSearchParams();
  // ?tab=cuoi-ngay&ngay=YYYY-MM-DD — link "xem danh sách đầy đủ" trên card Lark
  const tab = canDaily && (params.get("tab") === "cuoi-ngay" || !canStats) ? "cuoi-ngay" : "tong-quan";

  if (!canStats && !canDaily) {
    return (
      <div className="flex-1 grid place-items-center p-8 text-center">
        <div>
          <ShieldOff className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-gray-600">Bạn chưa có quyền xem báo cáo này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {canStats && canDaily && (
        <div className="px-4 pt-3">
          <div className="dt-seg dt-seg-sm w-fit" role="tablist" aria-label="Báo cáo Smax chat">
            {(
              [
                ["tong-quan", "Tổng quan"],
                ["cuoi-ngay", "Báo cáo chat cuối ngày"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-on={tab === key}
                onClick={() => router.replace(key === "tong-quan" ? "/bao-cao/smax" : "/bao-cao/smax?tab=cuoi-ngay")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 flex">
        {tab === "cuoi-ngay" ? <DailyChatReport initialDay={params.get("ngay")} /> : <SmaxDashboard />}
      </div>
    </div>
  );
}
