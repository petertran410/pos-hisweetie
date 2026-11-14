"use client";

import { forwardRef } from "react";
import type { Quote, QuoteItem } from "@/lib/types/quote";
import { ColdBadge } from "./ColdBadge";
import { QUOTE_DEFAULT_LOGO } from "@/lib/types/quote";
import { formatVnd, marginPct, printName, tierColumns, withSalePrice } from "@/lib/quotes/pricing";

/**
 * Mẫu 2 — thiết kế thương hiệu LerMao, chọn bố cục theo số cột giá:
 * - 1 cột giá: thẻ sản phẩm có ảnh lớn.
 * - Nhiều cột giá (khung số lượng): bảng theo thùng (giá / thùng) + lợi nhuận.
 * Style inline (tokens LerMao) để in PDF / chụp ảnh như Mẫu 1.
 */

export type BrandPreviewQuote = Pick<
  Quote,
  | "title"
  | "greeting"
  | "intro"
  | "closing"
  | "note"
  | "appliedFrom"
  | "validUntil"
  | "customer"
  | "items"
  | "logoUrl"
  | "companyName"
  | "department"
> & { code?: string };

// Tokens design system LerMao
const C = {
  ink: "#000000",
  navy: "#162d3c",
  link: "#005a9f",
  accent: "#5fb7f4",
  gold: "#f6b31f",
  surface: "#f5f5f5",
  border: "#dbdbdb",
  white: "#ffffff",
};
const FONT = "Montserrat, 'Segoe UI', Arial, sans-serif";
/** Tên công ty trên 1 dòng (mẫu lưu xuống dòng cho Mẫu 1). */
const company = (q: BrandPreviewQuote) => q.companyName.split("\n").join(" ").trim();

const dmy = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const pct = (p: number | null) => (p == null ? "" : `${(p * 100).toFixed(1).replace(".", ",")}%`);
/** Số đơn vị / thùng từ quy cách "12 túi/thùng" (không có → null). */
const perCarton = (spec: string) => Number(spec.match(/(\d+)\s*[^\d/]*\/\s*thùng/i)?.[1]) || null;
const firstPrice = (it: QuoteItem) => it.tiers[0]?.price ?? null;

function Header({ quote, title, sub, dark }: { quote: BrandPreviewQuote; title: string; sub: string; dark?: boolean }) {
  const fg = dark ? C.white : C.navy;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: dark ? "22px 40px" : "0 0 14px",
        background: dark ? C.navy : "transparent",
        borderBottom: dark ? "none" : `3px solid ${C.accent}`,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {quote.logoUrl !== "" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={quote.logoUrl || QUOTE_DEFAULT_LOGO} alt="Logo" style={{ width: 58, height: 58, objectFit: "contain" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: fg, letterSpacing: 0.3 }}>{company(quote)}</span>
          {quote.department && <span style={{ fontSize: 12, color: fg }}>{quote.department}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, textAlign: "right" }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: dark ? C.white : C.ink, lineHeight: 1 }}>{title}</span>
        <span style={{ fontSize: 12, color: fg }}>{sub}</span>
      </div>
    </div>
  );
}

function InfoBox({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.link }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{main}</span>
      {sub && <span style={{ fontSize: 12, color: C.navy }}>{sub}</span>}
    </div>
  );
}

function Recipient({ quote }: { quote: BrandPreviewQuote }) {
  const c = quote.customer;
  const contact = [c?.contactNumber, c?.address].filter(Boolean).join(" · ");
  return (
    <InfoBox
      label="KÍNH GỬI"
      main={c ? c.name : quote.greeting}
      sub={contact || (c ? quote.greeting : undefined)}
    />
  );
}

function Validity({ quote }: { quote: BrandPreviewQuote }) {
  return (
    <InfoBox
      label="HIỆU LỰC"
      main={quote.validUntil ? `Đến ${dmy(quote.validUntil)}` : "Không thời hạn"}
      sub={`Áp dụng từ ${dmy(quote.appliedFrom)}`}
    />
  );
}

function Thumb({ src, size }: { src: string | null; size: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, borderRadius: 5, objectFit: "contain", flexShrink: 0, background: C.white, border: `1px solid ${C.border}` }}
    />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 5, flexShrink: 0, background: C.surface }} />
  );
}

function NoteAndClosing({ quote }: { quote: BrandPreviewQuote }) {
  return (
    <>
      {quote.note && (
        <div style={{ background: C.surface, borderRadius: 8, padding: "12px 16px", fontSize: 12, lineHeight: "18px", whiteSpace: "pre-line" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Chính sách &amp; ghi chú</div>
          {quote.note}
        </div>
      )}
      <div style={{ fontSize: 12, lineHeight: "18px", color: C.navy, whiteSpace: "pre-line" }}>{quote.closing}</div>
    </>
  );
}

function Footer({ quote }: { quote: BrandPreviewQuote }) {
  return (
    <div
      style={{
        marginTop: "auto",
        borderTop: `1px solid ${C.border}`,
        paddingTop: 10,
        fontSize: 12,
        color: C.navy,
      }}>
      {company(quote)}
    </div>
  );
}

const page: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  background: C.white,
  color: C.ink,
  fontFamily: FONT,
  fontSize: 13,
};
const sub = (q: BrandPreviewQuote, prefix: string) =>
  `${q.code ? `Số ${q.code} · ` : ""}${prefix} ${dmy(q.appliedFrom)}`;

/** 1 cột giá: thẻ sản phẩm. */
function Cards({ quote }: { quote: BrandPreviewQuote }) {
  return (
    <div style={{ ...page, padding: "36px 40px 28px", gap: 16 }}>
      <Header quote={quote} title="BÁO GIÁ" sub={sub(quote, "Ngày")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Recipient quote={quote} />
        <Validity quote={quote} />
      </div>
      <div style={{ background: C.accent, borderRadius: 8, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, fontStyle: "italic" }}>{quote.title}</span>
        <span style={{ fontSize: 13, lineHeight: "20px" }}>{quote.intro}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        {quote.items.map((it) => (
          <div
            key={it.id}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              pageBreakInside: "avoid",
            }}>
            <div style={{ position: "relative" }}>
              {/* Khung ảnh vuông 1:1, ảnh giữ nguyên tỷ lệ (không cắt bao bì) */}
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrl}
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "contain",
                    display: "block",
                    padding: 8,
                    boxSizing: "border-box", // bản in PDF không có CSS reset của app
                    background: C.white,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1 / 1", background: C.surface }} />
              )}
              {it.cold && <ColdBadge size={22} />}
            </div>
            <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
              {it.productCode && <span style={{ fontSize: 12, color: C.navy }}>{it.productCode}</span>}
              <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700 }}>{printName(it)}</span>
              <span style={{ fontSize: 12, lineHeight: "16px", color: C.navy }}>{it.spec}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: "auto", paddingTop: 4 }}>
                {it.comingSoon ? (
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>COMING SOON</span>
                ) : (
                  firstPrice(it) == null ? (
                    // Chưa có giá: không in "đ" trống
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Liên hệ</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 18, fontWeight: 800, color: C.link }}>{formatVnd(firstPrice(it))}đ</span>
                      <span style={{ fontSize: 12, color: C.navy }}>/{it.unit}</span>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.navy }}>Đơn giá đã bao gồm VAT.</div>
      <NoteAndClosing quote={quote} />
      <Footer quote={quote} />
    </div>
  );
}

const th: React.CSSProperties = { padding: "9px 8px", fontSize: 12, fontWeight: 600, textAlign: "right", color: C.white };
const td: React.CSSProperties = { padding: "6px 8px", fontSize: 12, borderTop: `1px solid ${C.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function ProductCell({ it }: { it: QuoteItem }) {
  return (
    <td style={{ ...td, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Thumb src={it.imageUrl} size={38} />
          {it.cold && <ColdBadge size={14} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{printName(it)}</span>
          <span style={{ color: C.navy }}>
            {[it.productCode, it.spec].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
    </td>
  );
}

/** Nhiều cột giá: giá theo đơn vị + theo thùng + lợi nhuận. */
function PriceTable({ quote }: { quote: BrandPreviewQuote }) {
  const cols = tierColumns(quote.items);
  const lowKey = cols[cols.length - 1]?.key;
  return (
    <div style={{ ...page, padding: "32px 40px 28px", gap: 14 }}>
      <Header quote={quote} title="BẢNG GIÁ" sub={sub(quote, "Áp dụng từ")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Recipient quote={quote} />
        <Validity quote={quote} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{quote.title}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${C.border}` }}>
        <thead style={{ display: "table-header-group", background: C.navy }}>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>Sản phẩm</th>
            {cols.map((c) => (
              <th key={c.key} style={th}>
                {c.label}
              </th>
            ))}
            <th style={th}>Giá / thùng</th>
            {cols.length > 1 && <th style={th}>Lợi nhuận</th>}
          </tr>
        </thead>
        <tbody>
          {quote.items.map((it) => {
            const low = it.tiers.find((t) => t.key === lowKey)?.price ?? null;
            const n = perCarton(it.spec);
            return (
              <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                <ProductCell it={it} />
                {cols.map((c, k) => (
                  <td
                    key={c.key}
                    style={{ ...td, fontWeight: k === cols.length - 1 ? 800 : 400, color: k === cols.length - 1 ? C.link : C.ink }}>
                    {it.comingSoon ? "—" : formatVnd(it.tiers.find((t) => t.key === c.key)?.price)}
                  </td>
                ))}
                <td style={{ ...td, fontWeight: 700 }}>{!it.comingSoon && low != null && n ? formatVnd(low * n) : ""}</td>
                {cols.length > 1 && (
                  <td style={{ ...td, fontWeight: 700, color: C.navy }}>{it.comingSoon ? "" : pct(marginPct(it))}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 12, lineHeight: "18px", color: C.navy }}>
        Đơn vị: đồng, đã bao gồm VAT. Giá / thùng tính theo khung giá thấp nhất × số đơn vị / thùng. Lợi nhuận = (giá
        khung đầu − giá thấp nhất) ÷ giá thấp nhất.
      </div>
      <NoteAndClosing quote={quote} />
      <Footer quote={quote} />
    </div>
  );
}

export const QuotePreviewBrand = forwardRef<HTMLDivElement, { quote: BrandPreviewQuote }>(
  function QuotePreviewBrand({ quote: raw }, ref) {
    const quote = { ...raw, items: raw.items.map(withSalePrice) };
    return (
      <div ref={ref}>
        {tierColumns(quote.items).length > 1 ? <PriceTable quote={quote} /> : <Cards quote={quote} />}
      </div>
    );
  }
);
