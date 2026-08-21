"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useDebtTickets } from "@/lib/hooks/useDebtTickets";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  DebtTicketStatus,
  TICKET_STATUS_LABELS,
} from "@/lib/api/debt-tickets";

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";

type TabValue = DebtTicketStatus | "OPEN_ALL" | "ALL";

const STATUS_TABS: { value: TabValue; label: string }[] = [
  { value: "OPEN_ALL", label: "Đang xử lý" },
  { value: "REQUESTED", label: "Yêu Cầu Thu Hồi Nợ" },
  { value: "IN_PROGRESS", label: "Đang Tiến Hành" },
  { value: "WAITING", label: "Chờ Thanh Toán" },
  { value: "PAID", label: "Đã Thanh Toán" },
  { value: "ALL", label: "Tất cả" },
];

const STATUS_STYLE: Record<DebtTicketStatus, { cls: string; Icon: LucideIcon }> =
  {
    REQUESTED: {
      cls: "bg-slate-50 text-slate-700 border-slate-200",
      Icon: Clock,
    },
    IN_PROGRESS: {
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: Clock,
    },
    WAITING: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: Clock,
    },
    PAID: {
      cls: "bg-green-50 text-green-700 border-green-200",
      Icon: CheckCircle2,
    },
    DONE: {
      cls: "bg-green-50 text-green-700 border-green-200",
      Icon: CheckCircle2,
    },
    ENDED: {
      cls: "bg-gray-100 text-gray-500 border-gray-200",
      Icon: XCircle,
    },
  };

export default function TicketCongNoPage() {
  const [status, setStatus] = useState<TabValue>("OPEN_ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [page, setPage] = useState(1);

  const { data: usersData } = useUsersForFilter();
  const users = usersData ?? [];

  const params = useMemo(
    () => ({
      status:
        status === "ALL" || status === "OPEN_ALL"
          ? undefined
          : (status as DebtTicketStatus),
      openOnly: status === "OPEN_ALL" ? ("true" as const) : undefined,
      search: search || undefined,
      assigneeId: assigneeId || undefined,
      page,
      pageSize: 20,
    }),
    [status, search, assigneeId, page]
  );

  const { data, isLoading } = useDebtTickets(params);
  const tickets = data?.data ?? [];
  const pg = data?.pagination;

  return (
    <PagePermissionGuard resource="debt_tickets" action="view">
      <div className="flex flex-col h-full p-4 gap-3">
        <div className="bg-white border rounded-lg">
          <div className="flex items-center gap-1 px-3 pt-2 border-b overflow-x-auto">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  status === t.value
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(searchInput.trim());
                    setPage(1);
                  }
                }}
                placeholder="Tìm mã phiếu, tiêu đề, tên khách…"
                className="w-full border rounded pl-8 pr-3 py-1.5 text-sm"
              />
            </div>

            <select
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value ? Number(e.target.value) : "");
                setPage(1);
              }}
              className="border rounded px-2.5 py-1.5 text-sm"
            >
              <option value="">Mọi nhân viên</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            <Link
              href="/khach-hang/theo-doi-cong-no"
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Theo dõi công nợ
            </Link>
          </div>
        </div>

        <div className="flex-1 bg-white border rounded-lg overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
              <Inbox className="w-12 h-12 mb-3" />
              <p className="text-sm">Chưa có phiếu thu hồi nợ nào</p>
              <p className="text-xs mt-1">
                Tạo phiếu từ trang Theo dõi công nợ bằng cách chọn các khách cần thu hồi.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600 border-b">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium">Mã</th>
                    <th className="text-left px-3 py-2.5 font-medium">Tiêu đề</th>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Phụ trách
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium">Khách</th>
                    <th className="text-right px-3 py-2.5 font-medium">
                      Nợ đầu kì
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium">
                      Tối thiểu
                    </th>
                    <th className="text-right px-3 py-2.5 font-medium">
                      Khách xác nhận
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Tiến độ
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium">
                      Trạng thái
                    </th>
                    <th className="text-left px-3 py-2.5 font-medium">Tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.map((t) => {
                    const st = STATUS_STYLE[t.status];
                    const pct =
                      t.summary.customerCount > 0
                        ? Math.round(
                            (t.summary.paidCount / t.summary.customerCount) * 100
                          )
                        : 0;
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link
                            href={`/khach-hang/ticket-cong-no/${t.id}`}
                            className="text-brand font-medium hover:underline"
                          >
                            {t.code}
                          </Link>
                        </td>
                        <td className="px-3 py-2 max-w-[240px] truncate">
                          {t.title || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{t.assignee?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.summary.customerCount}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(t.summary.totalDebtAtCreate)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(t.summary.totalMinimum)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.summary.totalConfirmed > 0
                            ? fmt(t.summary.totalConfirmed)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums">
                              {t.summary.paidCount}/{t.summary.customerCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${st.cls}`}
                          >
                            <st.Icon className="w-3 h-3" />
                            {TICKET_STATUS_LABELS[t.status]}
                          </span>
                          {t.closeMode === "AUTO" && (
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              Tự động
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {fmtDate(t.createdAt)}
                          <div className="text-gray-400">
                            {t.creator?.name}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pg && pg.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t text-sm">
              <span className="text-gray-500">
                {(pg.page - 1) * pg.pageSize + 1}–
                {Math.min(pg.page * pg.pageSize, pg.total)} / {pg.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pg.page <= 1}
                  onClick={() => setPage(pg.page - 1)}
                  className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  {pg.page} / {pg.totalPages}
                </span>
                <button
                  disabled={pg.page >= pg.totalPages}
                  onClick={() => setPage(pg.page + 1)}
                  className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PagePermissionGuard>
  );
}
