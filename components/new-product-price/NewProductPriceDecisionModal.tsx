"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useNppActions } from "@/lib/hooks/useNewProductPrice";
import { fmtMoney } from "@/lib/new-product-price/constants";
import type {
  NppDecision,
  NppTicketDetail,
} from "@/lib/types/new-product-price";
import { NPP_SECTIONS, type NppFieldDef } from "./fields";
import { NppFieldValue } from "./NppFieldInput";
import { NewProductPriceAnalysis } from "./NewProductPriceAnalysis";
import { KttStatusLine } from "./NewProductPriceSections";

const ALL_FIELDS = NPP_SECTIONS.flatMap((s) => s.fields);
const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none";

/**
 * Modal duyệt: KTT duyệt giá vốn / CEO duyệt bảng giá, kèm sẵn số liệu cần xem.
 * Từ chối bắt buộc ghi lý do; CEO từ chối có thể kết thúc phiếu thay vì trả về Thu Mua.
 */
export function NewProductPriceDecisionModal({
  ticket,
  kind,
  onClose,
}: {
  ticket: NppTicketDetail;
  kind: "KTT" | "CEO";
  onClose: () => void;
}) {
  const actions = useNppActions(ticket.id);
  const [note, setNote] = useState("");
  const [end, setEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = kind === "KTT" ? actions.kttDecision : actions.ceoDecision;
  const pending = (d: NppDecision) =>
    mutation.isPending && mutation.variables?.decision === d;

  const decide = (decision: NppDecision) => {
    const text = note.trim();
    if (decision === "REJECTED" && !text) {
      setError("Vui lòng nhập lý do từ chối");
      return;
    }
    const done = { onSuccess: onClose };
    if (kind === "KTT") {
      actions.kttDecision.mutate({ decision, note: text || undefined }, done);
    } else {
      actions.ceoDecision.mutate(
        {
          decision,
          note: text || undefined,
          end: decision === "REJECTED" ? end : undefined,
        },
        done,
      );
    }
  };

  const close = () => {
    if (!mutation.isPending) onClose();
  };

  const extra = (
    kind === "CEO"
      ? ["launchDate", "oemPriceBookId", "oemCustomers"]
      : ["goodsPriceVnd", "overheadCost", "vatTax", "importTax", "misaCode"]
  )
    .map((k) => ALL_FIELDS.find((f) => f.key === k))
    .filter((f): f is NppFieldDef => !!f);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={close}>
      <div
        className={`bg-white rounded-lg w-full ${kind === "CEO" ? "max-w-4xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              {kind === "KTT"
                ? "Kế toán trưởng duyệt giá vốn"
                : "CEO duyệt bảng giá"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ticket.code} · {ticket.productName}
            </p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {kind === "KTT" ? (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Khu vực",
                      "Cost Thu Mua (trước VAT)",
                      "Giá vốn Kế Toán",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["Hà Nội", ticket.costHn, ticket.cogsHn],
                      ["Sài Gòn", ticket.costSg, ticket.cogsSg],
                      ["CH Diệp Trà", null, ticket.cogsDt],
                    ] as const
                  ).map(([label, cost, cogs]) => (
                    <tr key={label} className="border-t">
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {fmtMoney(cost)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {fmtMoney(cogs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NewProductPriceAnalysis ticket={ticket} />
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 text-sm">
            {extra.map((f) => (
              <div
                key={f.key}
                className={f.wide ? "col-span-2 md:col-span-3" : ""}>
                <dt className="text-xs text-gray-500">{f.label}</dt>
                <dd className="font-medium text-gray-800">
                  <NppFieldValue field={f} ticket={ticket} />
                </dd>
              </div>
            ))}
          </dl>
          {kind === "CEO" && <KttStatusLine ticket={ticket} />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú{" "}
              <span className="font-normal text-gray-500">
                (bắt buộc khi từ chối)
              </span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              className={INPUT}
              placeholder="Lý do / ý kiến"
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          {kind === "CEO" && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={end}
                onChange={(e) => setEnd(e.target.checked)}
                className="accent-brand"
              />
              Khi từ chối: kết thúc phiếu (không trả về Thu Mua làm lại)
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={close}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={pending("REJECTED")}
            disabled={mutation.isPending}
            onClick={() => decide("REJECTED")}
            className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium disabled:opacity-50">
            Từ chối
          </LoadingButton>
          <LoadingButton
            loading={pending("APPROVED")}
            disabled={mutation.isPending}
            onClick={() => decide("APPROVED")}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Duyệt
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
