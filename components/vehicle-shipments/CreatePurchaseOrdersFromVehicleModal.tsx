"use client";

import { useMemo, useState } from "react";
import { X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCreatePurchaseOrdersFromVehicle } from "@/lib/hooks/useVehicleShipments";
import type {
  VehicleShipment,
  CreatePOFromVehicleSection,
} from "@/lib/types/vehicle-shipment";

interface Props {
  shipment: VehicleShipment;
  onClose: () => void;
}

interface EditableItem {
  productId: number;
  productCode: string;
  productName: string;
  shippedQuantity: number;
  receivedQuantity: number;
}

interface SectionState {
  orderSupplierId: number;
  code: string;
  supplierName: string;
  items: EditableItem[];
}

export function CreatePurchaseOrdersFromVehicleModal({
  shipment,
  onClose,
}: Props) {
  const createMutation = useCreatePurchaseOrdersFromVehicle();

  const [sections, setSections] = useState<SectionState[]>(() => {
    const grouped = (shipment.items || []).reduce(
      (acc, it) => {
        const key = it.orderSupplierId;
        if (!acc[key]) {
          acc[key] = {
            orderSupplierId: it.orderSupplierId,
            code: it.orderSupplier?.code || `PĐN #${it.orderSupplierId}`,
            supplierName: it.orderSupplier?.supplier?.name || "-",
            items: [],
          };
        }
        acc[key].items.push({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          shippedQuantity: Number(it.quantity),
          receivedQuantity: Number(it.quantity),
        });
        return acc;
      },
      {} as Record<number, SectionState>
    );
    return Object.values(grouped);
  });

  const updateQty = (
    osId: number,
    productId: number,
    value: number
  ) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.orderSupplierId !== osId
          ? sec
          : {
              ...sec,
              items: sec.items.map((it) =>
                it.productId === productId
                  ? { ...it, receivedQuantity: value }
                  : it
              ),
            }
      )
    );
  };

  const totalReceived = useMemo(
    () =>
      sections.reduce(
        (sum, sec) =>
          sum +
          sec.items.reduce((s, it) => s + (Number(it.receivedQuantity) || 0), 0),
        0
      ),
    [sections]
  );

  const handleSubmit = () => {
    const payload: CreatePOFromVehicleSection[] = sections
      .map((sec) => ({
        orderSupplierId: sec.orderSupplierId,
        items: sec.items
          .filter((it) => Number(it.receivedQuantity) > 0)
          .map((it) => ({
            productId: it.productId,
            receivedQuantity: Number(it.receivedQuantity),
          })),
      }))
      .filter((sec) => sec.items.length > 0);

    if (payload.length === 0) {
      toast.error("Cần ít nhất 1 dòng có số lượng thực nhận > 0");
      return;
    }

    createMutation.mutate(
      { id: shipment.id, sections: payload },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Tạo phiếu nhập từ ghép xe {shipment.code}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Mỗi phiếu đặt hàng nhập (PĐN) tạo thành 1 phiếu nhập riêng. Điều
              chỉnh số lượng thực nhận nếu có thất thoát khi vận chuyển.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sections.map((sec, idx) => (
            <div key={sec.orderSupplierId} className="border rounded-xl">
              <div className="px-4 py-2.5 bg-gray-50 border-b rounded-t-xl flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-semibold">
                  {idx + 1}
                </span>
                <span className="font-medium text-gray-900 text-sm">
                  {sec.code}
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-sm text-gray-600">{sec.supplierName}</span>
                <span className="ml-auto text-xs text-gray-500">
                  → 1 phiếu nhập
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="px-4 py-2 text-left font-medium">Mã hàng</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Tên sản phẩm
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      SL ghép xe
                    </th>
                    <th className="px-4 py-2 text-right font-medium w-36">
                      SL thực nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map((it) => (
                    <tr key={it.productId} className="border-t">
                      <td className="px-4 py-2">{it.productCode}</td>
                      <td className="px-4 py-2">{it.productName}</td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {it.shippedQuantity.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={it.receivedQuantity}
                          onChange={(e) =>
                            updateQty(
                              sec.orderSupplierId,
                              it.productId,
                              Number(e.target.value)
                            )
                          }
                          className="w-28 border rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t">
          <span className="text-sm text-gray-500">
            Tổng thực nhận:{" "}
            <span className="font-semibold text-gray-900">
              {totalReceived.toLocaleString("vi-VN")}
            </span>{" "}
            · {sections.length} phiếu nhập
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50">
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Tạo phiếu nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
