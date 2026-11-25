"use client";

import { platformLabel } from "@/lib/chat/platforms";
import { money, vi } from "@/lib/dashboard/format";
import type {
  SmaxChannelRow,
  SmaxStaffRow,
} from "@/lib/dashboard/smax/smaxDashboard.types";
import { CountBadge, LeadCard } from "@/components/reports/lead/leadUi";
import { SortableTable, type SortColumn } from "@/components/reports/lead/SortableTable";

const num = (v: number) => <span className="dt-mono">{vi(v)}</span>;

const nameCell = (name: string) => <span className="font-medium">{name}</span>;

const dash = <span style={{ color: "var(--dt-text-muted)" }}>—</span>;

export function SmaxStaffTable({ rows }: { rows: SmaxStaffRow[] }) {
  const columns: SortColumn<SmaxStaffRow>[] = [
    { key: "name", header: "Nhân viên", sortValue: (r) => r.name, render: (r) => nameCell(r.name) },
    { key: "messages", header: "Tin gửi", align: "right", sortValue: (r) => r.messages, render: (r) => num(r.messages) },
    { key: "direct", header: "Trực tiếp", align: "right", sortValue: (r) => r.direct, render: (r) => num(r.direct) },
    { key: "group", header: "Nhóm", align: "right", sortValue: (r) => r.group, render: (r) => num(r.group) },
    { key: "links", header: "Gắn khách", align: "right", sortValue: (r) => r.links, render: (r) => num(r.links) },
    {
      key: "chatted",
      header: "Khách được chat",
      align: "right",
      hint: "Khách POS được nhân viên này chat trong kỳ",
      sortValue: (r) => r.chattedCustomers,
      render: (r) => num(r.chattedCustomers),
    },
    {
      key: "ordered",
      header: "Có đơn",
      align: "right",
      hint: "Khách có hoá đơn trong 7 ngày sau lần chat đầu",
      sortValue: (r) => r.customersWithOrder,
      render: (r) => num(r.customersWithOrder),
    },
    {
      key: "revenue",
      header: "Doanh thu",
      align: "right",
      hint: "Doanh thu hoá đơn của khách trong 7 ngày sau lần chat đầu",
      sortValue: (r) => r.revenue,
      render: (r) => (
        <span className="dt-mono" title={`${vi(r.revenue)} ₫`}>
          {money(r.revenue)}
        </span>
      ),
    },
    { key: "failures", header: "Gửi lỗi", align: "right", sortValue: (r) => r.failures, render: (r) => <CountBadge n={r.failures} /> },
  ];
  return (
    <LeadCard title="Theo nhân viên" subtitle="Bấm tiêu đề cột để sắp xếp">
      <SortableTable
        caption="Dùng chat theo nhân viên"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.userId}
        defaultSort={{ key: "messages", dir: "desc" }}
      />
    </LeadCard>
  );
}

export function SmaxChannelTable({ rows }: { rows: SmaxChannelRow[] }) {
  const columns: SortColumn<SmaxChannelRow>[] = [
    {
      key: "name",
      header: "Kênh",
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {nameCell(r.name)}
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "var(--dt-bg-soft)", color: "var(--dt-text-muted)" }}>
            {platformLabel(r.platform)}
          </span>
        </span>
      ),
    },
    { key: "messages", header: "Tin gửi", align: "right", sortValue: (r) => r.messages, render: (r) => num(r.messages) },
    { key: "direct", header: "Trực tiếp", align: "right", sortValue: (r) => r.direct, render: (r) => num(r.direct) },
    { key: "group", header: "Nhóm", align: "right", sortValue: (r) => r.group, render: (r) => num(r.group) },
    { key: "links", header: "Gắn khách", align: "right", sortValue: (r) => r.links, render: (r) => num(r.links) },
    {
      key: "new",
      header: "New",
      align: "right",
      hint: "Thread tạo trong kỳ (theo Smax)",
      sortValue: (r) => r.newThreads ?? -1,
      render: (r) => (r.newThreads === null ? dash : num(r.newThreads)),
    },
    {
      key: "renew",
      header: "Renew",
      align: "right",
      hint: "Thread tạo trước kỳ, có tin cuối trong kỳ (theo Smax)",
      sortValue: (r) => r.renewThreads ?? -1,
      render: (r) => (r.renewThreads === null ? dash : num(r.renewThreads)),
    },
    { key: "failures", header: "Gửi lỗi", align: "right", sortValue: (r) => r.failures, render: (r) => <CountBadge n={r.failures} /> },
  ];
  return (
    <LeadCard title="Theo kênh" subtitle="Bấm tiêu đề cột để sắp xếp">
      <SortableTable
        caption="Dùng chat theo kênh"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.pagePid}
        defaultSort={{ key: "messages", dir: "desc" }}
      />
    </LeadCard>
  );
}
