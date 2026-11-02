"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ClipboardList, FileText, Plus, Search } from "lucide-react";
import { useLeads } from "@/lib/hooks/useLeads";
import { useColumnVisibility, type ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import { useCan } from "@/lib/hooks/useCan";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { TablePagination } from "@/components/shared/TablePagination";
import { ThreadKindLogo } from "@/components/chat/ThreadKindIcon";
import { CustomTooltip } from "@/components/ui/CustomTooltip";
import {
  LEAD_CATEGORY_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_COLOR,
  LEAD_STATUS_LABEL,
  leadCode,
} from "@/lib/leads/constants";
import type { Lead, LeadFilters } from "@/lib/types/lead";
import { LeadDetailRow } from "./LeadDetailRow";

const DEFAULT_COLUMNS: ColumnConfig<Lead>[] = [
  { key: "code", label: "Mã Lead", visible: true, render: (l) => <span className="font-medium text-brand">{leadCode(l.id)}</span> },
  { key: "name", label: "Tên", visible: true, render: (l) => <span className="font-medium">{l.name}</span> },
  { key: "phone", label: "SĐT", visible: true, render: (l) => l.phone || "—" },
  { key: "category", label: "Phân loại", visible: true, render: (l) => LEAD_CATEGORY_LABEL[l.category] },
  { key: "province", label: "Khu vực", visible: true, render: (l) => l.provinceName || "—" },
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
  { key: "cskh", label: "CSKH", visible: true, render: (l) => l.cskhUser?.name ?? "—" },
  {
    key: "sale",
    label: "Sale PIC",
    visible: true,
    render: (l) =>
      l.salePic && l.salePicFromCustomer ? (
        <CustomTooltip content="Theo Sale PIC của khách hàng đã gắn" delayMs={200}>
          <span>{l.salePic.name}</span>
        </CustomTooltip>
      ) : (
        (l.salePic?.name ?? "—")
      ),
  },
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
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    render: (l) => <LeadCustomersCell customers={l.customers} />,
  },
  {
    key: "createdAt",
    label: "Ngày tạo",
    visible: true,
    render: (l) => new Date(l.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
  },
];

// Cột cố định khi cuộn ngang: Mã Lead (rộng cố định) + Tên
const CODE_WIDTH = 128;
const CODE_SIZE = { width: CODE_WIDTH, minWidth: CODE_WIDTH, maxWidth: CODE_WIDTH };
const stickyLeft = (key: string, codeVisible: boolean) =>
  key === "code" ? 0 : key === "name" ? (codeVisible ? CODE_WIDTH : 0) : null;

/** 1 khách → mã (tooltip tên); nhiều khách → "N khách hàng", bấm xem danh sách. */
function LeadCustomersCell({ customers }: { customers: Lead["customers"] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const link = (c: Lead["customers"][number]) => (
    <Link
      href={`/khach-hang?Code=${encodeURIComponent(c.code ?? "")}`}
      onClick={(e) => e.stopPropagation()}
      className="text-brand hover:underline">
      {c.code}
    </Link>
  );

  if (!customers.length) return <>—</>;
  if (customers.length === 1)
    return (
      <CustomTooltip content={customers[0].name} delayMs={200}>
        {link(customers[0])}
      </CustomTooltip>
    );
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          setPos(pos ? null : { top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 296) });
        }}
        className="text-brand hover:underline">
        {customers.length} khách hàng
      </button>
      {pos &&
        createPortal(
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 max-h-64 w-72 overflow-auto rounded-lg border bg-white py-1 text-sm shadow-xl">
            {customers.map((c) => (
              <div key={c.id} className="px-3 py-1.5 hover:bg-gray-50">
                {link(c)}
                <div className="truncate text-xs text-gray-500">{c.name}</div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

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
  const codeVisible = visibleColumns.some((c) => c.key === "code");

  return (
    <div className="flex-1 min-w-0 flex flex-col m-4 ml-0 rounded-xl border bg-white shadow-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Lead</h1>
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm theo mã, tên, SĐT"
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
          {canUpdate && (
            <Link
              href="/khach-hang/lead/form"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              <ClipboardList className="h-4 w-4" /> Form thu thập
            </Link>
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
              {visibleColumns.map((c) => {
                const left = stickyLeft(c.key, codeVisible);
                return (
                  <th
                    key={c.key}
                    style={left === null ? undefined : { left, ...(c.key === "code" && CODE_SIZE) }}
                    className={`px-4 py-3 font-medium whitespace-nowrap ${
                      left === null ? "" : "sticky z-10 bg-gray-50"
                    } ${c.key === "name" ? "shadow-[inset_-1px_0_0_#e5e7eb]" : ""}`}>
                    {c.label}
                  </th>
                );
              })}
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
                  className={`group cursor-pointer border-b hover:bg-gray-50 ${expandedId === l.id ? "bg-brand-soft" : ""}`}>
                  {visibleColumns.map((c) => {
                    const left = stickyLeft(c.key, codeVisible);
                    return (
                      <td
                        key={c.key}
                        style={left === null ? undefined : { left, ...(c.key === "code" && CODE_SIZE) }}
                        className={`px-4 py-2.5 whitespace-nowrap ${
                          left === null
                            ? ""
                            : // brand-soft trong suốt → phủ lên nền trắng để che cột cuộn phía sau
                              `sticky z-[1] ${expandedId === l.id ? "bg-white bg-[linear-gradient(var(--dt-color-primary-soft),var(--dt-color-primary-soft))]" : "bg-white group-hover:bg-gray-50"}`
                        } ${c.key === "name" ? "shadow-[inset_-1px_0_0_#e5e7eb]" : ""}`}>
                        {c.render(l)}
                      </td>
                    );
                  })}
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
