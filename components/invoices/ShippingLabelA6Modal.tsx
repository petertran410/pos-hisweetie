"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { packingSlipsApi } from "@/lib/api/packing-slips";
import { apiClient } from "@/lib/config/api";
import type { Invoice } from "@/lib/types/invoice";

/**
 * Tem giao hàng A6 (105×148mm) — dựng theo mẫu "Tem A6.xlsx".
 * Dữ liệu mặc định lấy từ hóa đơn, sửa được trong modal; KHÔNG lưu lại.
 */

interface LabelFields {
  date: string;
  code: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  address: string;
  carrier: string;
  packages: string;
  note: string;
  footer: string;
}

const FOOTER_TEXT =
  "Vui lòng kiểm tra hàng trước khi nhận – Hàng dễ vỡ, xin nhẹ tay!";

// Chiều cao dòng (pt) của mẫu Excel → quy đổi theo khổ A6. A6 trừ lề 2mm còn
// 144mm; chừa ~5mm cho viền các dòng (đo thực tế ~4mm) để không tràn trang 2.
const ROW_PT = [40, 22, 20, 24, 24, 20, 32, 32, 64, 20, 26, 38, 46, 32];
const CONTENT_MM = 139;
const TOTAL_PT = ROW_PT.reduce((s, h) => s + h, 0);
const rowMm = (row: number) => (ROW_PT[row - 1] / TOTAL_PT) * CONTENT_MM;

const LABEL_CSS = `
.tem-sheet { width: 105mm; height: 148mm; padding: 2mm; box-sizing: border-box;
  overflow: hidden; background: #fff; color: #000;
  font-family: Arial, Helvetica, sans-serif; }
.tem-table { width: 100%; border-collapse: collapse; table-layout: fixed;
  border: 2px solid #000; }
.tem-table td { border: 1px solid #000; padding: 0 1.5mm; overflow: hidden;
  font-weight: bold; }
.tem-label { font-size: 11pt; vertical-align: middle; }
.tem-label.top { vertical-align: top; padding-top: 1mm; }
.tem-section td { font-size: 11pt; border-top-width: 1.5px;
  border-bottom-width: 1.5px; }
.tem-title td { background: #000; color: #fff; font-size: 20pt;
  text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.tem-fit { display: flex; align-items: center; overflow: hidden;
  line-height: 1.15; overflow-wrap: anywhere; white-space: pre-wrap; }
.tem-fit.top { align-items: flex-start; padding-top: 1mm; box-sizing: border-box; }
.tem-fit.center { justify-content: center; text-align: center; }
.tem-fit.split { justify-content: space-between; gap: 3mm; white-space: nowrap;
  overflow-wrap: normal; }
`;

/** +84xxxxxxxxx → 0xxxxxxxxx cho dễ đọc trên tem. */
export function formatPhone(phone?: string | null): string {
  const p = (phone || "").trim();
  return p.startsWith("+84") ? `0${p.slice(3)}` : p;
}

function joinParts(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .map((p) => (p || "").trim())
    .filter((p) => {
      const key = p.toLowerCase();
      if (!p || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

function formatDateVN(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Số kiện: phiếu Giao hàng → Đóng hàng → Loading (chưa hủy, mới nhất). */
function latestPackages(groups: any[][]): number | null {
  for (const list of groups) {
    const active = (list || [])
      .filter((p) => !p.cancelledAt)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    if (active.length && active[0].numberOfPackages != null) {
      return Number(active[0].numberOfPackages);
    }
  }
  return null;
}

export function buildDefaults(invoice: Invoice, packages: number | null): LabelFields {
  const inv: any = invoice;
  const customer = inv.customer || {};
  const delivery = inv.delivery || {};
  const seller = inv.soldBy || inv.creator || {};
  const defaultAddress =
    (customer.addresses || []).find((a: any) => a.isDefault) ||
    customer.addresses?.[0];

  const address = delivery.address
    ? joinParts([
        delivery.address,
        delivery.newWardName || delivery.wardName,
        delivery.newCityName || delivery.locationName || delivery.oldCityName,
      ])
    : defaultAddress
      ? joinParts([
          defaultAddress.address,
          defaultAddress.newWardName || defaultAddress.wardName,
          defaultAddress.newWardName ? null : defaultAddress.districtName,
          defaultAddress.newCityName || defaultAddress.cityName,
        ])
      : "";

  return {
    date: formatDateVN(inv.purchaseDate || inv.createdAt),
    code: inv.code || "",
    senderName: seller.name || "",
    senderPhone: formatPhone(
      seller.phone || inv.creator?.phone || inv.branch?.contactNumber
    ),
    receiverName: delivery.receiver || customer.name || "",
    receiverPhone: formatPhone(
      delivery.contactNumber || customer.contactNumber || customer.phone
    ),
    address,
    carrier: delivery.partnerDelivery?.name || "",
    packages: String(packages ?? 1),
    note: customer.comments ? String(customer.comments) : "",
    footer: FOOTER_TEXT,
  };
}

/** Thu nhỏ chữ trong các ô .tem-fit cho tới khi vừa ô (tối thiểu 6pt). */
function fitText(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(".tem-fit").forEach((el) => {
    let size = Number(el.dataset.base) || 11;
    el.style.fontSize = `${size}pt`;
    while (
      (el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1) &&
      size > 6
    ) {
      size -= 0.5;
      el.style.fontSize = `${size}pt`;
    }
  });
}

function Fit({
  row,
  base,
  align,
  children,
}: {
  row: number;
  base: number;
  align?: "top" | "center" | "split";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`tem-fit${align ? ` ${align}` : ""}`}
      data-base={base}
      style={{ height: `${rowMm(row)}mm` }}>
      {children}
    </div>
  );
}

function LabelSheet({ f }: { f: LabelFields }) {
  const tr = (row: number) => ({ style: { height: `${rowMm(row)}mm` } });
  return (
    <div className="tem-sheet">
      <table className="tem-table">
        <colgroup>
          <col style={{ width: "26.5%" }} />
          <col style={{ width: "44.1%" }} />
          <col style={{ width: "29.4%" }} />
        </colgroup>
        <tbody>
          <tr className="tem-title" {...tr(1)}>
            <td colSpan={3}>PHIẾU GỬI HÀNG</td>
          </tr>
          {/* Mẫu không kẻ dọc giữa Ngày / Mã đơn → 1 ô, 2 bên. */}
          <tr {...tr(2)}>
            <td colSpan={3}>
              <Fit row={2} base={10} align="split">
                <span>Ngày: {f.date}</span>
                <span>Mã đơn: {f.code}</span>
              </Fit>
            </td>
          </tr>
          <tr className="tem-section" {...tr(3)}>
            <td colSpan={3}>NGƯỜI GỬI</td>
          </tr>
          <tr {...tr(4)}>
            <td className="tem-label">Người gửi:</td>
            <td colSpan={2}>
              <Fit row={4} base={12}>{f.senderName}</Fit>
            </td>
          </tr>
          <tr {...tr(5)}>
            <td className="tem-label">SĐT:</td>
            <td colSpan={2}>
              <Fit row={5} base={12}>{f.senderPhone}</Fit>
            </td>
          </tr>
          <tr className="tem-section" {...tr(6)}>
            <td colSpan={3}>NGƯỜI NHẬN</td>
          </tr>
          <tr {...tr(7)}>
            <td className="tem-label">Người nhận:</td>
            <td colSpan={2}>
              <Fit row={7} base={16}>{f.receiverName}</Fit>
            </td>
          </tr>
          <tr {...tr(8)}>
            <td className="tem-label">SĐT:</td>
            <td colSpan={2}>
              <Fit row={8} base={16}>{f.receiverPhone}</Fit>
            </td>
          </tr>
          <tr {...tr(9)}>
            <td className="tem-label top">Địa chỉ:</td>
            <td colSpan={2}>
              <Fit row={9} base={13} align="top">
                {f.address}
              </Fit>
            </td>
          </tr>
          <tr className="tem-section" {...tr(10)}>
            <td colSpan={3}>VẬN CHUYỂN</td>
          </tr>
          <tr {...tr(11)}>
            <td className="tem-label">Nhà xe:</td>
            <td colSpan={2}>
              <Fit row={11} base={12}>{f.carrier}</Fit>
            </td>
          </tr>
          <tr {...tr(12)}>
            <td className="tem-label">Số kiện:</td>
            <td colSpan={2}>
              <Fit row={12} base={20}>{f.packages}</Fit>
            </td>
          </tr>
          <tr {...tr(13)}>
            <td className="tem-label top">Ghi chú:</td>
            <td colSpan={2}>
              <Fit row={13} base={12} align="top">
                {f.note}
              </Fit>
            </td>
          </tr>
          <tr {...tr(14)}>
            <td colSpan={3}>
              <Fit row={14} base={10} align="center">
                {f.footer}
              </Fit>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function printLabelHtml(labelHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Không tạo được iframe in");
  }
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title></title>
<style>@page { size: 105mm 148mm; margin: 0; }
html, body { margin: 0; padding: 0; }${LABEL_CSS}</style></head>
<body>${labelHtml}</body></html>`);
  doc.close();
  const cleanup = () =>
    setTimeout(() => iframe.parentNode?.removeChild(iframe), 100);
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.focus();
    win.print();
    cleanup();
  };
}

const FIELD_DEFS: {
  key: keyof LabelFields;
  label: string;
  multiline?: boolean;
}[] = [
  { key: "date", label: "Ngày" },
  { key: "code", label: "Mã đơn" },
  { key: "senderName", label: "Người gửi" },
  { key: "senderPhone", label: "SĐT người gửi" },
  { key: "receiverName", label: "Người nhận" },
  { key: "receiverPhone", label: "SĐT người nhận" },
  { key: "address", label: "Địa chỉ", multiline: true },
  { key: "carrier", label: "Nhà xe" },
  { key: "packages", label: "Số kiện" },
  { key: "note", label: "Ghi chú", multiline: true },
  { key: "footer", label: "Dòng cuối", multiline: true },
];

export function ShippingLabelA6Modal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  // Cùng queryKey với tab "Phiếu giao/đóng hàng" → dùng chung cache.
  const giaoHang = useQuery({
    queryKey: ["packing-slips", "invoice", invoice.id],
    queryFn: () =>
      packingSlipsApi.getPackingSlips({ invoiceId: invoice.id, limit: 100 }),
  });
  const dongHang = useQuery({
    queryKey: ["packing-hangs", "invoice", invoice.id],
    queryFn: () =>
      apiClient.get<{ data: any[] }>("/packing-hangs", {
        invoiceId: invoice.id,
        limit: 100,
      }),
  });
  const loading = useQuery({
    queryKey: ["packing-loadings", "invoice", invoice.id],
    queryFn: () =>
      apiClient.get<{ data: any[] }>("/packing-loadings", {
        invoiceId: invoice.id,
        limit: 100,
      }),
  });
  const packingReady = !giaoHang.isLoading && !dongHang.isLoading && !loading.isLoading;

  const getDefaults = () =>
    buildDefaults(
      invoice,
      latestPackages([
        (giaoHang.data as any)?.data ?? [],
        dongHang.data?.data ?? [],
        loading.data?.data ?? [],
      ])
    );

  const [fields, setFields] = useState<LabelFields | null>(null);
  useEffect(() => {
    if (packingReady && !fields) setFields(getDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packingReady]);

  const sheetRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (sheetRef.current) fitText(sheetRef.current);
  }, [fields]);

  const update = (key: keyof LabelFields, value: string) =>
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handlePrint = () => {
    if (!sheetRef.current) return;
    try {
      printLabelHtml(sheetRef.current.innerHTML);
    } catch (e: any) {
      toast.error(e?.message || "In tem thất bại");
    }
  };

  // Portal ra body: modal được mở từ trong 1 dòng bảng hóa đơn; chặn click
  // lan lên dòng (sự kiện React vẫn bubble qua portal).
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}>
      <div
        className="bg-white rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold">
            In tem A6 — {invoice.code}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!fields ? (
          <div className="p-10 text-center text-sm text-gray-500">
            Đang tải dữ liệu…
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5 flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-3">
              {FIELD_DEFS.map((d) => (
                <div key={d.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {d.label}
                  </label>
                  {d.multiline ? (
                    <textarea
                      value={fields[d.key]}
                      onChange={(e) => update(d.key, e.target.value)}
                      rows={2}
                      className="w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : (
                    <input
                      type="text"
                      value={fields[d.key]}
                      onChange={(e) => update(d.key, e.target.value)}
                      className="w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <span className="text-xs text-gray-500">Xem trước (A6)</span>
              <style>{LABEL_CSS}</style>
              <div ref={sheetRef} className="shadow-md border border-gray-200">
                <LabelSheet f={fields} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t">
          <button
            onClick={() => setFields(getDefaults())}
            disabled={!fields}
            className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục từ hóa đơn
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={handlePrint}
              disabled={!fields}
              className="px-4 py-1.5 text-sm text-white bg-brand rounded-full hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50">
              <Printer className="w-3.5 h-3.5" />
              In tem
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
