"use client";

import { useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  useNewProductPriceReference,
  useNppActions,
} from "@/lib/hooks/useNewProductPrice";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { formatNumber } from "@/lib/utils";
import {
  NPP_STAGE_LABEL,
  fmtDateTime,
} from "@/lib/new-product-price/constants";
import type {
  NppDelivery,
  NppGroupDelivery,
  NppEvent,
  NppReference,
  NppTicketDetail,
} from "@/lib/types/new-product-price";
import { NPP_SECTIONS } from "./fields";

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Tạo đề xuất",
  UPDATED: "Cập nhật thông tin",
  STAGE_COMPLETED: "Hoàn tất bước",
  SENT_BACK: "Trả về Phòng Thu Mua",
  KTT_SENT: "Gửi Kế toán trưởng duyệt",
  KTT_DECIDED: "Kế toán trưởng quyết định",
  CEO_DECIDED: "CEO quyết định",
  APPLIED: "Áp dụng tạo sản phẩm",
  ENDED: "Kết thúc phiếu",
  COMMENT: "Bình luận",
  IMPORTED: "Nhập từ Lark",
  NOTIFY: "Gửi thông báo",
};

const DELIVERY_CLASS: Record<NppDelivery["status"], string> = {
  SENT: "bg-green-100 text-green-700",
  NO_LARK: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
};
const DELIVERY_LABEL: Record<NppDelivery["status"], string> = {
  SENT: "Đã gửi Lark",
  NO_LARK: "Chưa liên kết Lark",
  ERROR: "Lỗi gửi Lark",
};

const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  NPP_SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
);
FIELD_LABEL.images = "Hình ảnh";
FIELD_LABEL.documents = "Tài liệu";

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} mục`;
  if (typeof v === "number") return formatNumber(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v))
    return new Date(v).toLocaleDateString("vi-VN");
  return String(v);
}

/** Lịch sử cũ lưu ID cho trường chọn từ danh sách → đổi sang tên theo danh mục. */
function idName(
  key: string,
  v: unknown,
  ref: NppReference | undefined,
): unknown {
  if (typeof v !== "number") return v;
  const list: { id: number; name: string }[] | undefined =
    key === "tradeMarkId"
      ? ref?.trademarks
      : key === "supplierId"
        ? ref?.suppliers
        : key === "factoryId"
          ? ref?.factories
          : key === "oemPriceBookId"
            ? ref?.priceBooks
            : key === "costApproverId"
              ? ref?.costApprovers
              : undefined;
  if (!list) return v;
  return list.find((x) => x.id === v)?.name ?? `#${v}`;
}

function EventBody({ e }: { e: NppEvent }) {
  const { data: reference } = useNewProductPriceReference();
  const data = (e.data ?? {}) as Record<string, unknown>;
  if (e.type === "UPDATED" && data.changes) {
    const changes = data.changes as Record<
      string,
      { from: unknown; to: unknown }
    >;
    return (
      <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
        {Object.entries(changes).map(([k, c]) => (
          <li key={k}>
            {FIELD_LABEL[k] ?? k}: {fmtValue(idName(k, c.from, reference))} →{" "}
            <span className="font-medium text-gray-800">
              {fmtValue(idName(k, c.to, reference))}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (e.type === "NOTIFY") {
    const recipients = (data.recipients as NppDelivery[]) ?? [];
    const intended = (data.intended as { name: string }[] | undefined) ?? [];
    const group = data.group as NppGroupDelivery | undefined;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {group && (
          <span
            title={
              group.error ??
              (group.mentioned?.length
                ? `Tag: ${group.mentioned.join(", ")}`
                : undefined)
            }
            className={`px-2 py-0.5 rounded text-xs font-medium ${DELIVERY_CLASS[group.status]}`}>
            Nhóm Lark ·{" "}
            {group.status === "SENT"
              ? group.created || group.openedTopic
                ? "Đã mở chủ đề"
                : "Đã trả lời trong chủ đề"
              : "Lỗi gửi"}
          </span>
        )}
        {data.testMode === true && (
          <span
            title={`Người nhận thật: ${intended.map((i) => i.name).join(", ") || "(chưa cấu hình)"}`}
            className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
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

/** Bình luận + dòng thời gian (chuyển bước, sửa trường, kết quả gửi tin Lark). */
export function NewProductPriceHistory({
  ticket,
}: {
  ticket: NppTicketDetail;
}) {
  const { comment } = useNppActions(ticket.id);
  const [text, setText] = useState("");
  const decision = (e: NppEvent) => {
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
                  {e.fromStage && NPP_STAGE_LABEL[e.fromStage]}
                  {e.fromStage && <ArrowRight className="h-3 w-3" />}
                  {NPP_STAGE_LABEL[e.toStage]}
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
