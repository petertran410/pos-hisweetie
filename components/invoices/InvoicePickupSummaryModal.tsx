"use client";

import { useMemo, useState } from "react";
import { Printer, Search, X } from "lucide-react";
import type { Invoice } from "@/lib/types/invoice";

type PickupRow = {
  productId: number;
  productCode: string;
  productName: string;
  good: number;
  damaged: number;
  nearExpiry: number;
  promotion: number;
};

interface Props {
  invoices: Invoice[];
  onClose: () => void;
}

const isPromotionLine = (detail: any) =>
  detail.isGift === true ||
  detail.lineType === "gift" ||
  detail.lineType === "discounted_buy" ||
  detail.lineType === "promo_discount";

const numberText = (value: number) =>
  value.toLocaleString("vi-VN");

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function buildRows(invoices: Invoice[]): PickupRow[] {
  const rows = new Map<number, PickupRow>();

  for (const invoice of invoices) {
    for (const detail of invoice.details || []) {
      const productId = Number(detail.productId);
      const quantity = Number(detail.quantity || 0);
      if (!productId || !Number.isFinite(quantity) || quantity === 0) continue;

      const row = rows.get(productId) || {
        productId,
        productCode: detail.productCode || detail.product?.code || "-",
        productName: detail.productName || detail.product?.name || "-",
        good: 0,
        damaged: 0,
        nearExpiry: 0,
        promotion: 0,
      };

      if (isPromotionLine(detail)) row.promotion += quantity;
      else if (detail.conditionType === "damaged") row.damaged += quantity;
      else if (detail.conditionType === "near_expiry") row.nearExpiry += quantity;
      else row.good += quantity;

      rows.set(productId, row);
    }
  }

  return [...rows.values()].sort((a, b) =>
    a.productCode.localeCompare(b.productCode, "vi")
  );
}

function printRows(rows: PickupRow[], invoices: Invoice[]) {
  const totals = rows.reduce(
    (sum, row) => ({
      good: sum.good + row.good,
      damaged: sum.damaged + row.damaged,
      nearExpiry: sum.nearExpiry + row.nearExpiry,
      promotion: sum.promotion + row.promotion,
    }),
    { good: 0, damaged: 0, nearExpiry: 0, promotion: 0 }
  );
  const total = (row: PickupRow) =>
    row.good + row.damaged + row.nearExpiry + row.promotion;
  const grandTotal =
    totals.good + totals.damaged + totals.nearExpiry + totals.promotion;
  const invoiceCodes = invoices.map((invoice) => invoice.code).join(", ");
  const invoiceBody = invoices
    .map(
      (invoice, index) => `<tr><td>${index + 1}</td><td class="left">${escapeHtml(invoice.code)}</td><td class="left">${escapeHtml(invoice.customer?.name || "Khách vãng lai")}</td></tr>`
    )
    .join("");
  const body = rows
    .map(
      (row, index) => `<tr>
        <td>${index + 1}</td><td class="left">${escapeHtml(row.productCode)}</td>
        <td class="left name">${escapeHtml(row.productName)}</td>
        <td>${numberText(row.good)}</td><td>${numberText(row.damaged)}</td>
        <td>${numberText(row.nearExpiry)}</td><td>${numberText(row.promotion)}</td>
        <td class="bold">${numberText(total(row))}</td>
      </tr>`
    )
    .join("");

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pick-up</title>
    <style>
      @page { size: A5 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111; font: 8px Arial, sans-serif; }
      h1 { font-size: 14px; text-align: center; margin: 0 0 5px; }
      .meta { line-height: 1.45; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 0.5px solid #555; padding: 2px 1px; text-align: center; vertical-align: middle; word-break: break-word; }
      th { background: #eee; font-weight: 700; }
      .left { text-align: left; }
      .name { width: 27%; }
      .bold { font-weight: 700; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      tfoot td { background: #eee; font-weight: 700; }
      .invoice-table { margin-bottom: 7px; }
      .section-title { font-weight: 700; font-size: 9px; margin: 5px 0 3px; }
    </style></head><body>
    <h1>DANH SÁCH TỔNG HỢP HÀNG PICK-UP</h1>
    <div class="meta"><b>Thời gian:</b> ${escapeHtml(new Date().toLocaleString("vi-VN"))}<br>
    <b>Số hóa đơn:</b> ${invoices.length} &nbsp; <b>Mã:</b> ${escapeHtml(invoiceCodes)}<br>
    <b>Số mặt hàng:</b> ${rows.length} &nbsp; <b>Tổng số lượng:</b> ${numberText(grandTotal)}</div>
    <table class="invoice-table"><thead><tr><th style="width:8%">STT</th><th style="width:28%">Mã HĐ</th><th>Tên khách hàng</th></tr></thead><tbody>${invoiceBody}</tbody></table>
    <div class="section-title">CHI TIẾT HÀNG HÓA</div>
    <table><thead><tr><th style="width:5%">STT</th><th style="width:14%">Mã SP</th><th class="name">Tên SP</th><th style="width:10%">Tốt</th><th style="width:11%">Bục rách</th><th style="width:11%">Cận date</th><th style="width:10%">KM</th><th style="width:12%">Tổng</th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><td colspan="3">TỔNG CỘNG</td><td>${numberText(totals.good)}</td><td>${numberText(totals.damaged)}</td><td>${numberText(totals.nearExpiry)}</td><td>${numberText(totals.promotion)}</td><td>${numberText(grandTotal)}</td></tr></tfoot></table>
    </body></html>`);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 100);
  };
}

export function InvoicePickupSummaryModal({ invoices, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const rows = useMemo(() => buildRows(invoices), [invoices]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.productCode.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query)
    );
  }, [rows, search]);
  const totals = rows.reduce(
    (sum, row) => ({
      good: sum.good + row.good,
      damaged: sum.damaged + row.damaged,
      nearExpiry: sum.nearExpiry + row.nearExpiry,
      promotion: sum.promotion + row.promotion,
    }),
    { good: 0, damaged: 0, nearExpiry: 0, promotion: 0 }
  );
  const rowTotal = (row: PickupRow) =>
    row.good + row.damaged + row.nearExpiry + row.promotion;
  const grandTotal =
    totals.good + totals.damaged + totals.nearExpiry + totals.promotion;

  const handlePrint = () => {
    setIsPrinting(true);
    printRows(rows, invoices);
    setTimeout(() => setIsPrinting(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tổng hợp hàng pick-up</h2>
            <p className="mt-1 text-xs text-gray-500">
              {invoices.length} hóa đơn · {rows.length} sản phẩm · {numberText(grandTotal)} sản phẩm
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b bg-gray-50 px-5 py-3 text-sm">
          <span className="text-gray-600">Hóa đơn:</span>
          <span className="max-w-2xl truncate font-medium" title={invoices.map((i) => i.code).join(", ")}>
            {invoices.map((i) => i.code).join(", ")}
          </span>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã hoặc tên sản phẩm" className="w-64 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand" />
          </div>
        </div>

        <div className="border-b px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Danh sách hóa đơn
          </p>
          <div className="max-h-28 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-3 py-1.5 text-left">STT</th>
                  <th className="px-3 py-1.5 text-left">Mã hóa đơn</th>
                  <th className="px-3 py-1.5 text-left">Tên khách hàng</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, index) => (
                  <tr key={invoice.id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{index + 1}</td>
                    <td className="px-3 py-1.5 font-medium">{invoice.code}</td>
                    <td className="px-3 py-1.5">
                      {invoice.customer?.name || "Khách vãng lai"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="border px-3 py-2 text-left">STT</th>
                <th className="border px-3 py-2 text-left">Mã sản phẩm</th>
                <th className="border px-3 py-2 text-left">Tên sản phẩm</th>
                <th className="border px-3 py-2 text-right">Hàng tốt</th>
                <th className="border px-3 py-2 text-right">Hàng bục rách</th>
                <th className="border px-3 py-2 text-right">Cận date</th>
                <th className="border px-3 py-2 text-right">Khuyến mãi</th>
                <th className="border px-3 py-2 text-right font-bold">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.productId} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 text-gray-500">{index + 1}</td>
                  <td className="border px-3 py-2 font-medium">{row.productCode}</td>
                  <td className="border px-3 py-2">{row.productName}</td>
                  <td className="border px-3 py-2 text-right">{numberText(row.good)}</td>
                  <td className="border px-3 py-2 text-right">{numberText(row.damaged)}</td>
                  <td className="border px-3 py-2 text-right">{numberText(row.nearExpiry)}</td>
                  <td className="border px-3 py-2 text-right">{numberText(row.promotion)}</td>
                  <td className="border px-3 py-2 text-right font-bold">{numberText(rowTotal(row))}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={8} className="border px-3 py-10 text-center text-gray-400">Không có sản phẩm phù hợp</td></tr>}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td colSpan={3} className="border px-3 py-2 text-right">TỔNG CỘNG</td>
                <td className="border px-3 py-2 text-right">{numberText(totals.good)}</td>
                <td className="border px-3 py-2 text-right">{numberText(totals.damaged)}</td>
                <td className="border px-3 py-2 text-right">{numberText(totals.nearExpiry)}</td>
                <td className="border px-3 py-2 text-right">{numberText(totals.promotion)}</td>
                <td className="border px-3 py-2 text-right">{numberText(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Đóng</button>
          <button onClick={handlePrint} disabled={isPrinting || rows.length === 0} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            <Printer className="h-4 w-4" />
            {isPrinting ? "Đang tạo bản in..." : "In A5"}
          </button>
        </div>
      </div>
    </div>
  );
}
