"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  CornerUpLeft,
  FileText,
  Loader2,
  ShieldCheck,
  Tags,
  XCircle,
} from "lucide-react";
import { usePcActions, usePriceChange } from "@/lib/hooks/usePriceChange";
import { CodeLink } from "@/components/shared/CodeLink";
import { JourneyStepper } from "@/components/journey/JourneyStepper";
import { NewProductPriceReasonModal } from "@/components/new-product-price/NewProductPriceReasonModal";
import {
  PC_STAGE_COLOR,
  PC_STAGE_LABEL,
  PC_STATUS_COLOR,
  PC_STATUS_LABEL,
  fmtDateTime,
} from "@/lib/price-change/constants";
import type { PcTicketDetail } from "@/lib/types/price-change";
import { stageMilestones } from "./stage-milestones";
import { PriceChangeSections } from "./PriceChangeSections";
import { PriceChangeHistory } from "./PriceChangeHistory";
import { PriceChangeStageModal } from "./PriceChangeStageModal";
import { PriceChangeDecisionModal } from "./PriceChangeDecisionModal";
import { PriceChangeApplyModal } from "./PriceChangeApplyModal";

type Tab = "info" | "documents" | "history";

/** Số ngày từ lúc tạo tới khi xong / kết thúc (hoặc tới hôm nay). */
function leadtimeDays(t: PcTicketDetail): number {
  const end = new Date(t.doneAt ?? t.endedAt ?? Date.now()).getTime();
  return Math.max(
    0,
    Math.floor((end - new Date(t.createdAt).getTime()) / 86_400_000),
  );
}

/** Tiêu đề phiếu theo loại thay đổi. */
function ticketTitle(t: PcTicketDetail): string {
  if (t.hasCost && t.hasSale) return "Thay đổi giá vốn & giá bán";
  if (t.hasCost) return "Thay đổi giá vốn";
  if (t.hasSale) return "Thay đổi giá bán";
  return "Thay đổi giá";
}

/** Chi tiết phiếu (khuôn NewProductPriceDetailRow): chỉ để xem; thao tác ở chân mở các modal theo bước. */
export function PriceChangeDetailRow({
  ticketId,
  colSpan,
  autoOpen = false,
  onAutoOpened,
}: {
  ticketId: number;
  colSpan: number;
  /** Mở sẵn modal thao tác chính (link Lark có &open=1). */
  autoOpen?: boolean;
  onAutoOpened?: () => void;
}) {
  const { data: ticket, isLoading } = usePriceChange(ticketId);
  const [tab, setTab] = useState<Tab>("info");
  // Khung chi tiết đứng yên khi bảng cuộn ngang, rộng bằng vùng cuộn
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loaded = !!ticket;
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    let scrollEl = el?.parentElement ?? null;
    while (
      scrollEl &&
      !["auto", "scroll"].includes(getComputedStyle(scrollEl).overflowX)
    ) {
      scrollEl = scrollEl.parentElement;
    }
    if (!el || !scrollEl) return;
    const box = scrollEl;
    const update = () => {
      const next = `${box.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [loaded]);

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">Đang tải thông tin phiếu...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!ticket) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu
        </td>
      </tr>
    );
  }

  const comments = ticket.events.filter((e) => e.type === "COMMENT").length;
  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "documents", label: `Tài liệu (${ticket.documents?.length ?? 0})` },
    {
      key: "history",
      label: `Trao đổi & lịch sử${comments ? ` (${comments})` : ""}`,
    },
  ];
  const products = ticket.items.filter((i) => i.productId);
  const shown = products.slice(0, 3);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="border-b border-gray-200 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <CodeLink
                      entity="price-change"
                      code={ticket.code}
                      sameTab
                      className="text-lg font-bold text-brand hover:underline"
                    />
                    <span className="text-gray-400">-</span>
                    <span className="text-lg font-semibold text-gray-800">
                      {ticketTitle(ticket)}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${PC_STAGE_COLOR[ticket.stage]}`}>
                      {PC_STAGE_LABEL[ticket.stage]}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${PC_STATUS_COLOR[ticket.status]}`}>
                      {PC_STATUS_LABEL[ticket.status]}
                    </span>
                    {shown.length > 0 && (
                      <span className="ml-2 text-sm text-gray-600">
                        Sản phẩm:{" "}
                        {shown.map((i, idx) => (
                          <span key={i.id}>
                            {idx > 0 && ", "}
                            <CodeLink entity="product" code={i.productCode} />
                          </span>
                        ))}
                        {products.length > shown.length &&
                          ` và ${products.length - shown.length} SP khác`}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    {ticket.createdByName ?? "-"} ·{" "}
                    {fmtDateTime(ticket.createdAt)} · {leadtimeDays(ticket)}{" "}
                    ngày
                  </span>
                </div>

                <div className="mt-3">
                  <JourneyStepper milestones={stageMilestones(ticket)} />
                </div>
                {ticket.stage === "ENDED" && ticket.endReason && (
                  <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Lý do kết thúc: {ticket.endReason}
                  </p>
                )}
                {ticket.importNotes?.length ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Nhập từ Lark, chưa khớp dữ liệu POS:{" "}
                    {ticket.importNotes
                      .map((n) => `${n.field} (${n.value})`)
                      .join(", ")}
                  </p>
                ) : null}

                {/* Tabs */}
                <div className="flex gap-1 mt-2">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        tab === t.key
                          ? "border-brand text-brand"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {tab === "info" && <PriceChangeSections ticket={ticket} />}
              {tab === "documents" && <DocumentList ticket={ticket} />}
              {tab === "history" && <PriceChangeHistory ticket={ticket} />}

              <ActionFooter
                ticket={ticket}
                autoOpen={autoOpen}
                onAutoOpened={onAutoOpened}
              />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DocumentList({ ticket }: { ticket: PcTicketDetail }) {
  const docs = ticket.documents ?? [];
  if (!docs.length)
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Chưa có tài liệu
      </p>
    );
  return (
    <ul className="space-y-1.5 text-sm">
      {docs.map((d) => (
        <li key={d.url} className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline break-all">
            {d.originalName || d.url.split("/").pop()}
          </a>
        </li>
      ))}
    </ul>
  );
}

type ModalKind = "stage" | "ktt" | "ceo" | "apply";
type ReasonKind = "sendBack" | "end";

const BTN_PRIMARY =
  "px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50";
const BTN_DANGER =
  "px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Chân thao tác: trái = kết thúc / trả về; phải = nút mở modal của việc cần làm
 * (Xử lý bước Đề xuất, Kế toán trưởng duyệt, CEO duyệt, Áp dụng thay đổi giá).
 */
function ActionFooter({
  ticket,
  autoOpen,
  onAutoOpened,
}: {
  ticket: PcTicketDetail;
  autoOpen: boolean;
  onAutoOpened?: () => void;
}) {
  const actions = usePcActions(ticket.id);
  const can = (a: string) => ticket.access.actions.includes(a as never);
  const primary: ModalKind | null = can("EDIT")
    ? "stage"
    : can("KTT_DECIDE")
      ? "ktt"
      : can("CEO_DECIDE")
        ? "ceo"
        : can("APPLY")
          ? "apply"
          : null;
  // Link Lark (&open=1) → mở sẵn việc chính một lần khi phiếu tải xong
  const [modal, setModal] = useState<ModalKind | null>(() =>
    autoOpen ? primary : null,
  );
  const [reason, setReason] = useState<ReasonKind | null>(null);
  useEffect(() => {
    if (autoOpen) onAutoOpened?.();
    // Chỉ chạy lúc mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!primary && !can("END") && !can("SEND_BACK")) return null;
  const close = () => setModal(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-200">
      <div className="flex flex-wrap gap-2">
        {can("END") && (
          <button onClick={() => setReason("end")} className={BTN_DANGER}>
            <XCircle className="w-3.5 h-3.5" /> Kết thúc phiếu
          </button>
        )}
        {can("SEND_BACK") && (
          <button
            onClick={() => setReason("sendBack")}
            className={BTN_SECONDARY}>
            <CornerUpLeft className="w-3.5 h-3.5" /> Trả về người đề xuất
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {can("EDIT") && (
          <button onClick={() => setModal("stage")} className={BTN_PRIMARY}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Xử lý bước{" "}
            {PC_STAGE_LABEL[ticket.stage]}
          </button>
        )}
        {can("KTT_DECIDE") && (
          <button onClick={() => setModal("ktt")} className={BTN_PRIMARY}>
            <ShieldCheck className="w-3.5 h-3.5" /> Kế toán trưởng duyệt
          </button>
        )}
        {can("CEO_DECIDE") && (
          <button onClick={() => setModal("ceo")} className={BTN_PRIMARY}>
            <ShieldCheck className="w-3.5 h-3.5" /> CEO duyệt
          </button>
        )}
        {can("APPLY") && (
          <button onClick={() => setModal("apply")} className={BTN_PRIMARY}>
            <Tags className="w-3.5 h-3.5" /> Áp dụng thay đổi giá
          </button>
        )}
      </div>

      {modal === "stage" && (
        <PriceChangeStageModal ticket={ticket} onClose={close} />
      )}
      {(modal === "ktt" || modal === "ceo") && (
        <PriceChangeDecisionModal
          ticket={ticket}
          kind={modal === "ktt" ? "KTT" : "CEO"}
          onClose={close}
        />
      )}
      {modal === "apply" && (
        <PriceChangeApplyModal ticket={ticket} onClose={close} />
      )}
      {reason === "sendBack" && (
        <NewProductPriceReasonModal
          title="Trả về người đề xuất"
          label="Lý do trả về"
          confirmText="Trả về"
          loading={actions.sendBack.isPending}
          onClose={() => setReason(null)}
          onSubmit={(r) =>
            actions.sendBack.mutate(r, { onSuccess: () => setReason(null) })
          }
        />
      )}
      {reason === "end" && (
        <NewProductPriceReasonModal
          title="Kết thúc phiếu"
          label="Lý do kết thúc"
          confirmText="Kết thúc"
          danger
          loading={actions.end.isPending}
          onClose={() => setReason(null)}
          onSubmit={(r) =>
            actions.end.mutate(r, { onSuccess: () => setReason(null) })
          }
        />
      )}
    </div>
  );
}
