"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  CornerUpLeft,
  Loader2,
  PackagePlus,
  PencilLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  useNewProductPrice,
  useNppActions,
} from "@/lib/hooks/useNewProductPrice";
import { CodeLink } from "@/components/shared/CodeLink";
import { JourneyStepper } from "@/components/journey/JourneyStepper";
import {
  NPP_STAGE_COLOR,
  NPP_STAGE_LABEL,
  NPP_STATUS_COLOR,
  NPP_STATUS_LABEL,
  fmtDateTime,
} from "@/lib/new-product-price/constants";
import type { NppTicketDetail } from "@/lib/types/new-product-price";
import { stageMilestones } from "./stage-milestones";
import { NewProductPriceSections } from "./NewProductPriceSections";
import { NewProductPriceAnalysis } from "./NewProductPriceAnalysis";
import { NewProductPriceMedia } from "./NewProductPriceMedia";
import { NewProductPriceHistory } from "./NewProductPriceHistory";
import { NewProductPriceReasonModal } from "./NewProductPriceReasonModal";
import { NewProductPriceApplyModal } from "./NewProductPriceApplyModal";
import { NewProductPriceStageModal } from "./NewProductPriceStageModal";
import { NewProductPriceDecisionModal } from "./NewProductPriceDecisionModal";

type Tab = "info" | "analysis" | "media" | "history";

/** Chi tiết phiếu (khuôn InvoiceDetailRow): chỉ để xem; thao tác ở chân mở các modal theo bước. */
export function NewProductPriceDetailRow({
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
  const { data: ticket, isLoading } = useNewProductPrice(ticketId);
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
    { key: "analysis", label: "Phân tích giá" },
    {
      key: "media",
      label: `Hình ảnh & tài liệu (${(ticket.images?.length ?? 0) + (ticket.documents?.length ?? 0)})`,
    },
    {
      key: "history",
      label: `Trao đổi & lịch sử${comments ? ` (${comments})` : ""}`,
    },
  ];

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
                      entity="new-product-price"
                      code={ticket.code}
                      sameTab
                      className="text-lg font-bold text-brand hover:underline"
                    />
                    <span className="text-gray-400">-</span>
                    <span className="text-lg font-semibold text-gray-800">
                      {ticket.productName}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${NPP_STAGE_COLOR[ticket.stage]}`}>
                      {NPP_STAGE_LABEL[ticket.stage]}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${NPP_STATUS_COLOR[ticket.status]}`}>
                      {NPP_STATUS_LABEL[ticket.status]}
                    </span>
                    {ticket.productCode && (
                      <span className="ml-2 text-sm text-gray-600">
                        Sản phẩm:{" "}
                        <CodeLink entity="product" code={ticket.productCode} />
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    {ticket.createdByName ?? "-"} ·{" "}
                    {fmtDateTime(ticket.createdAt)} · {ticket.leadtimeDays} ngày
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
                    {ticket.importNotes.map((n) => n.value).join(", ")} — Phòng
                    Dữ Liệu chuẩn hóa trước khi áp dụng.
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
              {tab === "info" && <NewProductPriceSections ticket={ticket} />}
              {tab === "analysis" && (
                <NewProductPriceAnalysis ticket={ticket} />
              )}
              {tab === "media" && <NewProductPriceMedia ticket={ticket} />}
              {tab === "history" && <NewProductPriceHistory ticket={ticket} />}

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

type ModalKind = "stage" | "edit" | "ktt" | "ceo" | "apply";
type ReasonKind = "sendBack" | "end";

const BTN_PRIMARY =
  "px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50";
const BTN_DANGER =
  "px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Chân thao tác: trái = kết thúc / trả về; phải = nút mở modal của việc cần làm
 * (Xử lý bước, Duyệt giá vốn, Duyệt bảng giá, Áp dụng) và Sửa/Chuẩn hóa thông tin.
 */
function ActionFooter({
  ticket,
  autoOpen,
  onAutoOpened,
}: {
  ticket: NppTicketDetail;
  autoOpen: boolean;
  onAutoOpened?: () => void;
}) {
  const actions = useNppActions(ticket.id);
  const can = (a: string) => ticket.access.actions.includes(a as never);
  const stageEntry =
    can("COMPLETE") || (ticket.stage === "ACCOUNTING" && can("SEND_KTT"));
  const editOnly = !stageEntry && ticket.access.editableFields.length > 0;
  const primary: ModalKind | null = stageEntry
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

  if (!primary && !editOnly && !can("END") && !can("SEND_BACK")) return null;
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
            <CornerUpLeft className="w-3.5 h-3.5" /> Trả về Thu Mua
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {editOnly && (
          <button onClick={() => setModal("edit")} className={BTN_SECONDARY}>
            <PencilLine className="w-3.5 h-3.5" />
            {ticket.stage === "DATA" ? "Chuẩn hóa thông tin" : "Sửa thông tin"}
          </button>
        )}
        {stageEntry && (
          <button onClick={() => setModal("stage")} className={BTN_PRIMARY}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Xử lý bước{" "}
            {NPP_STAGE_LABEL[ticket.stage]}
          </button>
        )}
        {can("KTT_DECIDE") && (
          <button onClick={() => setModal("ktt")} className={BTN_PRIMARY}>
            <ShieldCheck className="w-3.5 h-3.5" /> Duyệt giá vốn
          </button>
        )}
        {can("CEO_DECIDE") && (
          <button onClick={() => setModal("ceo")} className={BTN_PRIMARY}>
            <ShieldCheck className="w-3.5 h-3.5" /> Duyệt bảng giá
          </button>
        )}
        {can("APPLY") && (
          <button onClick={() => setModal("apply")} className={BTN_PRIMARY}>
            <PackagePlus className="w-3.5 h-3.5" /> Áp dụng tạo sản phẩm mới
          </button>
        )}
      </div>

      {(modal === "stage" || modal === "edit") && (
        <NewProductPriceStageModal
          ticket={ticket}
          mode={modal}
          onClose={close}
        />
      )}
      {(modal === "ktt" || modal === "ceo") && (
        <NewProductPriceDecisionModal
          ticket={ticket}
          kind={modal === "ktt" ? "KTT" : "CEO"}
          onClose={close}
        />
      )}
      {modal === "apply" && (
        <NewProductPriceApplyModal ticket={ticket} onClose={close} />
      )}
      {reason === "sendBack" && (
        <NewProductPriceReasonModal
          title="Trả về Phòng Thu Mua"
          label="Lý do / thông tin cần bổ sung"
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
