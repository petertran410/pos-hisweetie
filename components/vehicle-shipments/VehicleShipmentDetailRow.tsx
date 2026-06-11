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

const STATUS_COLOR: Record<number, string> = {
  [VEHICLE_SHIPMENT_STATUS.DRAFT]: "bg-gray-100 text-gray-700",
  [VEHICLE_SHIPMENT_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700",
  [VEHICLE_SHIPMENT_STATUS.RECEIVED]: "bg-green-100 text-green-700",
  [VEHICLE_SHIPMENT_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

export function VehicleShipmentDetailRow({ vehicleShipmentId, colSpan }: Props) {
  const router = useRouter();
  const { data: vs, isLoading } = useVehicleShipment(vehicleShipmentId);
  const cancelMutation = useCancelVehicleShipment();
  const resolveMutation = useResolveVehicleItem();
  const canUpdate = useCan("vehicle_shipments", "update");
  const canCreatePO = useCan("purchase_orders", "create");
  const [showCreatePO, setShowCreatePO] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky width: đo chiều rộng vùng cuộn rồi set cho wrapper. KHÔNG dùng
  // ResizeObserver trên scrollEl vì việc ghi width làm reflow (bật/tắt
  // scrollbar dọc) → clientWidth dao động → observer chạy lại → lắc liên tục.
  // Lắng nghe window.resize (zoom cũng bắn) là đủ và không tạo vòng lặp.
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
    let rafId = 0;
    const setWidth = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = `${scrollEl!.clientWidth}px`;
        if (el.style.width !== next) el.style.width = next;
      });
    };
    setWidth();
    window.addEventListener("resize", setWidth);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setWidth);
    };
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
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50"
        style={{ width: 0 }}>
        <div ref={wrapperRef} className="sticky left-0 bg-gray-50">
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* ── Header ── */}
              <div className="border-b border-gray-200 pb-3 mb-4">
                <div className="flex border-b pb-2 items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      <CodeLink
                        entity="vehicle-shipment"
                        code={vs.code}
                        className="text-lg font-bold text-brand hover:underline"
                      />
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[vs.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {getVehicleShipmentStatusLabel(vs.status)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {vs.branch?.name || "-"}
                  </span>
                </div>

                {/* Info grid — 3 cols */}
                <div className="grid grid-cols-3 gap-x-8 pb-2">
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">Số hợp đồng:</label>
                    <span className="text-sm text-gray-900">
                      {vs.vehicleInfo || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">Cửa khẩu:</label>
                    <span className="text-sm text-gray-900">
                      {vs.borderGate?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">Người tạo:</label>
                    <span className="text-sm text-gray-900">
                      {vs.creator?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">Ngày tạo:</label>
                    <span className="text-sm text-gray-900">
                      {formatDateTime(vs.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">
                      Ngày dự kiến về kho:
                    </label>
                    <span className="text-sm text-gray-900">
                      {vs.expectedArrivalDate
                        ? new Date(vs.expectedArrivalDate).toLocaleDateString(
                            "vi-VN"
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">
                      Ngày về kho thực tế:
                    </label>
                    <span className="text-sm text-gray-900">
                      {vs.actualArrivalDate
                        ? new Date(vs.actualArrivalDate).toLocaleDateString(
                            "vi-VN"
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1">
                    <label className="text-sm text-gray-500">
                      Tổng cân nặng:
                    </label>
                    <span className="text-sm text-gray-900 font-medium">
                      {((vs.totalWeightKg ?? 0) * 1000).toLocaleString("vi-VN", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      gram ·{" "}
                      {(vs.totalWeightKg ?? 0).toLocaleString("vi-VN", {
                        maximumFractionDigits: 3,
                      })}{" "}
                      kg
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-2 border-b pb-1 col-span-2">
                    <label className="text-sm text-gray-500">
                      File đính kèm:
                    </label>
                    {vs.files && vs.files.length > 0 ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        {vs.files.map((f) => (
                          <a
                            key={f.url}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand hover:underline">
                            {f.originalname || f.filename}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">-</span>
                    )}
                  </div>
                  {vs.description && (
                    <div className="flex flex-col gap-1 mb-2 border-b pb-1 col-span-3">
                      <label className="text-sm text-gray-500">Ghi chú:</label>
                      <span className="text-sm text-gray-900">
                        {vs.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* PN đã sinh */}
                {vs.purchaseOrders && vs.purchaseOrders.length > 0 && (
                  <div className="text-sm mt-1">
                    <span className="text-gray-500">Phiếu nhập đã tạo: </span>
                    {vs.purchaseOrders.map((po, idx) => (
                      <span key={po.code ?? idx}>
                        {idx > 0 && <span className="text-gray-400"> | </span>}
                        <CodeLink entity="purchase-order" code={po.code} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
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
                    <col style={{ width: "130px" }} />
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
                      <th className="px-3 py-2 text-right font-medium">
                        Trọng lượng (gram)
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
                          <td className="px-3 py-2 text-right text-gray-600">
                            {(
                              (it.weightUnit || "kg").toLowerCase() === "g"
                                ? Number(it.unitWeight ?? 0)
                                : Number(it.unitWeight ?? 0) * 1000
                            ).toLocaleString("vi-VN", {
                              maximumFractionDigits: 2,
                            })}
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

          {/* Action buttons — đặt dưới cùng, căn phải */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
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
            {canCreatePOFromHere && (
              <button
                onClick={() => setShowCreatePO(true)}
                className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Tạo phiếu nhập
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
          </div>
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
