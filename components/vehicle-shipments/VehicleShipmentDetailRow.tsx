"use client";

import { useState, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  FileText,
  Pencil,
  XCircle,
  RotateCcw,
  Ban,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  useVehicleShipment,
  useCancelVehicleShipment,
  useResolveVehicleItem,
} from "@/lib/hooks/useVehicleShipments";
import {
  VEHICLE_SHIPMENT_STATUS,
  getVehicleShipmentStatusLabel,
} from "@/lib/types/vehicle-shipment";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { CreatePurchaseOrdersFromVehicleModal } from "./CreatePurchaseOrdersFromVehicleModal";

interface Props {
  vehicleShipmentId: number;
  colSpan: number;
}

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

export function VehicleShipmentDetailRow({ vehicleShipmentId, colSpan }: Props) {
  const router = useRouter();
  const { data: vs, isLoading } = useVehicleShipment(vehicleShipmentId);
  const cancelMutation = useCancelVehicleShipment();
  const resolveMutation = useResolveVehicleItem();
  const canUpdate = useCan("vehicle_shipments", "update");
  const canCreatePO = useCan("purchase_orders", "create");
  const [showCreatePO, setShowCreatePO] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky width — giống OrderSupplierDetailRow: wrapper width:0 + JS set theo
  // chiều rộng vùng cuộn để nội dung không bị kéo giãn theo colSpan.
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const update = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [vs]);

  if (isLoading || !vs) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Đang tải chi tiết...</span>
          </div>
        </td>
      </tr>
    );
  }

  const isDraftOrConfirmed =
    vs.status === VEHICLE_SHIPMENT_STATUS.DRAFT ||
    vs.status === VEHICLE_SHIPMENT_STATUS.CONFIRMED;
  const canCreatePOFromHere = isDraftOrConfirmed && canCreatePO;

  // Nhóm item theo PĐN để hiển thị section.
  const grouped = (vs.items || []).reduce(
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
      acc[key].items.push(it);
      return acc;
    },
    {} as Record<
      number,
      {
        orderSupplierId: number;
        code: string;
        supplierName: string;
        items: NonNullable<typeof vs.items>;
      }
    >
  );
  const sections = Object.values(grouped);

  // Khu "xử lý sau nhập": chỉ khi xe Đã nhập (status 2) và có item chênh lệch.
  const isReceived = vs.status === VEHICLE_SHIPMENT_STATUS.RECEIVED;
  const diffItems = isReceived
    ? (vs.items || []).filter((it) => Number(it.diff ?? 0) !== 0)
    : [];

  const handleResolve = (
    orderSupplierId: number,
    productId: number,
    action: string
  ) => {
    resolveMutation.mutate({
      id: vehicleShipmentId,
      orderSupplierId,
      productId,
      action,
    });
  };

  const handleCancel = async () => {
    const res = await Swal.fire({
      title: "Hủy phiếu ghép xe?",
      text: `Phiếu ${vs.code} sẽ chuyển sang trạng thái Đã hủy.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) {
      cancelMutation.mutate(vehicleShipmentId);
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4 space-y-4">
            {/* Header info */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{vs.code}</span>
                <span className="text-xs text-gray-500">
                  · {getVehicleShipmentStatusLabel(vs.status)}
                </span>
              </div>
              <div className="text-gray-500 text-xs">
                Chi nhánh nhận: {vs.branch?.name || "-"} · Biển số/Tài xế:{" "}
                {vs.vehicleInfo || "-"}
              </div>
              <div className="text-gray-500 text-xs">
                Người tạo: {vs.creator?.name || "-"} · Ngày tạo:{" "}
                {formatDateTime(vs.createdAt)}
              </div>
              {vs.description && (
                <div className="text-gray-500 text-xs">
                  Ghi chú: {vs.description}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDraftOrConfirmed && canUpdate && (
                <button
                  onClick={() =>
                    router.push(`/san-pham/ghep-xe/${vehicleShipmentId}`)
                  }
                  className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4" />
                  Sửa
                </button>
              )}
              {isDraftOrConfirmed && canUpdate && (
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1.5 disabled:opacity-50">
                  <XCircle className="w-4 h-4" />
                  Hủy phiếu
                </button>
              )}
              {canCreatePOFromHere && (
                <button
                  onClick={() => setShowCreatePO(true)}
                  className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Tạo phiếu nhập
                </button>
              )}
            </div>
          </div>

          {/* PN đã sinh */}
          {vs.purchaseOrders && vs.purchaseOrders.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">Phiếu nhập đã tạo: </span>
              {vs.purchaseOrders.map((po, idx) => (
                <span key={po.code ?? idx}>
                  {idx > 0 && <span className="text-gray-400"> | </span>}
                  <CodeLink entity="purchase-order" code={po.code} />
                </span>
              ))}
            </div>
          )}

          {/* Sections theo PĐN */}
          <div className="space-y-3">
            {isReceived && diffItems.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Có {diffItems.length} sản phẩm nhập lệch so với ghép xe. Với sản
                phẩm thiếu, chọn "Chuyển về còn lại" để trả phần thiếu về đơn đặt
                hàng, hoặc "Giữ" để bỏ qua. Có thể đổi lại quyết định bất cứ lúc
                nào.
              </div>
            )}
            {sections.map((sec) => (
              <div key={sec.orderSupplierId} className="border rounded-lg">
                <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2 text-sm">
                  <CodeLink entity="order-supplier" code={sec.code} />
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{sec.supplierName}</span>
                </div>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: "140px" }} />
                    <col />
                    <col style={{ width: "120px" }} />
                    {isReceived && (
                      <>
                        <col style={{ width: "120px" }} />
                        <col style={{ width: "120px" }} />
                        <col style={{ width: "320px" }} />
                      </>
                    )}
                  </colgroup>
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2 text-left font-medium">
                        Mã hàng
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Tên sản phẩm
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        SL ghép xe
                      </th>
                      {isReceived && (
                        <>
                          <th className="px-3 py-2 text-right font-medium">
                            Thực nhận
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Chênh lệch
                          </th>
                          <th className="px-3 py-2 text-center font-medium">
                            Xử lý
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items?.map((it) => {
                      const diff = Number(it.diff ?? 0);
                      const isShort = diff > 0;
                      const isOver = diff < 0;
                      const status = it.postImportStatus || "pending";
                      return (
                        <tr key={it.id} className="border-t">
                          <td className="px-3 py-2">{it.productCode}</td>
                          <td className="px-3 py-2 break-words">
                            {it.productName}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {Number(it.quantity).toLocaleString("vi-VN")}
                          </td>
                          {isReceived && (
                            <>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {Number(it.received ?? 0).toLocaleString(
                                  "vi-VN"
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {isShort ? (
                                  <span className="text-red-600">
                                    Thiếu {diff.toLocaleString("vi-VN")}
                                  </span>
                                ) : isOver ? (
                                  <span className="text-blue-600">
                                    Dư{" "}
                                    {Math.abs(diff).toLocaleString("vi-VN")}
                                  </span>
                                ) : (
                                  <span className="text-green-600">Đủ</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {isShort ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      disabled={
                                        !canUpdate || resolveMutation.isPending
                                      }
                                      onClick={() =>
                                        handleResolve(
                                          it.orderSupplierId,
                                          it.productId,
                                          status === "returned"
                                            ? "pending"
                                            : "returned"
                                        )
                                      }
                                      className={`px-2 py-1 text-xs rounded-lg border flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                        status === "returned"
                                          ? "bg-green-600 text-white border-green-600"
                                          : "text-green-700 border-green-300 hover:bg-green-50"
                                      }`}>
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      Chuyển về còn lại
                                    </button>
                                    <button
                                      disabled={
                                        !canUpdate || resolveMutation.isPending
                                      }
                                      onClick={() =>
                                        handleResolve(
                                          it.orderSupplierId,
                                          it.productId,
                                          status === "kept" ? "pending" : "kept"
                                        )
                                      }
                                      className={`px-2 py-1 text-xs rounded-lg border flex items-center gap-1 transition-colors disabled:opacity-50 ${
                                        status === "kept"
                                          ? "bg-gray-600 text-white border-gray-600"
                                          : "text-gray-600 border-gray-300 hover:bg-gray-50"
                                      }`}>
                                      <Ban className="w-3.5 h-3.5" />
                                      Giữ (bỏ phần thiếu)
                                    </button>
                                  </div>
                                ) : isOver ? (
                                  <div className="text-center text-xs text-blue-600">
                                    Đã tự cộng vào đã nhập
                                  </div>
                                ) : (
                                  <div className="text-center text-xs text-gray-300">
                                    —
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          </div>
          </div>
        </div>

        {showCreatePO && (
          <CreatePurchaseOrdersFromVehicleModal
            shipment={vs}
            onClose={() => setShowCreatePO(false)}
          />
        )}
      </td>
    </tr>
  );
}
