"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useCan } from "@/lib/hooks/useCan";
import { IntelOverviewTab } from "@/components/message-intel/IntelOverviewTab";
import { IntelMessagesTab } from "@/components/message-intel/IntelMessagesTab";
import { IntelReviewTab } from "@/components/message-intel/IntelReviewTab";
import { IntelSandboxTab } from "@/components/message-intel/IntelSandboxTab";
import { IntelSettingsTab } from "@/components/message-intel/IntelSettingsTab";
import { IntelExclusionsTab } from "@/components/message-intel/IntelExclusionsTab";
import { IntelRangeBar, rangeOf, type IntelPreset } from "@/components/message-intel/IntelRangeBar";

type Tab = "tong-quan" | "tin-nhan" | "cham-nhan" | "thu-nghiem" | "loai-tru" | "cau-hinh";

/** Cài đặt → Phân tích tin nhắn: AI phân loại từng tin nhắn Smax (Message Intelligence). */
export default function MessageIntelPage() {
  const router = useRouter();
  const params = useSearchParams();
  const canManage = useCan("message_intel", "manage");
  const canChat = useCan("smax_chat", "view");
  const tabs = (
    [
      ["tong-quan", "Tổng quan", true],
      ["tin-nhan", "Tin nhắn", true],
      ["cham-nhan", "Chấm nhãn", canChat],
      ["thu-nghiem", "Thử nghiệm", canManage],
      ["loai-tru", "Loại trừ", canManage],
      ["cau-hinh", "Cấu hình", canManage],
    ] as const
  ).filter(([, , ok]) => ok);
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some(([k]) => k === requested) ? requested! : "tong-quan";
  const [preset, setPreset] = useState<IntelPreset>("7d");
  const [pagePid, setPagePid] = useState("");
  const range = useMemo(() => ({ ...rangeOf(preset), pagePid: pagePid || undefined }), [preset, pagePid]);

  return (
    <PagePermissionGuard resource="message_intel" action="view">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Phân tích tin nhắn</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--dt-text-secondary)" }}>
              AI (TypeSafe Jev) phân loại từng tin nhắn khách trong kho tin Smax: ý định, chủ đề, cảm xúc, độ khẩn.
            </p>
          </div>
          <div className="dt-seg dt-seg-sm w-fit" role="tablist" aria-label="Phân tích tin nhắn">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-on={tab === key}
                onClick={() => router.replace(`/cai-dat/phan-tich-tin-nhan${key === "tong-quan" ? "" : `?tab=${key}`}`)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {(tab === "tong-quan" || tab === "tin-nhan") && (
          <IntelRangeBar preset={preset} onPreset={setPreset} pagePid={pagePid} onPagePid={setPagePid} range={range} />
        )}
        {tab === "tong-quan" && <IntelOverviewTab range={range} />}
        {tab === "tin-nhan" && <IntelMessagesTab range={range} />}
        {tab === "cham-nhan" && <IntelReviewTab />}
        {tab === "thu-nghiem" && <IntelSandboxTab />}
        {tab === "loai-tru" && <IntelExclusionsTab />}
        {tab === "cau-hinh" && <IntelSettingsTab />}
      </div>
    </PagePermissionGuard>
  );
}
