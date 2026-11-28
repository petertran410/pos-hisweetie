"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { PackagePlus, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import {
  useCreateNewProductPrice,
  useNewProductPriceReference,
} from "@/lib/hooks/useNewProductPrice";
import type { NppUpdateInput } from "@/lib/types/new-product-price";
import { NPP_SECTIONS } from "./fields";
import { isBlank, missingFields, type NppDraft } from "./draft";
import { NppFieldInput } from "./NppFieldInput";

/** Trường của bước Đề xuất + Ghi chú (khai báo trong fields.ts). */
const FIELDS = NPP_SECTIONS.filter(
  (s) => s.key === "proposal" || s.key === "note",
).flatMap((s) => s.fields);

/** Tạo đề xuất sản phẩm mới (bước Đề xuất). "Lưu & gửi Thu Mua" kiểm tra đủ trường bắt buộc. */
export function NewProductPriceFormModal({ onClose }: { onClose: () => void }) {
  const { data: reference } = useNewProductPriceReference();
  const create = useCreateNewProductPrice();
  const [draft, setDraft] = useState<NppDraft>({});
  const get = (key: string) => draft[key];
  const set = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const name = String(draft.productName ?? "").trim();
  const missing = missingFields("PROPOSAL", get);

  const submit = (send: boolean) => {
    const body: Record<string, unknown> = {};
    for (const f of FIELDS) {
      const v = draft[f.key];
      body[f.key] = isBlank(v) ? null : typeof v === "string" ? v.trim() : v;
    }
    create.mutate(
      { ...(body as NppUpdateInput), productName: name, submit: send },
      { onSuccess: onClose },
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-brand" />
            Tạo đề xuất sản phẩm mới
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.wide ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </label>
                <NppFieldInput
                  field={f}
                  get={get}
                  set={set}
                  reference={reference}
                  autoFocus={f.key === "productName"}
                />
              </div>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="text-xs text-gray-500">
              Gửi Thu Mua cần nhập đủ: {missing.join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={create.isPending && create.variables?.submit === false}
            disabled={!name || create.isPending}
            onClick={() => submit(false)}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 disabled:opacity-50">
            Lưu nháp
          </LoadingButton>
          <LoadingButton
            loading={create.isPending && create.variables?.submit === true}
            disabled={missing.length > 0 || create.isPending}
            onClick={() => submit(true)}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Lưu & gửi Thu Mua
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
