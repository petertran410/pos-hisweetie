"use client";

import { forwardRef } from "react";
import type { Quote } from "@/lib/types/quote";
import { QUOTE_DEFAULT_LOGO } from "@/lib/types/quote";
import { formatVnd, marginPct, tierColumns, withSalePrice } from "@/lib/quotes/pricing";

/**
 * Bản báo giá theo bố cục sheet Excel "BẢNG BÁO GIÁ TỔNG HỢP":
 * đầu trang công ty / quốc hiệu, tiêu đề, ngày áp dụng, kính gửi, lời mở đầu,
 * bảng STT · Tên · Quy cách · Hình ảnh · các cột giá, lời kết.
 *
 * Toàn bộ style viết inline để HTML tự đủ khi in PDF / chụp ảnh (lib/quotes/export).
 */

type PreviewQuote = Pick<
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
  | "showMargin"
  | "logoUrl"
  | "companyName"
  | "department"
>;

const FONT = "'Times New Roman', Times, serif";
const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  verticalAlign: "middle",
};
const head: React.CSSProperties = {
  ...cell,
  background: "#FFFF00",
  fontWeight: 700,
  textAlign: "center",
  fontSize: 13,
};

function dmy(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function longDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `Ngày ${d} tháng ${m} năm ${y}`;
}

export const QuotePreview = forwardRef<HTMLDivElement, { quote: PreviewQuote }>(
  function QuotePreview({ quote: raw }, ref) {
    const quote = { ...raw, items: raw.items.map(withSalePrice) };
    const cols = tierColumns(quote.items);
    const showMargin = quote.showMargin && cols.length > 1;
    const recipient = quote.customer
      ? `${quote.greeting} ${quote.customer.name}`
      : quote.greeting;

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "297mm",
          boxSizing: "border-box",
          padding: "12mm 10mm",
          background: "#fff",
          color: "#000",
          fontFamily: FONT,
          fontSize: 14,
          lineHeight: 1.35,
        }}>
        {/* Đầu trang: công ty bên trái, quốc hiệu bên phải */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", textAlign: "center", verticalAlign: "top" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {quote.logoUrl !== "" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={quote.logoUrl || QUOTE_DEFAULT_LOGO}
                      alt="Logo"
                      style={{ width: 52, height: 52, objectFit: "contain" }}
                    />
                  )}
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {quote.companyName.split("\n").map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                    {quote.department && (
                      <>
                        <div>*</div>
                        <div>{quote.department}</div>
                      </>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ width: "50%", textAlign: "center", verticalAlign: "top", fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div style={{ fontWeight: 700 }}>Độc Lập - Tự Do - Hạnh Phúc</div>
                <div>&nbsp;</div>
                <div style={{ fontStyle: "italic" }}>Hà Nội, {longDate(quote.appliedFrom)}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 17, marginTop: 14 }}>
          {quote.title}
        </div>
        <div style={{ textAlign: "center", fontStyle: "italic", marginTop: 2 }}>
          (Áp dụng cho khách hàng từ ngày {dmy(quote.appliedFrom)}
          {quote.validUntil ? ` đến ngày ${dmy(quote.validUntil)}` : ""})
        </div>
        <div style={{ fontWeight: 700, fontStyle: "italic", marginTop: 8 }}>Kính gửi: {recipient}</div>
        {(quote.customer?.contactNumber || quote.customer?.address) && (
          <div style={{ fontStyle: "italic" }}>
            {[quote.customer.contactNumber && `ĐT: ${quote.customer.contactNumber}`, quote.customer.address && `Địa chỉ: ${quote.customer.address}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
        <div style={{ fontStyle: "italic", marginTop: 4, textAlign: "justify" }}>{quote.intro}</div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead style={{ display: "table-header-group" }}>
            <tr>
              <th style={{ ...head, width: 30 }}>STT</th>
              <th style={{ ...head, minWidth: 150 }}>Tên sản phẩm</th>
              <th style={{ ...head, width: 88 }}>Quy cách</th>
              <th style={{ ...head, width: 70 }}>Hình ảnh</th>
              {cols.map((c) => (
                <th key={c.key} style={{ ...head, width: 76, fontSize: 12 }}>
                  {c.label}
                  <div style={{ fontWeight: 700, fontSize: 11 }}>(Đã bao gồm VAT)</div>
                </th>
              ))}
              {showMargin && <th style={{ ...head, width: 52, fontSize: 12 }}>Lợi nhuận</th>}
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => {
              const m = showMargin ? marginPct(it) : null;
              return (
                <tr key={it.id} style={{ pageBreakInside: "avoid" }}>
                  <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
                  <td style={cell}>{it.productName}</td>
                  <td style={{ ...cell, textAlign: "center", fontSize: 13 }}>({it.spec})</td>
                  <td style={{ ...cell, textAlign: "center", padding: 2, height: 66 }}>
                    {it.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageUrl}
                        alt=""
                        style={{ width: 62, height: 62, objectFit: "contain", display: "block", margin: "0 auto" }}
                      />
                    )}
                  </td>
                  {cols.map((c) => {
                    const t = it.tiers.find((x) => x.key === c.key);
                    return (
                      <td key={c.key} style={{ ...cell, textAlign: "center", whiteSpace: "nowrap" }}>
                        {it.comingSoon ? (
                          <span style={{ fontWeight: 700, fontSize: 12 }}>COMING SOON</span>
                        ) : (
                          formatVnd(t?.price)
                        )}
                      </td>
                    );
                  })}
                  {showMargin && (
                    <td style={{ ...cell, textAlign: "center" }}>
                      {m == null ? "" : `${Math.round(m * 100)}%`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 12, fontStyle: "italic", marginTop: 4 }}>Đơn vị tính giá: VNĐ / đơn vị bán (túi, hộp, gói…).</div>

        {quote.note && (
          <div style={{ marginTop: 10, whiteSpace: "pre-line" }}>
            <span style={{ fontWeight: 700 }}>Chính sách / ghi chú: </span>
            {quote.note}
          </div>
        )}
        <div style={{ marginTop: 10, whiteSpace: "pre-line", textAlign: "justify" }}>{quote.closing}</div>
      </div>
    );
  }
);
