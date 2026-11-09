"use client";

import { vi } from "@/lib/dashboard/format";
import type {
  LeadCskhRow,
  LeadSalePicRow,
} from "@/lib/dashboard/lead/leadDashboard.types";
import { minutesText } from "@/lib/dashboard/lead/leadFormat";
import { CountBadge, LeadCard, RateCell } from "./leadUi";
import { SortableTable, type SortColumn } from "./SortableTable";

const num = (v: number) => <span className="dt-mono">{vi(v)}</span>;

const nameCell = (name: string) => <span className="font-medium">{name}</span>;

export function LeadCskhTable({ rows }: { rows: LeadCskhRow[] }) {
  const maxRate = Math.max(...rows.map((r) => r.conversionRate), 0);
  const columns: SortColumn<LeadCskhRow>[] = [
    { key: "name", header: "CSKH", sortValue: (r) => r.name, render: (r) => nameCell(r.name) },
    { key: "received", header: "Lead nhận", align: "right", sortValue: (r) => r.received, render: (r) => num(r.received) },
    { key: "cared", header: "Đã chăm sóc", align: "right", sortValue: (r) => r.cared, render: (r) => num(r.cared) },
    { key: "handed", header: "Chuyển Sale", align: "right", sortValue: (r) => r.handedOver, render: (r) => num(r.handedOver) },
    { key: "converted", header: "Chuyển đổi", align: "right", sortValue: (r) => r.converted, render: (r) => num(r.converted) },
    {
      key: "rate",
      header: "Tỷ lệ CĐ",
      align: "right",
      hint: "Chuyển đổi ÷ (lead nhận − Huỷ)",
      sortValue: (r) => r.conversionRate,
      render: (r) => <RateCell value={r.conversionRate} max={maxRate} />,
    },
    {
      key: "response",
      header: "Phản hồi đầu TB",
      align: "right",
      hint: "Thời gian TB từ lúc lead vào đến lần đầu rời trạng thái Mới hoặc chuyển giao",
      sortValue: (r) => r.avgFirstResponseMinutes ?? Number.MAX_SAFE_INTEGER,
      render: (r) =>
        r.avgFirstResponseMinutes === null ? (
          <span style={{ color: "var(--dt-text-muted)" }}>—</span>
        ) : (
          <span
            className="dt-mono"
            style={r.avgFirstResponseMinutes > 180 ? { color: "#C0392B", fontWeight: 600 } : undefined}>
            {minutesText(r.avgFirstResponseMinutes)}
          </span>
        ),
    },
    {
      key: "overdue",
      header: "Mới > 24 giờ",
      align: "right",
      hint: "Lead Mới quá 24 giờ chưa chăm sóc",
      sortValue: (r) => r.overdueNew,
      render: (r) => <CountBadge n={r.overdueNew} />,
    },
  ];
  return (
    <LeadCard title="Hiệu suất CSKH" subtitle="Bấm tiêu đề cột để sắp xếp">
      <SortableTable
        caption="Hiệu suất nhân viên CSKH"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.userId}
        defaultSort={{ key: "converted", dir: "desc" }}
      />
    </LeadCard>
  );
}

export function LeadSalePicTable({ rows }: { rows: LeadSalePicRow[] }) {
  const maxRate = Math.max(...rows.map((r) => r.conversionRate), 0);
  const columns: SortColumn<LeadSalePicRow>[] = [
    { key: "name", header: "Sale PIC", sortValue: (r) => r.name, render: (r) => nameCell(r.name) },
    { key: "received", header: "Lead nhận", align: "right", sortValue: (r) => r.received, render: (r) => num(r.received) },
    { key: "customer", header: "Có mã KH", align: "right", sortValue: (r) => r.withCustomer, render: (r) => num(r.withCustomer) },
    { key: "ordered", header: "Có đơn", align: "right", sortValue: (r) => r.ordered, render: (r) => num(r.ordered) },
    {
      key: "rate",
      header: "Tỷ lệ CĐ",
      align: "right",
      hint: "Có đơn ÷ (lead nhận − Huỷ)",
      sortValue: (r) => r.conversionRate,
      render: (r) => <RateCell value={r.conversionRate} max={maxRate} color="#C9A84C" />,
    },
    {
      key: "days",
      header: "TB ngày tới đơn đầu",
      align: "right",
      hint: "Số ngày TB từ lúc chuyển Sale đến đơn đầu",
      sortValue: (r) => r.avgDaysToFirstOrder ?? Number.MAX_SAFE_INTEGER,
      render: (r) =>
        r.avgDaysToFirstOrder === null ? (
          <span style={{ color: "var(--dt-text-muted)" }}>—</span>
        ) : (
          <span className="dt-mono">
            {r.avgDaysToFirstOrder.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ngày
          </span>
        ),
    },
    {
      key: "overdue",
      header: "Quá 14 ngày chưa đơn",
      align: "right",
      sortValue: (r) => r.overdueNoOrder,
      render: (r) => <CountBadge n={r.overdueNoOrder} />,
    },
  ];
  return (
    <LeadCard title="Hiệu suất Sale PIC" subtitle="Bấm tiêu đề cột để sắp xếp">
      <SortableTable
        caption="Hiệu suất Sale PIC"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.userId}
        defaultSort={{ key: "ordered", dir: "desc" }}
      />
    </LeadCard>
  );
}
