"use client";

import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  fmtDate,
  fmtMoney,
  isDomestic,
} from "@/lib/new-product-price/constants";
import { goodsPriceVnd } from "@/lib/new-product-price/pricing";
import { formatNumber } from "@/lib/utils";
import type {
  NppOemCustomer,
  NppReference,
  NppTicketDetail,
} from "@/lib/types/new-product-price";
import type { NppFieldDef } from "./fields";
import { toDateInput } from "./draft";
import { OemCustomersInput } from "./OemCustomersInput";
import { MisaItemDropdown } from "@/components/products/MisaItemDropdown";
import { newProductPriceApi } from "@/lib/api/new-product-price";

/** Giá trị hiển thị (chỉ đọc) của một trường trên phiếu. */
export function NppFieldValue({
  field: f,
  ticket: t,
}: {
  field: NppFieldDef;
  ticket: NppTicketDetail;
}) {
  const v = (t as unknown as Record<string, unknown>)[f.key];
  switch (f.type) {
    case "money":
      return <>{fmtMoney(v as number | null)}</>;
    case "number":
      return (
        <>
          {v === null || v === undefined
            ? "—"
            : `${formatNumber(v as number, "en-US", { max: f.digits ?? 2 })}${f.suffix ?? ""}`}
        </>
      );
    case "computed":
      return <>{fmtMoney(t.goodsPriceVnd)}</>;
    case "date":
      return <>{fmtDate(v as string | null)}</>;
    case "url":
      return v ? (
        <a
          href={String(v)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline break-all">
          {String(v)}
        </a>
      ) : (
        <>—</>
      );
    case "trademark":
      return <>{t.tradeMarkName || "—"}</>;
    case "costApprover":
      return <>{t.costApproverName || "—"}</>;
    case "priceBook":
      return <>{t.oemPriceBookName || "—"}</>;
    case "supplier":
      return <>{t.supplierName || "—"}</>;
    case "factory":
      // Phiếu cũ nhập từ Lark: chỉ có chữ "NCC - Nhà máy"
      return (
        <>
          {t.factoryName ||
            (t.supplierFactory ? `${t.supplierFactory} (từ Lark)` : "—")}
        </>
      );
    case "customers":
      return (
        <>
          {t.oemCustomers?.length
            ? t.oemCustomers.map((c) => c.name).join(", ")
            : "—"}
        </>
      );
    default:
      return v === null || v === undefined || v === "" ? (
        <>—</>
      ) : (
        <span className="whitespace-pre-wrap">{String(v)}</span>
      );
  }
}

const INPUT =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

/** Số hợp lệ hoặc null (ô số đang trống trả về NaN/null). */
export const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Ô nhập của một trường (theo khai báo trong fields.ts).
 * `get` đọc giá trị đang nhập để "Giá hàng VNĐ" và tỉ giá nội địa tính theo bản nháp.
 */
export function NppFieldInput({
  field: f,
  get,
  set,
  ticket,
  reference,
  rate,
  rateCurrency = "CNY",
  autoFocus,
}: {
  field: NppFieldDef;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  /** Có phiếu → hiện giá trị cũ (nhập từ Lark) chưa có trong danh mục. */
  ticket?: NppTicketDetail | null;
  reference?: NppReference;
  /** Tỉ giá CNY→VND hôm nay (gợi ý cho ô Tỉ giá). */
  rate?: number | null;
  /** Tiền tệ của tỉ giá gợi ý (theo nhà máy đã chọn). */
  rateCurrency?: string;
  autoFocus?: boolean;
}) {
  const v = get(f.key);
  const domestic = isDomestic(get("middleName") as string | null);
  const opts = (list: string[]) => [
    ...list.map((n) => ({ value: n, label: n })),
    // Giá trị cũ chưa có trong danh mục → vẫn hiện để sửa
    ...(v && !list.includes(String(v))
      ? [{ value: String(v), label: `${String(v)} (chưa có trong danh mục)` }]
      : []),
  ];
  const textOrNull = (x: string) => set(f.key, x || null);

  switch (f.type) {
    case "text":
    case "url":
      return (
        <input
          value={(v as string) ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          placeholder={f.type === "url" ? "https://" : undefined}
          autoFocus={autoFocus}
          className={INPUT}
        />
      );
    case "textarea":
      return (
        <textarea
          value={(v as string) ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          rows={3}
          className={`${INPUT} resize-none`}
        />
      );
    case "money":
    case "number": {
      const locked = f.key === "exchangeRate" && domestic;
      return (
        <div className="space-y-1">
          <NumericInput
            value={locked ? 1 : typeof v === "number" ? v : NaN}
            onValueChange={(n) => set(f.key, n)}
            onClear={() => set(f.key, null)}
            maxFractionDigits={f.type === "money" ? 0 : (f.digits ?? 2)}
            disabled={locked}
            placeholder="—"
            className={`${INPUT} disabled:bg-gray-50`}
          />
          {f.key === "exchangeRate" && !domestic && rate ? (
            <button
              type="button"
              onClick={() => set("exchangeRate", rate)}
              className="text-xs text-brand hover:underline">
              Dùng tỉ giá {rateCurrency} hôm nay:{" "}
              {formatNumber(rate, "en-US", { max: 4 })}
            </button>
          ) : null}
          {locked && (
            <p className="text-xs text-gray-500">Hàng nội địa: tỉ giá = 1</p>
          )}
        </div>
      );
    }
    case "date":
      return (
        <DatePickerInput
          value={toDateInput(v)}
          onChange={(d) => set(f.key, d || null)}
        />
      );
    case "parent":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={opts(reference?.categories.parent ?? [])}
          value={(v as string) ?? ""}
          onChange={textOrNull}
          placeholder="Chọn loại hàng"
        />
      );
    case "middle":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={opts(reference?.categories.middle ?? [])}
          value={(v as string) ?? ""}
          onChange={textOrNull}
          placeholder="Chọn nguồn gốc"
        />
      );
    case "child":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={opts(reference?.categories.child ?? [])}
          value={(v as string) ?? ""}
          onChange={textOrNull}
          placeholder="Chọn danh mục"
        />
      );
    case "unit":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={opts(reference?.units ?? [])}
          value={(v as string) ?? ""}
          onChange={textOrNull}
          placeholder="Chọn đơn vị"
        />
      );
    case "trademark":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={(reference?.trademarks ?? []).map((t) => ({
            value: String(t.id),
            label: t.name,
          }))}
          value={v ? String(v) : ""}
          onChange={(x) => set(f.key, x ? Number(x) : null)}
          placeholder={
            ticket?.tradeMarkName && !ticket.tradeMarkId
              ? `${ticket.tradeMarkName} (chưa có trong danh mục)`
              : "Chọn thương hiệu"
          }
        />
      );
    case "costApprover": {
      const list = reference?.costApprovers ?? [];
      const extra =
        ticket?.costApproverId &&
        !list.some((u) => u.id === ticket.costApproverId)
          ? [
              {
                id: ticket.costApproverId,
                name: ticket.costApproverName ?? `#${ticket.costApproverId}`,
              },
            ]
          : [];
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={[...list, ...extra].map((u) => ({
            value: String(u.id),
            label: u.name,
          }))}
          value={v ? String(v) : ""}
          onChange={(x) => set(f.key, x ? Number(x) : null)}
          placeholder="Phòng Thu Mua"
        />
      );
    }
    case "priceBook":
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={(reference?.priceBooks ?? []).map((p) => ({
            value: String(p.id),
            label: p.name,
          }))}
          value={v ? String(v) : ""}
          onChange={(x) => set(f.key, x ? Number(x) : null)}
          placeholder={
            ticket?.oemPriceBookName && !ticket.oemPriceBookId
              ? `${ticket.oemPriceBookName} (chưa có trên POS)`
              : "Chọn bảng giá"
          }
        />
      );
    case "supplier": {
      const factories = reference?.factories ?? [];
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={(reference?.suppliers ?? []).map((s) => ({
            value: String(s.id),
            label: s.code ? `${s.name} (${s.code})` : s.name,
          }))}
          value={v ? String(v) : ""}
          onChange={(x) => {
            const id = x ? Number(x) : null;
            set(f.key, id);
            // Đổi NCC → bỏ nhà máy không thuộc NCC mới
            const fac = factories.find((m) => m.id === get("factoryId"));
            if (id && fac?.supplierId && fac.supplierId !== id) {
              set("factoryId", null);
            }
          }}
          placeholder="Chọn nhà cung cấp"
        />
      );
    }
    case "factory": {
      const supplierId = get("supplierId") as number | null;
      // Có NCC → chỉ hiện nhà máy của NCC đó (và nhà máy chưa gắn NCC)
      const list = (reference?.factories ?? []).filter(
        (m) => !supplierId || !m.supplierId || m.supplierId === supplierId,
      );
      return (
        <SearchableSelect
          variant="form"
          clearable
          options={list.map((m) => ({
            value: String(m.id),
            label: [m.name, m.code && `(${m.code})`, m.currency]
              .filter(Boolean)
              .join(" · "),
          }))}
          value={v ? String(v) : ""}
          onChange={(x) => {
            const id = x ? Number(x) : null;
            set(f.key, id);
            const fac = (reference?.factories ?? []).find((m) => m.id === id);
            if (fac?.supplierId) set("supplierId", fac.supplierId);
          }}
          placeholder={
            ticket?.supplierFactory && !ticket.factoryId
              ? `${ticket.supplierFactory} (từ Lark — chọn lại)`
              : "Chọn nhà máy"
          }
        />
      );
    }
    case "misa":
      // Giống "Liên kết Misa" ở form sản phẩm: chọn từ danh mục vật tư Misa
      return (
        <MisaItemDropdown
          placeholder="Chọn vật tư hàng hóa Misa"
          value={(v as string) || undefined}
          onChange={(item) => set(f.key, item?.code ?? null)}
          fetchItems={newProductPriceApi.misaItems}
        />
      );
    case "customers":
      return (
        <OemCustomersInput
          value={(v as NppOemCustomer[]) ?? []}
          onChange={(list) => set(f.key, list)}
        />
      );
    case "computed":
      return (
        <div className="px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200">
          {fmtMoney(
            goodsPriceVnd({
              goodsPrice: num(get("goodsPrice")),
              exchangeRate: domestic ? 1 : num(get("exchangeRate")),
            }),
          )}
        </div>
      );
  }
}
