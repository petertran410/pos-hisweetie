"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { QuoteTemplatesSettings } from "@/components/quote-templates/QuoteTemplatesSettings";
import { PublicPriceSettings } from "@/components/public-price/PublicPriceSettings";

const TABS = [
  { key: "mau", label: "Mẫu báo giá" },
  { key: "bang-gia-public", label: "Bảng giá public" },
] as const;

export default function QuoteTemplatesPage() {
  const router = useRouter();
  const tab = useSearchParams().get("tab") === "bang-gia-public" ? "bang-gia-public" : "mau";
  return (
    <PagePermissionGuard resource="quote_templates" action="view">
      <div className="flex flex-col h-full">
        <div role="tablist" aria-label="Cài đặt báo giá" className="flex gap-1 border-b bg-white px-6 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => router.replace(t.key === "mau" ? "?" : `?tab=${t.key}`, { scroll: false })}
              className={`px-3 py-2.5 text-sm border-b-2 -mb-px ${tab === t.key ? "border-brand font-semibold text-brand-dark" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className={`flex-1 min-h-0 ${tab === "mau" ? "overflow-hidden" : "overflow-auto bg-gray-50"}`}>{tab === "mau" ? <QuoteTemplatesSettings /> : <PublicPriceSettings />}</div>
      </div>
    </PagePermissionGuard>
  );
}
