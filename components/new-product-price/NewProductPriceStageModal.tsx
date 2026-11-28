"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck, PencilLine, X } from "lucide-react";
import { FormSection } from "@/components/products/FormSection";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { confirmAction } from "@/lib/chat/confirm";
import { useExchangeRate } from "@/lib/hooks/useExchangeRate";
import {
  useNewProductPriceReference,
  useNppSaveAndAdvance,
  type NppAdvance,
} from "@/lib/hooks/useNewProductPrice";
import { NPP_STAGE_LABEL } from "@/lib/new-product-price/constants";
import { priceAnalysis } from "@/lib/new-product-price/pricing";
import type { NppStage, NppTicketDetail } from "@/lib/types/new-product-price";
import { NPP_SECTIONS, type NppFieldDef } from "./fields";
import {
  buildPatch,
  initDraft,
  kttBlock,
  missingFields,
  nextStageOf,
  type NppDraft,
} from "./draft";
import { NppFieldInput, NppFieldValue, num } from "./NppFieldInput";
import { NppAnalysisTable } from "./NewProductPriceAnalysis";
import { KttStatusLine } from "./NewProductPriceSections";

/** Số liệu bước trước cần xem khi xử lý bước hiện tại. */
const REFERENCE_KEYS: Partial<Record<NppStage, string[]>> = {
  PURCHASING: [
    "parentName",
    "childName",
    "tradeMarkId",
    "unit",
    "netWeightGram",
    "costApproverId",
  ],
  ACCOUNTING: [
    "goodsPriceVnd",
    "overheadCost",
    "vatTax",
    "importTax",
    "costHn",
    "costSg",
  ],
  SALES: ["cogsHn", "cogsSg", "cogsDt", "costHn", "costSg"],
};

const ALL_FIELDS = NPP_SECTIONS.flatMap((s) => s.fields);
const fieldDef = (key: string) => ALL_FIELDS.find((f) => f.key === key);

const BTN =
  "px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 disabled:opacity-50";
const BTN_BRAND_OUTLINE =
  "px-3 py-1.5 border border-brand text-brand rounded-lg hover:bg-brand-soft text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_PRIMARY =
  "px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Modal Xử lý bước: các trường người dùng được sửa (phần của bước hiện tại đứng đầu),
 * số liệu tham khảo của bước trước, "Còn thiếu" cập nhật khi nhập, Lưu / Lưu & chuyển.
 * mode "edit" = chỉ sửa thông tin (trường song song, ghi chú, chuẩn hóa ở Phòng Dữ Liệu).
 */
export function NewProductPriceStageModal({
  ticket,
  mode,
  onClose,
}: {
  ticket: NppTicketDetail;
  mode: "stage" | "edit";
  onClose: () => void;
}) {
  const { data: reference } = useNewProductPriceReference();
  const save = useNppSaveAndAdvance(ticket.id);
  const can = (a: string) => ticket.access.actions.includes(a as never);
  const stageMode = mode === "stage";

  // Nhóm theo phần: phần của bước hiện tại trước, rồi các phần khác có trường được sửa
  const groups = useMemo(() => {
    const editable = new Set(ticket.access.editableFields);
    const list = NPP_SECTIONS.map((sec) => ({
      sec,
      fields: sec.fields.filter(
        (f) =>
          editable.has(f.key) ||
          (f.type === "computed" && editable.has("goodsPrice")),
      ),
    })).filter((g) => g.fields.some((f) => f.type !== "computed"));
    return [
      ...list.filter((g) => g.sec.stage === ticket.stage),
      ...list.filter((g) => g.sec.stage !== ticket.stage),
    ];
  }, [ticket.access.editableFields, ticket.stage]);
  const fields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);

  const [draft, setDraft] = useState<NppDraft>(() => initDraft(ticket, fields));
  const raw = ticket as unknown as Record<string, unknown>;
  const get = (key: string) => (key in draft ? draft[key] : raw[key]);
  // Tỉ giá gợi ý theo tiền tệ của nhà máy đã chọn (chưa chọn → CNY như trên Lark)
  const rateCurrency =
    reference?.factories.find((m) => m.id === get("factoryId"))?.currency ||
    "CNY";
  const { data: rate } = useExchangeRate(rateCurrency, "VND");
  const set = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const patch = useMemo(
    () => buildPatch(ticket, fields, draft),
    [ticket, fields, draft],
  );
  const dirty = Object.keys(patch).length > 0;
  const next = nextStageOf(ticket);
  const canComplete = stageMode && can("COMPLETE") && !!next;
  const canSendKtt =
    stageMode && ticket.stage === "ACCOUNTING" && can("SEND_KTT");
  const missing = stageMode ? missingFields(ticket.stage, get) : [];
  const ktt = stageMode ? kttBlock(ticket, patch) : null;

  const title = stageMode
    ? `Xử lý bước ${NPP_STAGE_LABEL[ticket.stage]}`
    : ticket.stage === "DATA"
      ? "Chuẩn hóa thông tin"
      : "Sửa thông tin";

  const run = async (then: NppAdvance) => {
    if (then === "complete" && next) {
      const ok = await confirmAction(
        `Lưu và chuyển phiếu sang ${NPP_STAGE_LABEL[next]}?`,
        { title: "Hoàn tất bước", confirmText: "Chuyển bước" },
      );
      if (!ok) return;
    }
    if (then === "sendKtt") {
      const ok = await confirmAction(
        "Lưu và gửi giá vốn cho Kế toán trưởng duyệt?",
        {
          title: "Gửi Kế toán trưởng",
          confirmText: "Gửi",
        },
      );
      if (!ok) return;
    }
    if (then === "save" && !dirty) return onClose();
    save.mutate({ patch, then }, { onSuccess: onClose });
  };

  const close = async () => {
    if (save.isPending) return;
    if (
      dirty &&
      !(await confirmAction("Các thay đổi chưa lưu sẽ bị bỏ.", {
        title: "Đóng mà không lưu?",
        confirmText: "Bỏ thay đổi",
        danger: true,
      }))
    )
      return;
    onClose();
  };

  const pending = (then: NppAdvance) =>
    save.isPending && save.variables?.then === then;

  // Bảng lãi xem trước theo giá đang nhập (bước Kinh Doanh)
  const liveAnalysis = priceAnalysis({
    cogsHn: num(get("cogsHn")),
    cogsSg: num(get("cogsSg")),
    cogsDt: num(get("cogsDt")),
    priceHnRetail: num(get("priceHnRetail")),
    priceHnWholesale: num(get("priceHnWholesale")),
    priceSgRetail: num(get("priceSgRetail")),
    priceSgWholesale: num(get("priceSgWholesale")),
    priceDlcl: num(get("priceDlcl")),
    priceShopee: num(get("priceShopee")),
    priceOem: num(get("priceOem")),
  });

  const refKeys = stageMode ? (REFERENCE_KEYS[ticket.stage] ?? []) : [];
  const refFields = refKeys.map(fieldDef).filter((f): f is NppFieldDef => !!f);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={close}>
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {stageMode ? (
                <ClipboardCheck className="w-5 h-5 text-brand" />
              ) : (
                <PencilLine className="w-5 h-5 text-brand" />
              )}
              {title}
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

        <div className="flex-1 overflow-auto p-5 space-y-4 bg-gray-50">
          {(refFields.length > 0 || ticket.stage === "ACCOUNTING") &&
            stageMode && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Số liệu tham khảo
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 text-sm">
                  {refFields.map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs text-gray-500">{f.label}</dt>
                      <dd className="font-medium text-gray-800">
                        <NppFieldValue field={f} ticket={ticket} />
                      </dd>
                    </div>
                  ))}
                </dl>
                {ticket.stage === "ACCOUNTING" && (
                  <div className="mt-2">
                    <KttStatusLine ticket={ticket} />
                  </div>
                )}
              </div>
            )}

          {groups.map(({ sec, fields: list }) => {
            const isCurrent = sec.stage === ticket.stage;
            return (
              <FormSection
                key={sec.key}
                title={
                  <span className="flex items-center gap-2">
                    {sec.title}
                    {isCurrent && stageMode && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Đang xử lý
                      </span>
                    )}
                  </span>
                }>
                <div className="grid grid-cols-2 gap-3">
                  {list.map((f) => (
                    <div key={f.key} className={f.wide ? "col-span-2" : ""}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {f.label}
                        {f.required && isCurrent && stageMode && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      <NppFieldInput
                        field={f}
                        get={get}
                        set={set}
                        ticket={ticket}
                        reference={reference}
                        rate={rateCurrency === "VND" ? 1 : rate?.rate}
                        rateCurrency={rateCurrency}
                      />
                    </div>
                  ))}
                </div>
                {sec.stage === "SALES" && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lãi theo giá đang nhập
                    </p>
                    <NppAnalysisTable rows={liveAnalysis} />
                  </div>
                )}
              </FormSection>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t">
          {(missing.length > 0 || ktt) && (
            <p className="mr-auto text-xs text-red-600">
              {missing.length > 0 ? `Còn thiếu: ${missing.join(", ")}` : ktt}
            </p>
          )}
          <button onClick={close} className={BTN}>
            Đóng
          </button>
          <LoadingButton
            loading={pending("save")}
            disabled={save.isPending}
            onClick={() => run("save")}
            className={BTN}>
            Lưu
          </LoadingButton>
          {canSendKtt && (
            <LoadingButton
              loading={pending("sendKtt")}
              disabled={save.isPending || missing.length > 0}
              title={
                missing.length ? `Còn thiếu: ${missing.join(", ")}` : undefined
              }
              onClick={() => run("sendKtt")}
              className={BTN_BRAND_OUTLINE}>
              Lưu & gửi Kế toán trưởng
            </LoadingButton>
          )}
          {canComplete && next && (
            <LoadingButton
              loading={pending("complete")}
              disabled={save.isPending || missing.length > 0 || !!ktt}
              onClick={() => run("complete")}
              className={BTN_PRIMARY}>
              Lưu & chuyển {NPP_STAGE_LABEL[next]}
            </LoadingButton>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
