"use client";

import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useTaxCodeLookup } from "@/lib/hooks/useVietQr";

export interface InvoiceBuyerInfoValue {
  taxCode: string;
  buyerName: string;
  buyerAddress: string;
}

interface InvoiceBuyerTaxInfoProps {
  value: InvoiceBuyerInfoValue;
  onChange: (next: InvoiceBuyerInfoValue) => void;
}

/**
 * Thông tin xuất hóa đơn (controlled component).
 * Gồm: Mã số thuế + nút Tra cứu (VietQR), Tên người mua, Địa chỉ người mua.
 *
 * Lưu ý: chỉ khi CẢ 3 ô đều có dữ liệu thì khi đẩy Misa mới dùng 3 giá trị này
 * thay cho thông tin lấy từ database (xử lý ở backend).
 */
export function InvoiceBuyerTaxInfo({
  value,
  onChange,
}: InvoiceBuyerTaxInfoProps) {
  const taxLookup = useTaxCodeLookup();

  const setField = (field: keyof InvoiceBuyerInfoValue, v: string) =>
    onChange({ ...value, [field]: v });

  const handleTaxLookup = async () => {
    const code = (value.taxCode || "").trim();
    if (!code) {
      toast.error("Vui lòng nhập mã số thuế");
      return;
    }
    try {
      const data = await taxLookup.mutateAsync(code);
      onChange({
        ...value,
        buyerName: data.name || value.buyerName,
        buyerAddress: data.address || value.buyerAddress,
      });
      toast.success(
        data.status
          ? `Đã điền thông tin từ mã số thuế (${data.status})`
          : "Đã điền thông tin từ mã số thuế"
      );
    } catch (err: any) {
      toast.error(err?.message || "Không thể tra cứu mã số thuế");
    }
  };

  const filledCount = [value.taxCode, value.buyerName, value.buyerAddress]
    .map((v) => (v || "").trim())
    .filter(Boolean).length;
  const willOverride = filledCount === 3;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-semibold text-gray-700">
          Thông tin xuất hóa đơn
        </h4>
        {filledCount > 0 &&
          (willOverride ? (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              Sẽ dùng thông tin này khi đẩy Misa
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              Nhập đủ cả 3 ô để thay thông tin khách hàng
            </span>
          ))}
      </div>
      <div className="border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Mã số thuế
          </label>
          <div className="flex gap-2">
            <input
              value={value.taxCode}
              onChange={(e) => setField("taxCode", e.target.value)}
              placeholder="Nhập mã số thuế"
              className="flex-1 border rounded px-3 py-1.5 sm:py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleTaxLookup}
              disabled={taxLookup.isPending}
              title="Tra cứu thông tin từ mã số thuế"
              className="px-3 py-1.5 sm:py-2 border rounded text-sm font-medium text-brand border-brand-border hover:bg-brand-soft disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
              {taxLookup.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Tra cứu
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Tên người mua
          </label>
          <input
            value={value.buyerName}
            onChange={(e) => setField("buyerName", e.target.value)}
            placeholder="Nhập tên người mua"
            className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5 text-gray-700">
            Địa chỉ người mua
          </label>
          <input
            value={value.buyerAddress}
            onChange={(e) => setField("buyerAddress", e.target.value)}
            placeholder="Nhập địa chỉ người mua"
            className="w-full border rounded px-3 py-1.5 sm:py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
