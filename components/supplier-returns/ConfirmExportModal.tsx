"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSupplierReturn } from "@/lib/hooks/useSupplierReturns";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";

interface Props {
  supplierReturnId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

interface ExportItem {
  detailId: number;
  productCode: string;
  productName: string;
  requestQuantity: number;
  confirmedQuantity: number;
  returnPrice: number;
}

export function ConfirmExportModal({
  supplierReturnId,
  onClose,
  onSubmit,
  onCancel,
}: Props) {
  const { data: supplierReturn, isLoading } =
    useSupplierReturn(supplierReturnId);
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const [note, setNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [displays, setDisplays] = useState<Record<string, string>>({});

  const getDisplay = (idx: number, value: number): string => {
    const key = String(idx);
    return displays[key] !== undefined
      ? displays[key]
      : value === 0
        ? ""
        : String(value);
  };

  const handleFieldChange = (idx: number, raw: string) => {
    const key = String(idx);
    const onlyNums = raw.replace(/[^\d]/g, "");
    setDisplays((prev) => ({ ...prev, [key]: onlyNums }));
    const parsed = onlyNums === "" ? 0 : parseInt(onlyNums, 10);
    setExportItems((prev) =>
      prev.map((item, j) =>
        j === idx
          ? {
              ...item,
              confirmedQuantity: Math.min(
                item.requestQuantity,
                Math.max(0, parsed)
              ),
            }
          : item
      )
    );
  };

  const handleFieldBlur = (idx: number) => {
    const key = String(idx);
    setDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!supplierReturn?.details) return;
    setExportItems(
      supplierReturn.details.map((d) => ({
        detailId: d.id,
        productCode: d.productCode,
        productName: d.productName,
        requestQuantity: Number(d.requestQuantity),
        confirmedQuantity: Number(d.requestQuantity),
        returnPrice: Number(d.returnPrice),
      }))
    );
    setNote(supplierReturn.note || "");
  }, [supplierReturn]);

  const totalConfirmed = exportItems.reduce(
    (sum, item) => sum + item.confirmedQuantity * item.returnPrice,
    0
  );

  const handleSubmit = (isDraft = false) => {
    const validItems = exportItems.filter((i) => i.confirmedQuantity > 0);
    onSubmit({
      isDraft,
      note,
      details: validItems.map((i) => ({
        detailId: i.detailId,
        confirmedQuantity: i.confirmedQuantity,
      })),
    });
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col min-h-[80vh] max-h-[150vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Xác nhận xuất kho</h2>
            <p className="text-sm text-gray-500">{supplierReturn?.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="px-5 py-3 bg-gray-50 border-b text-sm grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-500">Nhà cung cấp: </span>
            <span className="font-medium">
              {supplierReturn?.supplier?.name}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Loại: </span>
            <span className="font-medium">
              {supplierReturn?.mode === "by_purchase_order"
                ? `Theo phiếu nhập ${supplierReturn?.purchaseOrder?.code}`
                : "Sản phẩm lẻ"}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-gray-600">
                  Sản phẩm
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  SL yêu cầu
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  SL xuất kho
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  Đơn giá
                </th>
              </tr>
            </thead>
            <tbody>
              {exportItems.map((item, idx) => (
                <tr key={item.detailId} className="border-b">
                  <td className="py-3">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-gray-400">
                      {item.productCode}
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {item.requestQuantity}
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getDisplay(idx, item.confirmedQuantity)}
                      onChange={(e) => handleFieldChange(idx, e.target.value)}
                      onBlur={() => handleFieldBlur(idx)}
                      className="w-20 border rounded px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="py-3 text-right">
                    {new Intl.NumberFormat("en-US").format(item.returnPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-5 border-t space-y-3">
          {/* Inline cancel confirm */}
          {showCancelConfirm && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <span className="text-red-700 font-medium">
                Xác nhận hủy phiếu này?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50">
                  Không
                </button>
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  Hủy phiếu
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Tổng tiền xuất kho</span>
            <span className="text-brand">
              {formatCurrency(totalConfirmed)}
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú..."
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex justify-between">
            <PermissionGate resource="supplier_returns" action="cancel">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                Hủy phiếu
              </button>
            </PermissionGate>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Đóng
              </button>
              <PermissionGate
                resource="supplier_returns"
                action="confirm_export">
                <button
                  onClick={() => handleSubmit(true)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  Lưu tạm
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark">
                  Xác nhận xuất kho
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
