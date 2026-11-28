"use client";

import { FormSection } from "@/components/products/FormSection";
import { NPP_STAGE_ORDER } from "@/lib/new-product-price/constants";
import type { NppTicketDetail } from "@/lib/types/new-product-price";
import { NPP_SECTIONS, type NppSectionDef } from "./fields";
import { NppFieldValue } from "./NppFieldInput";

/** Các phần thông tin theo bước (chỉ xem — nhập liệu nằm trong modal Xử lý bước). */
export function NewProductPriceSections({
  ticket,
}: {
  ticket: NppTicketDetail;
}) {
  return (
    <div className="space-y-3">
      {NPP_SECTIONS.map((sec) => (
        <StageSection key={sec.key} sec={sec} ticket={ticket} />
      ))}
    </div>
  );
}

/** Dòng trạng thái Kế toán trưởng (dùng cả trong modal Xử lý bước). */
export function KttStatusLine({ ticket }: { ticket: NppTicketDetail }) {
  if (!ticket.sendToChiefAccountant) return null;
  return (
    <p className="text-xs text-gray-600">
      Kế toán trưởng:{" "}
      {ticket.chiefAccountantDecision === "APPROVED" ? (
        <span className="font-medium text-green-700">Đã duyệt</span>
      ) : ticket.chiefAccountantDecision === "REJECTED" ? (
        <span className="font-medium text-red-700">Từ chối</span>
      ) : (
        <span className="font-medium text-amber-700">Đang chờ duyệt</span>
      )}
      {ticket.chiefAccountantByName && ` · ${ticket.chiefAccountantByName}`}
      {ticket.chiefAccountantNote && ` · ${ticket.chiefAccountantNote}`}
    </p>
  );
}

function StageSection({
  sec,
  ticket,
}: {
  sec: NppSectionDef;
  ticket: NppTicketDetail;
}) {
  const current = NPP_STAGE_ORDER.indexOf(ticket.stage);
  const own = sec.stage ? NPP_STAGE_ORDER.indexOf(sec.stage) : -1;
  const isCurrent = sec.stage === ticket.stage;
  const notReached =
    sec.stage !== null &&
    ticket.stage !== "DONE" &&
    current >= 0 &&
    own > current;

  return (
    <FormSection
      // Phiếu tới bước này → mount lại để phần tự mở (defaultOpen chỉ đọc lúc mount)
      key={notReached ? "future" : "reached"}
      title={
        <span className="flex items-center gap-2">
          {sec.title}
          {isCurrent && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
              Đang xử lý
            </span>
          )}
          {notReached && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
              Chưa tới bước
            </span>
          )}
        </span>
      }
      defaultOpen={!notReached}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4 text-sm">
        {sec.fields.map((f) => (
          <div key={f.key} className={f.wide ? "col-span-2 md:col-span-4" : ""}>
            <dt className="text-xs text-gray-500">
              {f.label}
              {f.required && isCurrent && (
                <span className="text-red-500"> *</span>
              )}
            </dt>
            <dd className="font-medium text-gray-800">
              <NppFieldValue field={f} ticket={ticket} />
            </dd>
          </div>
        ))}
      </dl>
      {sec.stage === "ACCOUNTING" && (
        <div className="mt-3">
          <KttStatusLine ticket={ticket} />
        </div>
      )}
    </FormSection>
  );
}
