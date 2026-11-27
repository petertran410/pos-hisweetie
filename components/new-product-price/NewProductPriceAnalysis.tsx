"use client";

import { fmtMoney, fmtPercent } from "@/lib/new-product-price/constants";
import type {
  NppAnalysisRow,
  NppTicketDetail,
} from "@/lib/types/new-product-price";

/** Phân tích giá theo công thức Lark: giá trước VAT, COGS, lợi nhuận, tỷ suất. */
export function NewProductPriceAnalysis({
  ticket,
}: {
  ticket: NppTicketDetail;
}) {
  const summary: [string, string][] = [
    ["Giá hàng VNĐ", fmtMoney(ticket.goodsPriceVnd)],
    ["Cost Hà Nội (trước VAT)", fmtMoney(ticket.costHn)],
    ["Cost Sài Gòn (trước VAT)", fmtMoney(ticket.costSg)],
    ["Giá vốn Hà Nội", fmtMoney(ticket.cogsHn)],
    ["Giá vốn Sài Gòn", fmtMoney(ticket.cogsSg)],
    ["Giá vốn CH Diệp Trà", fmtMoney(ticket.cogsDt)],
  ];
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-6">
        {summary.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <NppAnalysisTable rows={ticket.analysis} />
    </div>
  );
}

/** Bảng lãi theo từng giá bán (dùng cả để xem trước khi đang nhập giá). */
export function NppAnalysisTable({ rows }: { rows: NppAnalysisRow[] }) {
  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Giá bán",
                "Giá",
                "Trước VAT",
                "Giá vốn so sánh",
                "Lợi nhuận",
                "Tỷ suất LN",
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
            {rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {r.label}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {fmtMoney(r.price)}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {fmtMoney(r.priceExVat)}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {fmtMoney(r.cogs)}
                  <span className="block text-[11px] text-gray-400">
                    {r.basis}
                  </span>
                </td>
                <td
                  className={`px-4 py-2.5 ${r.profit !== null && r.profit < 0 ? "text-red-600" : "text-gray-700"}`}>
                  {fmtMoney(r.profit)}
                </td>
                <td
                  className={`px-4 py-2.5 font-medium ${r.margin !== null && r.margin < 0 ? "text-red-600" : "text-gray-800"}`}>
                  {fmtPercent(r.margin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Trước VAT = giá / 1,08 · Lợi nhuận = giá trước VAT − giá vốn trước VAT ·
        Tỷ suất = lợi nhuận / giá vốn. Shopee so với giá vốn CH Diệp Trà, không
        chia VAT.
      </p>
    </div>
  );
}
