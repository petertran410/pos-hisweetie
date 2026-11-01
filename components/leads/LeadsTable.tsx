"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { useLeads } from "@/lib/hooks/useLeads";
import { useColumnVisibility, type ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import { useCan } from "@/lib/hooks/useCan";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { ThreadKindLogo } from "@/components/chat/ThreadKindIcon";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABEL,
} from "@/lib/leads/constants";
import type { Lead, LeadFilters } from "@/lib/types/lead";
import { LeadDetailRow } from "./LeadDetailRow";

const DEFAULT_COLUMNS: ColumnConfig<Lead>[] = [
  { key: "name", label: "Tên", visible: true, render: (l) => <span className="font-medium">{l.name}</span> },
  { key: "phone", label: "SĐT", visible: true, render: (l) => l.phone || "—" },
  {
    key: "source",
    label: "Nguồn",
    visible: true,
    render: (l) => (
      <span className="inline-flex items-center gap-1.5">
        {l.source === "facebook" && <ThreadKindLogo className="h-3.5 w-3.5" />}
        {LEAD_SOURCE_LABEL[l.source]}
      </span>
    ),
  },
  { key: "channel", label: "Kênh", visible: true, render: (l) => l.channelName || "—" },
  { key: "category", label: "Phân loại", visible: true, render: (l) => LEAD_CATEGORY_LABEL[l.category] },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    render: (l) =>
      l.customers.length ? (
        <span className="flex flex-col">
          {l.customers.map((c) => (
            <Link
              key={c.id}
              href={`/khach-hang?Code=${encodeURIComponent(c.code ?? "")}`}
              onClick={(e) => e.stopPropagation()}
              className="text-brand hover:underline">
              {c.code} - {c.name}
            </Link>
          ))}
        </span>
      ) : (
        "—"
      ),
  },
  { key: "province", label: "Khu vực", visible: true, render: (l) => l.provinceName || "—" },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (l) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLOR[l.status]}`}>
        {LEAD_STATUS_LABEL[l.status]}
      </span>
    ),
  },
  { key: "cskh", label: "CSKH", visible: true, render: (l) => l.cskhUser?.name ?? "—" },
  { key: "sale", label: "Sale PIC", visible: true, render: (l) => l.salePic?.name ?? "—" },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: true,
    render: (l) => new Date(l.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
  },
];

/** Bảng lead: tìm theo tên/SĐT, bấm dòng mở chi tiết (lead mở sẵn khi có ?id=). */
export function LeadsTable({
  filters,
  openId,
  onCreateClick,
  onTemplatesClick,
}: {
  filters: LeadFilters;
  openId: number | null;
  onCreateClick: () => void;
  onTemplatesClick: () => void;
}) {
  const canUpdate = useCan("leads", "update");
  const canTemplates = useCan("settings", "update");
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility("leadTableColumns", DEFAULT_COLUMNS);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [expandedId, setExpandedId] = useState<number | null>(openId);

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  // Lọc / tìm đổi → về trang 1
  const [prevKey, setPrevKey] = useState("");
  const key = JSON.stringify([filters, q]);
  if (key !== prevKey) {
    setPrevKey(key);
    setPage(1);
  }

  const { data, isLoading } = useLeads({ ...filters, q: q || undefined, page, limit });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const colSpan = visibleColumns.length;

  return (
    <div className="flex-1 min-w-0 flex flex-col m-4 ml-0 rounded-xl border bg-white shadow-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Lead</h1>
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm theo tên, SĐT"
            className="w-full rounded-lg border py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canUpdate && (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Tạo lead
            </button>
          )}
          {canTemplates && (
            <button
              onClick={onTemplatesClick}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              <FileText className="h-4 w-4" /> Mẫu tin
            </button>
          )}
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {visibleColumns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={colSpan} className="py-8 text-center text-gray-500">
                  Đang tải…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="py-8 text-center text-gray-500">
                  Chưa có lead nào
                </td>
              </tr>
            )}
            {rows.map((l) => (
              <Fragment key={l.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                  className={`cursor-pointer border-b hover:bg-gray-50 ${expandedId === l.id ? "bg-brand-soft" : ""}`}>
                  {visibleColumns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 whitespace-nowrap">
                      {c.render(l)}
                    </td>
                  ))}
                </tr>
                {expandedId === l.id && <LeadDetailRow leadId={l.id} colSpan={colSpan} />}
              </Fragment>
            ))}
            {/* Lead mở từ link (?id=) nhưng không nằm trong trang đang xem */}
            {openId && expandedId === openId && !rows.some((l) => l.id === openId) && !isLoading && (
              <LeadDetailRow leadId={openId} colSpan={colSpan} />
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / limit))}
        total={total}
        limit={limit}
        limitOptions={[10, 15, 20, 50, 100]}
        unit="lead"
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />
    </div>
  );
}
