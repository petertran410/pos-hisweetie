"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  useCancelSentProduction,
  useProduction,
  useSendProduction,
} from "@/lib/hooks/useProductions";
import { usePermission } from "@/lib/hooks/usePermissions";
import { ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";
import { ProductionReceiveModal } from "./ProductionReceiveModal";

const vnd = (v: unknown) =>
  `${Math.round(Number(v ?? 0)).toLocaleString("vi-VN")} đ`;

interface ProductionDetailRowProps {
  productionId: number;
  colSpan: number;
  onEdit?: () => void;
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-yellow-100 text-yellow-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    case 4:
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Hoàn thành";
    case 3:
      return "Đã hủy";
    case 4:
      return "Đã gửi";
    default:
      return "Không xác định";
  }
};

export function ProductionDetailRow({
  productionId,
  colSpan,
  onEdit,
}: ProductionDetailRowProps) {
  const { data: production, isLoading } = useProduction(productionId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [receiveMode, setReceiveMode] = useState<
    "receive" | "applyCost" | null
  >(null);
  const canUpdate = usePermission("productions", "update");
  // "Admin có thể hủy": phiếu gửi đã gửi/hoàn thành dùng quyền Xóa phiếu SX.
  const canCancelSent = usePermission("productions", "delete");
  const canCreatePurchaseOrder = usePermission("purchase_orders", "create");
  const { mutate: sendProduction, isPending: isSending } = useSendProduction();
  const { mutate: cancelSent, isPending: isCancelling } =
    useCancelSentProduction();

  // Sticky width theo scroll container (giống InvoiceDetailRow)
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
    const setWidth = () => {
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    setWidth();
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setWidth);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [production]);

  // Gửi từ chi tiết phiếu: dùng đúng nguyên liệu đã lưu ở phiếu tạm.
  const handleSend = async () => {
    if (!production) return;
    const res = await Swal.fire({
      title: `Gửi hàng phiếu ${production.code}?`,
      text: `Nguyên liệu sẽ bị trừ khỏi kho ${production.sourceBranchName} và phiếu không sửa được nữa.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Gửi hàng",
      cancelButtonText: "Đóng",
    });
    if (res.isConfirmed) sendProduction({ id: production.id, data: {} });
  };

  const handleCancelSent = async () => {
    if (!production) return;
    const res = await Swal.fire({
      title: `Hủy phiếu ${production.code}?`,
      html:
        production.status === 2
          ? "Nguyên liệu được cộng lại vào kho, thành phẩm đã nhập bị trừ ra và phí sản xuất bị bỏ khỏi nợ NCC." +
            (production.costAppliedAt
              ? "<br/><b>Giá vốn thành phẩm đã áp sẽ không tự hoàn lại.</b>"
              : "")
          : "Nguyên liệu đã gửi được cộng lại vào kho.",
      input: "text",
      inputPlaceholder: "Lý do hủy (không bắt buộc)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) {
      cancelSent({ id: production.id, reason: res.value || undefined });
    }
  };

  // Phiếu nhập nhận hàng còn hiệu lực (tạm hoặc đã nhập) — tối đa 1.
  const activePurchaseOrder = production?.purchaseOrders?.[0];

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu sản xuất...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!production) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu sản xuất
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className="text-md font-bold">
                      <CodeLink
                        entity="production"
                        code={production.code}
                        className="text-md font-bold text-brand hover:underline"
                      />
                    </p>
                    <span className="text-gray-300">-</span>
                    <span className="text-md text-gray-700">
                      {production.productName}
                    </span>
                    <span className="text-gray-300">-</span>
                    <Link
                      href={`/san-pham/danh-sach?Code=${production.productCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-md text-brand hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}>
                      {production.productCode}
                    </Link>
                    <Link
                      href={`/san-pham/danh-sach?Code=${production.productCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-brand transition-colors"
                      onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(production.status)}`}>
                      {getStatusText(production.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-x-8 border-gray-200 pb-2 mb-2">
                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.createdByName || "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Thời gian sản xuất:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {formatDate(production.manufacturedDate)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu vào:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.sourceBranchName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Kho đầu ra:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.destinationBranchName}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Mã hàng:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.productCode ? (
                        <CodeLink
                          entity="product"
                          code={production.productCode}
                        />
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Số lượng sản xuất:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {production.quantity}
                    </span>
                  </div>

                  {production.formulaName && (
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Công thức:
                      </label>
                      <span className="block text-sm text-gray-800">
                        {production.formulaName}
                      </span>
                    </div>
                  )}

                  {production.isExternal && (
                    <>
                      <InfoItem label="Nhà máy:">
                        {production.factory?.name || "-"}
                      </InfoItem>
                      <InfoItem label="Nhà cung cấp:">
                        {production.supplier?.name || "-"}
                      </InfoItem>
                      <InfoItem label="Phí sản xuất lô:">
                        {vnd(production.processingFee)}
                        {production.feeCurrency === "CNY" &&
                          ` (${Number(production.feeForeignAmount ?? 0).toLocaleString("vi-VN")} CNY × ${Number(production.feeExchangeRate ?? 0).toLocaleString("vi-VN")})`}
                      </InfoItem>
                      <InfoItem
                        label={
                          production.status === 4
                            ? "NCC đang giữ hàng (giá vốn NVL):"
                            : "Giá vốn nguyên liệu đã gửi:"
                        }>
                        {production.status === 1
                          ? "-"
                          : vnd(production.materialValue)}
                      </InfoItem>
                      <InfoItem label="Ngày gửi:">
                        {production.sentDate
                          ? formatDate(production.sentDate)
                          : "-"}
                      </InfoItem>
                      <InfoItem label="Ngày nhận hàng:">
                        {production.completedDate
                          ? formatDate(production.completedDate)
                          : "-"}
                      </InfoItem>
                      {activePurchaseOrder && (
                        <InfoItem label="Phiếu nhập hàng:">
                          <CodeLink
                            entity="purchase-order"
                            code={activePurchaseOrder.code}
                            className="font-medium text-brand hover:underline"
                          />
                          {activePurchaseOrder.isDraft && (
                            <span className="ml-1 text-amber-600">
                              (Phiếu tạm)
                            </span>
                          )}
                        </InfoItem>
                      )}
                      {production.status === 2 && (
                        <>
                          <InfoItem label="Số lượng nhận:">
                            {Number(
                              production.receivedQuantity ??
                                production.quantity,
                            ).toLocaleString("vi-VN")}
                          </InfoItem>
                          <InfoItem label="Giá thành / sp:">
                            {vnd(
                              Number(production.totalCost) /
                                Number(
                                  production.receivedQuantity ||
                                    production.quantity ||
                                    1,
                                ),
                            )}
                          </InfoItem>
                          <InfoItem label="Giá vốn đã áp:">
                            {production.costAppliedAt ? (
                              vnd(production.appliedUnitCost)
                            ) : (
                              <span className="text-amber-600">
                                Chưa áp giá vốn
                              </span>
                            )}
                          </InfoItem>
                        </>
                      )}
                    </>
                  )}

                  <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ngày tạo:
                    </label>
                    <span className="block text-sm text-gray-800">
                      {formatDate(production.createdAt)}
                    </span>
                  </div>
                </div>

                {production.isExternal &&
                  production.status !== 1 &&
                  (production.components?.length ?? 0) > 0 && (
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Nguyên liệu đã gửi:
                      </label>
                      <table className="w-full text-sm border">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left">Mã</th>
                            <th className="px-3 py-2 text-left">Nguyên liệu</th>
                            <th className="px-3 py-2 text-right">
                              Số lượng trừ kho
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {production.components!.map((c) => (
                            <tr key={c.id} className="border-t">
                              <td className="px-3 py-2">{c.componentCode}</td>
                              <td className="px-3 py-2">{c.componentName}</td>
                              <td className="px-3 py-2 text-right">
                                {Number(c.unitsDeducted).toLocaleString(
                                  "vi-VN",
                                  { maximumFractionDigits: 3 },
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {production.note && (
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ghi chú:
                    </label>
                    <p className="px-3 py-2 text-md border rounded bg-gray-50 text-gray-700">
                      {production.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                {production.isExternal &&
                  canCancelSent &&
                  (production.status === 4 || production.status === 2) &&
                  (activePurchaseOrder ? (
                    // Đã có phiếu nhập: hủy phiếu nhập trước (trả tồn thành
                    // phẩm, bỏ phí khỏi nợ) thì phiếu mới về Đã gửi.
                    <span className="mr-auto text-sm text-gray-500">
                      Muốn hủy phiếu: hủy phiếu nhập {activePurchaseOrder.code}{" "}
                      trước.
                    </span>
                  ) : (
                    <button
                      onClick={handleCancelSent}
                      disabled={isCancelling}
                      className="px-4 py-2 text-md font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors mr-auto disabled:opacity-50">
                      Hủy phiếu
                    </button>
                  ))}
                {onEdit &&
                  production.status !== 3 &&
                  (!production.isExternal || production.status === 1) && (
                    <button
                      onClick={onEdit}
                      className={
                        production.isExternal
                          ? "px-4 py-2 text-md font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          : "px-4 py-2 text-md font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors"
                      }>
                      Chỉnh sửa
                    </button>
                  )}
                {production.isExternal &&
                  canUpdate &&
                  production.status === 1 && (
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="px-4 py-2 text-md font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors disabled:opacity-50">
                      Gửi hàng
                    </button>
                  )}
                {production.isExternal &&
                  canCreatePurchaseOrder &&
                  production.status === 4 &&
                  !activePurchaseOrder && (
                    <Link
                      href={`/san-pham/nhap-hang/new?productionId=${production.id}`}
                      className="px-4 py-2 text-md font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Mở form nhập hàng
                    </Link>
                  )}
                {production.isExternal &&
                  canUpdate &&
                  production.status === 4 &&
                  !activePurchaseOrder && (
                    <button
                      onClick={() => setReceiveMode("receive")}
                      className="px-4 py-2 text-md font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors">
                      Nhận hàng
                    </button>
                  )}
                {production.isExternal &&
                  canUpdate &&
                  production.status === 2 &&
                  !production.costAppliedAt && (
                    <button
                      onClick={() => setReceiveMode("applyCost")}
                      className="px-4 py-2 text-md font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors">
                      Áp giá vốn
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
        {receiveMode && (
          <ProductionReceiveModal
            production={production}
            mode={receiveMode}
            onClose={() => setReceiveMode(null)}
          />
        )}
      </td>
    </tr>
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
      <label className="block text-md font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <span className="block text-sm text-gray-800">{children}</span>
    </div>
  );
}
