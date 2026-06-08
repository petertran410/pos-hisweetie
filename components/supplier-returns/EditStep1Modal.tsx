"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import {
  useSupplierReturn,
  useUpdateSupplierReturnStep1,
} from "@/lib/hooks/useSupplierReturns";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";

interface Props {
  supplierReturnId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function EditStep1Modal({
  supplierReturnId,
  onClose,
  onSubmit,
  onCancel,
}: Props) {
  const { data: supplierReturn, isLoading } =
    useSupplierReturn(supplierReturnId);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [displays, setDisplays] = useState<Record<string, string>>({});
  const updateStep1 = useUpdateSupplierReturnStep1();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!supplierReturn?.details) return;
    setReturnItems(
      supplierReturn.details.map((d) => ({
        detailId: d.id,
        productId: d.productId,
        productCode: d.productCode,
        productName: d.productName,
        purchaseQuantity: Number(d.purchaseQuantity),
        purchasePrice: Number(d.purchasePrice),
        purchaseOrderId: d.purchaseOrderId,
        purchaseOrderCode: d.purchaseOrderCode,
        requestQuantity: Number(d.requestQuantity),
        returnPrice: Number(d.returnPrice),
      }))
    );
    setNote(supplierReturn.note || "");
  }, [supplierReturn]);

  const getDisplay = (idx: number, field: string, value: number) => {
    const key = `${idx}_${field}`;
    return displays[key] !== undefined
      ? displays[key]
      : value === 0
        ? ""
        : String(value);
  };

  const handleFieldChange = (
    idx: number,
    field: "requestQuantity" | "returnPrice",
    raw: string
  ) => {
    const key = `${idx}_${field}`;
    const onlyNums = raw.replace(/[^\d]/g, "");
    setDisplays((prev) => ({ ...prev, [key]: onlyNums }));
    const parsed = onlyNums === "" ? 0 : parseInt(onlyNums, 10);
    setReturnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: parsed } : item))
    );
  };

  const handleFieldBlur = (idx: number, field: string) => {
    const key = `${idx}_${field}`;
    setDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const totalReturnAmount = useMemo(
    () =>
      returnItems.reduce(
        (sum, i) => sum + i.requestQuantity * i.returnPrice,
        0
      ),
    [returnItems]
  );

  const handleSubmit = async (isDraft: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateStep1.mutateAsync({
        id: supplierReturnId,
        data: {
          isDraft,
          note,
          details: returnItems
            .filter((i) => i.requestQuantity > 0)
            .map((i) => ({
              productId: i.productId,
              productCode: i.productCode,
              productName: i.productName,
              purchaseQuantity: i.purchaseQuantity,
              purchasePrice: i.purchasePrice,
              purchaseOrderId: i.purchaseOrderId,
              purchaseOrderCode: i.purchaseOrderCode,
              requestQuantity: i.requestQuantity,
              returnPrice: i.returnPrice,
            })),
        },
      });
      if (!isDraft) onClose();
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col min-h-[80vh] max-h-[150vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              Chỉnh sửa phiếu trả hàng nhập
            </h2>
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
                  SL nhập
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  SL trả
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  Giá trả
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {returnItems.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-gray-400">
                      {item.productCode}
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-500">
                    {item.purchaseQuantity || "-"}
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getDisplay(
                        idx,
                        "requestQuantity",
                        item.requestQuantity
                      )}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "requestQuantity",
                          e.target.value
                        )
                      }
                      onBlur={() => handleFieldBlur(idx, "requestQuantity")}
                      className="w-20 border rounded px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="py-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getDisplay(idx, "returnPrice", item.returnPrice)}
                      onChange={(e) =>
                        handleFieldChange(idx, "returnPrice", e.target.value)
                      }
                      onBlur={() => handleFieldBlur(idx, "returnPrice")}
                      className="w-28 border rounded px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="py-3 text-right font-medium">
                    {new Intl.NumberFormat("en-US").format(
                      item.requestQuantity * item.returnPrice
                    )}
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
            <span>Tổng tiền trả</span>
            <span className="text-brand">
              {formatCurrency(totalReturnAmount)}
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
              <PermissionGate resource="supplier_returns" action="update">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                  Lưu tạm
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark disabled:opacity-40">
                  Xác nhận yêu cầu trả
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
