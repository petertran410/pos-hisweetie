"use client";

import { useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { usePcActions } from "@/lib/hooks/usePriceChange";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formatNumber } from "@/lib/utils";
import { PC_STAGE_LABEL, fmtDateTime } from "@/lib/price-change/constants";
import type {
  PcDeliveryStatus,
  PcEvent,
  PcTicketDetail,
} from "@/lib/types/price-change";

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Tạo phiếu",
  UPDATED: "Sửa phiếu",
  SUBMITTED: "Gửi duyệt",
  KTT_DECIDED: "Kế toán trưởng quyết định",
  CEO_DECIDED: "CEO quyết định",
  SENT_BACK: "Phòng Dữ Liệu trả về",
  APPLIED: "Áp dụng giá mới lên POS",
  ENDED: "Kết thúc phiếu",
  COMMENT: "Bình luận",
  IMPORTED: "Nhập từ Lark",
  NOTIFY: "Gửi thông báo",
};

const DELIVERY_CLASS: Record<PcDeliveryStatus, string> = {
  SENT: "bg-green-100 text-green-700",
  NO_LARK: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
};
const DELIVERY_LABEL: Record<PcDeliveryStatus, string> = {
  SENT: "Đã gửi Lark",
  NO_LARK: "Chưa liên kết Lark",
  ERROR: "Lỗi gửi Lark",
};

function EventBody({ e }: { e: PcEvent }) {
  const data = (e.data ?? {}) as Record<string, unknown>;
  if ((e.type === "UPDATED" || e.type === "APPLIED") && "costCells" in data) {
    const n = (k: string) => formatNumber(Number(data[k] ?? 0));
    return (
      <p className="mt-1 text-xs text-gray-600">
        {n(e.type === "UPDATED" ? "items" : "products")} sản phẩm ·{" "}
        {n("costCells")} ô giá vốn · {n("priceCells")} ô giá bán
      </p>
    );
  }
  if (e.type === "NOTIFY") {
    const recipients =
      (data.recipients as {
        userId: number;
        name: string;
        status: PcDeliveryStatus;
        error?: string;
      }[]) ?? [];
    const intended = (data.intended as { name: string }[] | undefined) ?? [];
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {data.testMode === true && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            Gửi thử · người nhận thật:{" "}
            {intended.map((i) => i.name).join(", ") || "chưa cấu hình"}
          </span>
        )}
        {recipients.length === 0 && (
          <span className="text-xs text-gray-400">
            Không có người nhận (chưa cấu hình nhóm duyệt)
          </span>
        )}
        {recipients.map((r) => (
          <span
            key={r.userId}
            title={r.error}
            className={`px-2 py-0.5 rounded text-xs font-medium ${DELIVERY_CLASS[r.status]}`}>
            {r.name} · {DELIVERY_LABEL[r.status]}
          </span>
        ))}
      </div>
    );
  }
  return null;
}

/** Bình luận + dòng thời gian (chuyển bước, duyệt, áp dụng, kết quả gửi tin Lark). */
export function PriceChangeHistory({ ticket }: { ticket: PcTicketDetail }) {
  const { comment } = usePcActions(ticket.id);
  const [text, setText] = useState("");
  const decision = (e: PcEvent) => {
    const d = (e.data as { decision?: string } | null)?.decision;
    return d === "APPROVED" ? "Duyệt" : d === "REJECTED" ? "Từ chối" : null;
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết trao đổi về phiếu…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <LoadingButton
          loading={comment.isPending}
          disabled={!text.trim()}
          onClick={() =>
            comment.mutate(text.trim(), { onSuccess: () => setText("") })
          }
          className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
          <MessageCircle className="w-4 h-4" /> Gửi
        </LoadingButton>
      </div>
      <ol className="space-y-3">
        {ticket.events.map((e) => (
          <li
            key={e.id}
            className={`rounded-lg border px-3 py-2 ${e.type === "COMMENT" ? "bg-brand-soft border-brand-border" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-800">
                {EVENT_LABEL[e.type] ?? e.type}
              </span>
              {decision(e) && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    decision(e) === "Duyệt"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                  {decision(e)}
                </span>
              )}
              {e.toStage && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  {e.fromStage && PC_STAGE_LABEL[e.fromStage]}
                  {e.fromStage && <ArrowRight className="h-3 w-3" />}
                  {PC_STAGE_LABEL[e.toStage]}
                </span>
              )}
              <span className="ml-auto text-xs text-gray-500">
                {e.actorName ?? "Hệ thống"} · {fmtDateTime(e.createdAt)}
              </span>
            </div>
            {e.content && e.type !== "NOTIFY" && (
              <p className="mt-1 whitespace-pre-wrap text-gray-700">
                {e.content}
              </p>
            )}
            {e.type === "NOTIFY" && e.content && (
              <p className="mt-0.5 text-xs text-gray-500">{e.content}</p>
            )}
            <EventBody e={e} />
          </li>
        ))}
      </ol>
    </div>
  );
}
