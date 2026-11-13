"use client";

import { forwardRef } from "react";
import type { Quote, QuoteItem } from "@/lib/types/quote";
import { diffPct, formatVnd, marginPct, tierColumns } from "@/lib/quotes/pricing";

/**
 * Mẫu 2 — thiết kế thương hiệu LerMao (canvas "Báo giá LerMao – 3 nhóm khách"):
 * - Khách lẻ: thẻ sản phẩm có ảnh lớn.
 * - Khách chuỗi: đầu trang navy, giá niêm yết gạch ngang + % tiết kiệm, ô ký xác nhận.
 * - Đại lý: bảng theo thùng (giá / thùng) + lợi nhuận.
 * Style inline (tokens LerMao) để in PDF / chụp ảnh như Mẫu 1.
 */

export type BrandPreviewQuote = Pick<
  Quote,
  | "template"
  | "title"
  | "greeting"
  | "intro"
  | "closing"
  | "note"
  | "appliedFrom"
  | "validUntil"
  | "customer"
  | "items"
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
const COMPANY = "Công ty TNHH Xuất Nhập Khẩu Hi Sweetie Việt Nam";

const dmy = (iso: string | null) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const pct = (p: number | null) => (p == null ? "" : `${(p * 100).toFixed(1).replace(".", ",")}%`);
/** Số đơn vị / thùng từ quy cách "12 túi/thùng" (không có → null). */
const perCarton = (spec: string) => Number(spec.match(/(\d+)\s*[^\d/]*\/\s*thùng/i)?.[1]) || null;
const firstPrice = (it: QuoteItem) => it.tiers[0]?.price ?? null;

function Header({ title, sub, dark }: { title: string; sub: string; dark?: boolean }) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brands/lermao.webp" alt="Logo Gấu LerMao" style={{ width: 58, height: 58, objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: fg, letterSpacing: 0.5 }}>GẤU LERMAO</span>
          <span style={{ fontSize: 12, color: fg }}>{COMPANY}</span>
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
      style={{ width: size, height: size, borderRadius: 5, objectFit: "cover", flexShrink: 0, background: C.surface }}
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

function Footer() {
  return (
    <div
      style={{
        marginTop: "auto",
        borderTop: `1px solid ${C.border}`,
        paddingTop: 10,
        fontSize: 12,
        color: C.navy,
      }}>
      {COMPANY} · Thương hiệu Gấu LerMao
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

/** Khách lẻ: thẻ sản phẩm. */
function Retail({ quote }: { quote: BrandPreviewQuote }) {
  return (
    <div style={{ ...page, padding: "36px 40px 28px", gap: 16 }}>
      <Header title="BÁO GIÁ" sub={sub(quote, "Ngày")} />
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
            {it.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.imageUrl} alt="" style={{ width: "100%", height: 110, objectFit: "cover", display: "block", background: C.surface }} />
            ) : (
              <div style={{ height: 110, background: C.surface }} />
            )}
            <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
              {it.productCode && <span style={{ fontSize: 12, color: C.navy }}>{it.productCode}</span>}
              <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700 }}>{it.productName}</span>
              <span style={{ fontSize: 12, lineHeight: "16px", color: C.navy }}>{it.spec}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: "auto", paddingTop: 4 }}>
                {it.comingSoon ? (
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>COMING SOON</span>
                ) : (
                  <>
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.link }}>{formatVnd(firstPrice(it))}đ</span>
                    <span style={{ fontSize: 12, color: C.navy }}>/{it.unit}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.navy }}>Đơn giá đã bao gồm VAT.</div>
      <NoteAndClosing quote={quote} />
      <Footer />
    </div>
  );
}

const th: React.CSSProperties = { padding: "9px 8px", fontSize: 12, fontWeight: 600, textAlign: "right", color: C.white };
const td: React.CSSProperties = { padding: "6px 8px", fontSize: 12, borderTop: `1px solid ${C.border}`, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function ProductCell({ it }: { it: QuoteItem }) {
  return (
    <td style={{ ...td, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Thumb src={it.imageUrl} size={38} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{it.productName}</span>
          <span style={{ color: C.navy }}>
            {[it.productCode, it.spec].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
    </td>
  );
}

/** Khách chuỗi: giá niêm yết vs giá chuỗi. */
function Chain({ quote }: { quote: BrandPreviewQuote }) {
  const cols = tierColumns(quote.items);
  const saves = quote.items
    .map((it) => diffPct(firstPrice(it), it.basePrice))
    .filter((p): p is number => p != null && p < 0)
    .map((p) => -p);
  const saveRange = saves.length
    ? `${Math.round(Math.min(...saves) * 100)}–${Math.round(Math.max(...saves) * 100)}%`
    : "—";
  const kpi = (big: string, text: string, gold?: boolean) => (
    <div
      style={{
        background: gold ? C.gold : C.surface,
        borderRadius: 8,
        padding: "12px 16px",
        display: "flex",
        alignItems: "baseline",
        gap: 10,
      }}>
      <span style={{ fontSize: 26, fontWeight: 800, color: gold ? C.navy : C.link }}>{big}</span>
      <span style={{ fontSize: 12, lineHeight: "16px", color: C.navy }}>{text}</span>
    </div>
  );
  return (
    <div style={page}>
      <Header title="BÁO GIÁ CHIẾN LƯỢC" sub={sub(quote, "Dành cho chuỗi F&B ·")} dark />
      <div style={{ flexGrow: 1, padding: "20px 40px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Recipient quote={quote} />
          <Validity quote={quote} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {kpi(String(quote.items.length), "SKU đề xuất cho menu của chuỗi")}
          {kpi(saveRange, "thấp hơn giá niêm yết", true)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{quote.title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${C.border}` }}>
          <thead style={{ display: "table-header-group", background: C.navy }}>
            <tr>
              <th style={{ ...th, textAlign: "left", width: 26 }}>STT</th>
              <th style={{ ...th, textAlign: "left" }}>Sản phẩm</th>
              <th style={th}>Giá niêm yết</th>
              {cols.map((c) => (
                <th key={c.key} style={th}>
                  {c.label}
                </th>
              ))}
              <th style={th}>Tiết kiệm</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => {
              const save = diffPct(firstPrice(it), it.basePrice);
              return (
                <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...td, textAlign: "left", color: C.navy }}>{i + 1}</td>
                  <ProductCell it={it} />
                  <td style={{ ...td, color: C.navy, textDecoration: "line-through" }}>{formatVnd(it.basePrice)}</td>
                  {cols.map((c) => (
                    <td key={c.key} style={{ ...td, fontSize: 14, fontWeight: 800, color: C.link }}>
                      {it.comingSoon ? "—" : formatVnd(it.tiers.find((t) => t.key === c.key)?.price)}
                    </td>
                  ))}
                  <td style={{ ...td, fontWeight: 700, color: C.navy }}>
                    {save != null && save < 0 ? `−${pct(-save)}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 12, color: C.navy }}>Đơn vị: đồng / đơn vị bán, đã bao gồm VAT. Giá niêm yết = Bảng giá chung.</div>
        <NoteAndClosing quote={quote} />
        <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, textAlign: "center", fontSize: 12 }}>
          {[`ĐẠI DIỆN ${COMPANY.toUpperCase()}`, "XÁC NHẬN CỦA CHUỖI"].map((s, i) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>{s}</span>
              <span style={{ color: C.navy }}>{i ? "(Ký, ghi rõ họ tên, đóng dấu)" : "(Ký, ghi rõ họ tên)"}</span>
              <div style={{ height: 56 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Đại lý: giá theo đơn vị + theo thùng + lợi nhuận. */
function Agency({ quote }: { quote: BrandPreviewQuote }) {
  const cols = tierColumns(quote.items);
  const lowKey = cols[cols.length - 1]?.key;
  return (
    <div style={{ ...page, padding: "32px 40px 28px", gap: 14 }}>
      <Header title="BẢNG GIÁ ĐẠI LÝ" sub={sub(quote, "Áp dụng từ")} />
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
      <Footer />
    </div>
  );
}

export const QuotePreviewBrand = forwardRef<HTMLDivElement, { quote: BrandPreviewQuote }>(
  function QuotePreviewBrand({ quote }, ref) {
    return (
      <div ref={ref}>
        {quote.template === "retail" ? (
          <Retail quote={quote} />
        ) : quote.template === "chain" ? (
          <Chain quote={quote} />
        ) : (
          <Agency quote={quote} />
        )}
      </div>
    );
  }
);
