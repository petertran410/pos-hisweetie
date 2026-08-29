"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import {
  useDebtTicket,
  useCloseDebtTicket,
  useCancelDebtTicket,
  useUpdateDebtTicket,
  useUpdateDebtTicketLine,
  useRemoveTicketCustomer,
} from "@/lib/hooks/useDebtTickets";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  DebtTicketStatus,
  DebtTicketLineStatus,
  TICKET_STATUS_LABELS,
  TICKET_LINE_STATUS_LABELS,
} from "@/lib/api/debt-tickets";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";

const LINE_STYLE: Record<DebtTicketLineStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
};

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
    ENDED: { cls: "bg-gray-100 text-gray-500 border-gray-200", Icon: XCircle },
  };

/** Các bước cho phép chuyển thủ công. */
const STEP_OPTIONS: DebtTicketStatus[] = [
  "REQUESTED",
  "IN_PROGRESS",
  "WAITING",
];

type EditField = "minimumPayment" | "confirmedAmount";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const { data: ticket, isLoading } = useDebtTicket(id);
  const closeMut = useCloseDebtTicket();
  const cancelMut = useCancelDebtTicket();
  const updateTicket = useUpdateDebtTicket();
  const updateLine = useUpdateDebtTicketLine();
  const removeCustomer = useRemoveTicketCustomer();

  const canUpdate = usePermission("debt_tickets", "update");
  const canClose = usePermission("debt_tickets", "close");

  const [editing, setEditing] = useState<{
    customerId: number;
    field: EditField;
  } | null>(null);
  const [draft, setDraft] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-gray-500">
        Không tìm thấy phiếu thu hồi nợ
      </div>
    );
  }

  const isOpen = ticket.isOpen;
  const st = STATUS_STYLE[ticket.status];

  const handleClose = async () => {
    const notPaid = ticket.summary.pendingCount;
    const html = ticket.summary.isFullyPaid
      ? "Tất cả khách đã thu đủ."
      : `Còn <b>${notPaid}</b> khách chưa thu đủ. Phiếu sẽ được kết thúc thủ công.`;

    const res = await Swal.fire({
      title: "Kết thúc phiếu?",
      html: `${html}<br/><br/>Vui lòng nhập lý do:`,
      input: "text",
      inputPlaceholder: "Lý do kết thúc…",
      showCancelButton: true,
      confirmButtonText: "Kết thúc",
      cancelButtonText: "Hủy bỏ",
      inputValidator: (v) => (!v?.trim() ? "Vui lòng nhập lý do" : undefined),
    });

    if (res.isConfirmed && res.value) {
      closeMut.mutate({ id, reason: res.value, finalStatus: "DONE" });
    }
  };

  const handleCancel = async () => {
    const res = await Swal.fire({
      title: "Dừng phiếu?",
      text: "Phiếu bị dừng sẽ không còn theo dõi nữa.",
      input: "text",
      inputPlaceholder: "Lý do dừng…",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Dừng phiếu",
      cancelButtonText: "Quay lại",
      inputValidator: (v) => (!v?.trim() ? "Vui lòng nhập lý do" : undefined),
    });

    if (res.isConfirmed && res.value) {
      cancelMut.mutate({ id, reason: res.value });
    }
  };

  const saveLine = (customerId: number, field: EditField) => {
    const value = parseNumberInput(draft);
    updateLine.mutate(
      { id, customerId, payload: { [field]: value } },
      { onSuccess: () => setEditing(null) }
    );
  };

  const handleRemove = async (customerId: number, name: string) => {
    const res = await Swal.fire({
      title: "Xóa khách khỏi phiếu?",
      text: name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });
    if (res.isConfirmed) {
      removeCustomer.mutate({ id, customerId });
    }
  };

  const renderMoneyCell = (
    l: (typeof ticket.customers)[number],
    field: EditField,
    fallback: number | null,
    warn = false
  ) => {
    const isEditing =
      editing?.customerId === l.customerId && editing?.field === field;
    const value = l[field];

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 justify-end">
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(formatNumberInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveLine(l.customerId, field);
              if (e.key === "Escape") setEditing(null);
            }}
            autoFocus
            className="w-32 border rounded px-2 py-1 text-sm text-right tabular-nums"
          />
          <button
            onClick={() => saveLine(l.customerId, field)}
            className="text-xs text-brand hover:underline"
          >
            Lưu
          </button>
        </div>
      );
    }

    return (
      <button
        disabled={!isOpen || !canUpdate}
        onClick={() => {
          setEditing({ customerId: l.customerId, field });
          setDraft(formatNumberInput(String(value ?? fallback ?? 0)));
        }}
        className={`tabular-nums hover:underline disabled:no-underline disabled:cursor-default ${
          warn ? "text-amber-600 font-medium" : ""
        }`}
      >
        {value !== null
          ? formatCurrency(value)
          : fallback !== null
            ? formatCurrency(fallback)
            : "—"}
      </button>
    );
  };

  return (
    <PagePermissionGuard resource="debt_tickets" action="view">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/khach-hang/ticket-cong-no")}
              className="p-2 hover:bg-gray-100 rounded mt-0.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold">{ticket.code}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${st.cls}`}
                >
                  <st.Icon className="w-3 h-3" />
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
                {ticket.closeMode === "AUTO" && (
                  <span className="text-xs text-gray-400">
                    (tự động khi đủ tiền)
                  </span>
                )}
              </div>
              {ticket.title && (
                <p className="text-sm text-gray-600 mt-0.5">{ticket.title}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Phụ trách: <b>{ticket.assignee?.name}</b> · Tạo bởi{" "}
                {ticket.creator?.name} ngày {fmtDate(ticket.createdAt)}
              </p>
              {ticket.closeReason && (
                <p className="text-xs text-gray-500 mt-1">
                  Lý do kết thúc: {ticket.closeReason}
                </p>
              )}
            </div>
          </div>

          {isOpen && (
            <div className="flex items-center gap-2 shrink-0">
              {canUpdate && (
                <select
                  value={ticket.status}
                  onChange={(e) =>
                    updateTicket.mutate({
                      id,
                      payload: {
                        status: e.target.value as DebtTicketStatus,
                      },
                    })
                  }
                  className="border rounded px-2.5 py-1.5 text-sm"
                >
                  {STEP_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              )}
              {canClose && (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={cancelMut.isPending}
                    className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 text-gray-600"
                  >
                    Dừng phiếu
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={closeMut.isPending}
                    className="px-3 py-1.5 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-50"
                  >
                    Kết thúc
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {ticket.note && (
          <div className="bg-gray-50 border rounded px-3 py-2 text-sm text-gray-700">
            {ticket.note}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card label="Số khách" value={String(ticket.summary.customerCount)} />
          <Card
            label="Nợ đầu kì"
            value={formatCurrency(ticket.summary.totalDebtAtCreate)}
          />
          <Card
            label="Nợ hiện tại"
            value={formatCurrency(ticket.summary.totalCurrentDebt)}
          />
          <Card
            label="Tối thiểu cần thu"
            value={formatCurrency(ticket.summary.totalMinimum)}
          />
          <Card
            label="Đã thu"
            value={`${ticket.summary.paidCount}/${ticket.summary.customerCount}`}
            tone={
              ticket.summary.isFullyPaid ? "text-green-600" : "text-gray-800"
            }
          />
        </div>

        {isOpen && !ticket.summary.isFullyPaid && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Phiếu sẽ <b>tự kết thúc</b> khi tất cả khách đã thu đủ. Khách được
              đánh dấu đã thu khi nhân viên gắn khách hàng cho giao dịch ở trang{" "}
              <Link
                href="/tai-chinh/bien-dong-so-du"
                className="underline font-medium"
              >
                Biến động số dư
              </Link>{" "}
              và số tiền về đủ so với mốc đối chiếu (ưu tiên số khách xác nhận,
              không có thì lấy số tối thiểu).
            </span>
          </div>
        )}

        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 border-b">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Khách hàng</th>
                <th className="text-right px-3 py-2.5 font-medium">
                  Nợ đầu kì
                </th>
                <th className="text-right px-3 py-2.5 font-medium">
                  Nợ cuối kì
                </th>
                <th className="text-right px-3 py-2.5 font-medium">
                  Tối thiểu
                </th>
                <th className="text-right px-3 py-2.5 font-medium">
                  Khách xác nhận
                </th>
                <th className="text-left px-3 py-2.5 font-medium">
                  Ngày xác nhận
                </th>
                <th className="text-left px-3 py-2.5 font-medium">Trạng thái</th>
                <th className="text-left px-3 py-2.5 font-medium">Đã thu</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ticket.customers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.customerName}</div>
                    <div className="text-xs text-gray-400">
                      {l.customerCode}
                      {l.contactNumber ? ` · ${l.contactNumber}` : ""}
                    </div>
                    {l.note && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {l.note}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(l.debtAtCreate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {l.currentDebt !== null
                      ? formatCurrency(l.currentDebt)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {renderMoneyCell(
                      l,
                      "minimumPayment",
                      l.debtAtCreate,
                      l.belowMinRatio
                    )}
                    {l.belowMinRatio && (
                      <div className="text-[11px] text-amber-600">
                        Dưới 30% nợ
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {renderMoneyCell(l, "confirmedAmount", null)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {fmtDate(l.confirmedDate)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs border ${LINE_STYLE[l.status]}`}
                    >
                      {TICKET_LINE_STATUS_LABELS[l.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.paidAt ? (
                      <>
                        <div className="tabular-nums text-green-700 font-medium">
                          {l.paidAmount !== null
                            ? formatCurrency(l.paidAmount)
                            : "Đã xác nhận"}
                        </div>
                        <div className="text-gray-400">{fmtDate(l.paidAt)}</div>
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isOpen && canUpdate && ticket.customers.length > 1 && (
                      <button
                        onClick={() =>
                          handleRemove(l.customerId, l.customerName)
                        }
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                        title="Xóa khỏi phiếu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PagePermissionGuard>
  );
}

function Card({
  label,
  value,
  tone = "text-gray-800",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-white border rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-0.5 ${tone}`}>
        {value}
      </div>
    </div>
  );
}
