"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCustomerJourney } from "@/lib/hooks/useLeads";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_LINK_METHOD_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABEL,
  leadHref,
} from "@/lib/leads/constants";
import { JourneyStepper } from "./JourneyStepper";
import { JourneyTimeline } from "./JourneyTimeline";

/** Tab "Hành trình" ở trang khách hàng: khách đến từ lead nào, các mốc và dòng thời gian. */
export function CustomerJourneyTab({ customerId }: { customerId: number }) {
  const { data, isLoading, error } = useCustomerJourney(customerId);
  if (isLoading) {
    return (
      <p className="text-sm text-gray-500">
        <Loader2 className="inline h-4 w-4 animate-spin" /> Đang tải hành trình…
      </p>
    );
  }
  if (error || !data) return <p className="text-sm text-red-600">{(error as Error)?.message || "Không tải được hành trình"}</p>;
  const lead = data.lead;
  return (
    <div className="space-y-5 text-sm">
      {lead ? (
        <div className="rounded-lg border bg-gray-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Nguồn khách</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
            <Item label="Lead">
              <Link href={leadHref(lead.id)} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                {lead.code}
              </Link>{" "}
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_COLOR[lead.status]}`}>
                {LEAD_STATUS_LABEL[lead.status]}
              </span>
            </Item>
            <Item label="Nguồn">
              {LEAD_SOURCE_LABEL[lead.source]}
              {lead.channelName ? ` · ${lead.channelName}` : ""}
            </Item>
            <Item label="Phân loại">{LEAD_CATEGORY_LABEL[lead.category]}</Item>
            <Item label="Ngày tạo lead">{new Date(lead.createdAt).toLocaleString("vi-VN")}</Item>
            <Item label="CSKH">{lead.cskh?.name ?? "—"}</Item>
            <Item label="Sale nhận">{lead.salePic?.name ?? "—"}</Item>
            <Item label="Gắn khách">
              {lead.linkMethod ? LEAD_LINK_METHOD_LABEL[lead.linkMethod] : "—"}
              {lead.linkedAt ? ` · ${new Date(lead.linkedAt).toLocaleDateString("vi-VN")}` : ""}
            </Item>
            <Item label="Chuyển đổi">
              {lead.convertedAt ? new Date(lead.convertedAt).toLocaleString("vi-VN") : "Chưa có đơn đặt hàng"}
            </Item>
          </dl>
          {data.otherLeads.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Lead khác của khách:{" "}
              {data.otherLeads.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && ", "}
                  <Link href={leadHref(l.id)} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {l.code}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Khách chưa gắn với lead nào (khách cũ hoặc tạo trực tiếp).</p>
      )}
      <JourneyStepper milestones={data.milestones} />
      <JourneyTimeline events={data.events} />
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
