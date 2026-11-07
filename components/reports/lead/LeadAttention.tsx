"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import {
  HANDOVER_STEP_LABEL,
  type LeadAttention as Attention,
  type LeadSource,
} from "@/lib/dashboard/lead/leadDashboard.types";
import { hoursText, shortDateTime } from "@/lib/dashboard/lead/leadFormat";
import { LEAD_SOURCE_LABEL, leadCode, leadHref } from "@/lib/leads/constants";
import { CountBadge, LeadCard } from "./leadUi";

function Row({
  leadId,
  name,
  source,
  meta,
  chip,
  chipHot,
}: {
  leadId: number;
  name: string;
  source: LeadSource;
  meta: string;
  chip: string;
  chipHot: boolean;
}) {
  return (
    <li>
      <Link
        href={leadHref(leadId)}
        target="_blank"
        className="flex items-start gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-[var(--dt-bg-soft)]">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate">{name}</div>
          <div
            className="text-[11.5px] truncate"
            style={{ color: "var(--dt-text-muted)" }}>
            {leadCode(leadId)} · {LEAD_SOURCE_LABEL[source]} · {meta}
          </div>
        </div>
        <span
          className="dt-mono text-[11.5px] font-semibold px-2 py-[2px] rounded-full whitespace-nowrap shrink-0"
          style={
            chipHot
              ? { background: "rgba(192,57,43,0.1)", color: "#C0392B" }
              : { background: "rgba(201,168,76,0.14)", color: "#9A7A2A" }
          }>
          {chip}
        </span>
      </Link>
    </li>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  total,
  shown,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  total: number;
  shown: number;
  children: ReactNode;
}) {
  return (
    <LeadCard
      title={
        <span className="inline-flex items-center gap-2">
          {icon}
          {title}
        </span>
      }
      subtitle={subtitle}
      right={<CountBadge n={total} />}>
      {total === 0 ? (
        <p className="text-[13px] py-6 text-center" style={{ color: "var(--dt-text-muted)" }}>
          Không có mục nào cần xử lý 🎉
        </p>
      ) : (
        <>
          <ul className="max-h-[300px] overflow-y-auto divide-y" style={{ borderColor: "var(--dt-border)" }}>
            {children}
          </ul>
          {total > shown && (
            <p className="text-[11.5px] mt-2" style={{ color: "var(--dt-text-muted)" }}>
              Hiển thị {shown}/{total} mục
            </p>
          )}
        </>
      )}
    </LeadCard>
  );
}

export function LeadAttentionSection({ data }: { data: Attention }) {
  const ic = "w-4 h-4";
  return (
    <div id="lead-attention" className="grid gap-3 xl:grid-cols-3">
      <Panel
        icon={<Clock className={`${ic} text-[#C0392B]`} />}
        title="Lead mới chưa chăm sóc"
        subtitle="Quá 24 giờ kể từ lúc lead vào"
        total={data.staleNew.total}
        shown={data.staleNew.items.length}>
        {data.staleNew.items.map((x) => (
          <Row
            key={x.leadId}
            {...x}
            meta={x.cskhName ?? "Chưa gán CSKH"}
            chip={hoursText(x.hoursOpen)}
            chipHot={x.hoursOpen >= 48}
          />
        ))}
      </Panel>
      <Panel
        icon={<Unplug className={`${ic} text-[#9A7A2A]`} />}
        title="Chuyển giao có bước lỗi"
        subtitle="Ít nhất 1 bước (Lark / Zalo / lời chào) thất bại"
        total={data.handoverErrors.total}
        shown={data.handoverErrors.items.length}>
        {data.handoverErrors.items.map((x) => (
          <Row
            key={x.handoverId}
            {...x}
            meta={`${x.error} · ${shortDateTime(x.at)}`}
            chip={HANDOVER_STEP_LABEL[x.failedStep]}
            chipHot
          />
        ))}
      </Panel>
      <Panel
        icon={<AlertTriangle className={`${ic} text-[#9A7A2A]`} />}
        title="Đã chuyển Sale chưa có đơn"
        subtitle="Quá 14 ngày kể từ lúc chuyển Sale"
        total={data.staleHanded.total}
        shown={data.staleHanded.items.length}>
        {data.staleHanded.items.map((x) => (
          <Row
            key={x.leadId}
            {...x}
            meta={`${x.salePicName ?? "Chưa gán Sale PIC"}${x.hasCustomer ? "" : " · chưa có mã KH"}`}
            chip={`${x.daysSinceHandover} ngày`}
            chipHot={x.daysSinceHandover >= 30}
          />
        ))}
      </Panel>
    </div>
  );
}
