"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  useCancelProductionReceipt,
  useCancelSentProduction,
  useCloseProductionReceiving,
  useProduction,
  useReopenProductionReceiving,
  useSendProduction,
} from "@/lib/hooks/useProductions";
import type { Production, ProductionReceipt } from "@/lib/api/productions";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  Ban,
  CircleDollarSign,
  ExternalLink,
  FilePlus2,
  Flag,
  Loader2,
  PackageCheck,
  Pencil,
  RotateCcw,
  Send,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";
import { ProductionReceiveModal } from "./ProductionReceiveModal";
import { BatchCostApplyModal } from "./BatchCostApplyModal";
import {
  ExternalProductionReceiveModal,
  legacyReceipt,
} from "../manufacturers/ExternalProductionReceiveModal";
import { ManufacturerMaterialsEditor } from "../manufacturers/ManufacturerMaterialsEditor";

const vnd = (v: unknown, precise = false) =>
  `${(precise ? Number(v ?? 0) : Math.round(Number(v ?? 0))).toLocaleString("en-US", { maximumFractionDigits: precise ? 6 : 0 })} đ`;

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
    case 5:
      return "bg-orange-100 text-orange-700";
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
    case 5:
      return "Nhận một phần";
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
  // Đợt nhận đang sửa (phiếu gửi NSX).
  const [editingReceipt, setEditingReceipt] =
    useState<ProductionReceipt | null>(null);
  const canUpdate = usePermission("productions", "update");
  const canApplyCost = usePermission("productions", "apply_cost");
  // "Admin có thể hủy": phiếu gửi đã gửi/hoàn thành dùng quyền Xóa phiếu SX.
  const canCancelSent = usePermission("productions", "delete");
  const canCreatePurchaseOrder = usePermission("purchase_orders", "create");
  const { mutate: sendProduction, isPending: isSending } = useSendProduction();
  const { mutate: cancelSent, isPending: isCancelling } =
    useCancelSentProduction();
  const { mutate: closeReceiving, isPending: isClosing } =
    useCloseProductionReceiving();
  const { mutate: reopenReceiving, isPending: isReopening } =
    useReopenProductionReceiving();

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
        production.status === 2 || production.status === 5
          ? "Nguyên liệu được cộng lại vào kho, thành phẩm đã nhập (mọi đợt) bị trừ ra và phí sản xuất bị bỏ khỏi nợ NCC." +
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
  const isNsx = !!production?.manufacturerId;
  const planned = Number(production?.quantity ?? 0);
  const received = Number(production?.receivedQuantity ?? 0);
  const leftToReceive = Math.max(0, planned - received);
  const canReceive =
    !!production?.isExternal &&
    canUpdate &&
    (production.status === 4 || (isNsx && production.status === 5)) &&
    !activePurchaseOrder;

  const handleCloseReceiving = async () => {
    if (!production) return;
    const res = await Swal.fire({
      title: `Kết thúc nhận hàng ${production.code}?`,
      html: `Đã nhận <b>${received.toLocaleString("en-US")}</b> / ${planned.toLocaleString("en-US")}. <b>${leftToReceive.toLocaleString("en-US")}</b> sp còn lại sẽ không nhận nữa (coi là hao hụt).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Kết thúc",
      cancelButtonText: "Đóng",
    });
    if (res.isConfirmed) closeReceiving(production.id);
  };

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
                      <InfoItem
                        label={
                          production.manufacturerId
                            ? "Nhà sản xuất:"
                            : "Nhà máy:"
                        }>
                        {production.manufacturer?.name ||
                          production.factory?.name ||
                          "-"}
                      </InfoItem>
                      <InfoItem label="Nhà cung cấp:">
                        {production.supplier?.name || "-"}
                      </InfoItem>
                      <InfoItem
                        label={
                          isNsx ? "Phí gia công dự kiến:" : "Phí sản xuất lô:"
                        }>
                        {vnd(production.processingFee)}
                        {production.feeCurrency === "CNY" &&
                          ` (${Number(production.feeForeignAmount ?? 0).toLocaleString("en-US")} CNY × ${Number(production.feeExchangeRate ?? 0).toLocaleString("en-US")})`}
                      </InfoItem>
                      {isNsx && (
                        <>
                          <InfoItem label="Nguyên liệu NSX dự kiến:">
                            {vnd(production.manufacturerMaterialCost)}
                          </InfoItem>
                          <InfoItem
                            label={
                              production.status === 2 || production.status === 5
                                ? "Phải trả NSX (các đợt đã nhận):"
                                : "Phải trả NSX dự kiến:"
                            }>
                            {vnd(production.totalPayable)}
                          </InfoItem>
                          <InfoItem label="Đã thanh toán:">
                            {vnd(production.paidAmount)}
                          </InfoItem>
                          <InfoItem label="Còn nợ:">
                            {vnd(production.debtAmount)}
                          </InfoItem>
                          <InfoItem label="Công thức:">
                            {production.formulaName || "Nhập tay"}
                          </InfoItem>
                          {production.externalTemplateName && (
                            <InfoItem label="Mẫu phối trộn (cũ):">
                              {production.externalTemplateName}
                            </InfoItem>
                          )}
                        </>
                      )}
                      <InfoItem
                        label={
                          production.status === 4 || production.status === 5
                            ? "Đơn vị sản xuất đang giữ (giá vốn NVL):"
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
                      {isNsx && [2, 4, 5].includes(production.status) && (
                        <NsxCostInfo production={production} />
                      )}
                      {!isNsx && production.status === 2 && (
                        <>
                          <InfoItem label="Số lượng nhận:">
                            {Number(
                              production.receivedQuantity ?? production.quantity
                            ).toLocaleString("en-US")}
                          </InfoItem>
                          <InfoItem label="Giá thành / sp:">
                            {vnd(
                              production.batchUnitCost != null
                                ? Number(production.batchUnitCost)
                                : Number(production.totalCost) /
                                    Number(
                                      production.receivedQuantity ||
                                        production.quantity ||
                                        1
                                    ),
                              !!production.manufacturerId
                            )}
                          </InfoItem>
                          <InfoItem label="Giá vốn đã áp:">
                            {production.costAppliedAt ? (
                              vnd(
                                production.appliedUnitCost,
                                !!production.manufacturerId
                              )
                            ) : (
                              <span className="text-amber-600">
                                Chưa áp giá vốn
                              </span>
                            )}
                          </InfoItem>
                          {production.manufacturerId &&
                            !production.costSnapshotAt && (
                              <InfoItem label="Snapshot giá thành:">
                                <span className="text-amber-700">
                                  Thiếu snapshot lịch sử
                                </span>
                              </InfoItem>
                            )}
                          {production.costAppliedAt && (
                            <InfoItem label="Thực hiện áp giá:">
                              {production.costAppliedByName || "-"} ·{" "}
                              {formatDate(production.costAppliedAt)} ·{" "}
                              {production.costAppliedScope === "allBranches"
                                ? "Tất cả chi nhánh"
                                : "Kho nhận"}
                            </InfoItem>
                          )}
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
                            {!!production.manufacturerId && (
                              <th className="px-3 py-2 text-right">
                                Lượng gửi
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {production.components!.map((c) => (
                            <tr key={c.id} className="border-t">
                              <td className="px-3 py-2">{c.componentCode}</td>
                              <td className="px-3 py-2">{c.componentName}</td>
                              <td className="px-3 py-2 text-right">
                                {Number(c.unitsDeducted).toLocaleString(
                                  "en-US",
                                  { maximumFractionDigits: 3 }
                                )}
                              </td>
                              {!!production.manufacturerId && (
                                <td className="px-3 py-2 text-right">
                                  {Number(c.actualGrams).toLocaleString(
                                    "en-US"
                                  )}{" "}
                                  {c.unit}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {isNsx && [2, 4, 5].includes(production.status) && (
                  <ReceiveProgress planned={planned} received={received} />
                )}
                {isNsx && (
                  <ManufacturerMaterialsEditor
                    title="Nguyên liệu NSX dự kiến (cả lô)"
                    value={production.manufacturerMaterials ?? []}
                    onChange={() => {}}
                    currency={production.feeCurrency ?? "VND"}
                    disabled
                  />
                )}
                {isNsx && production.status !== 1 && (
                  <ReceiptHistory
                    production={production}
                    canEdit={canUpdate && production.status !== 3}
                    canCancel={canCancelSent && production.status !== 3}
                    onEdit={setEditingReceipt}
                  />
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

              {/* Footer: trái = thao tác hủy; phải = thao tác phụ rồi thao tác chính. */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
                {production.isExternal &&
                  canCancelSent &&
                  [2, 4, 5].includes(production.status) &&
                  (activePurchaseOrder ? (
                    // Đã có phiếu nhập: hủy phiếu nhập trước (trả tồn thành
                    // phẩm, bỏ phí khỏi nợ) thì phiếu mới về Đã gửi.
                    <span className="text-sm text-gray-500">
                      Muốn hủy phiếu: hủy phiếu nhập {activePurchaseOrder.code}{" "}
                      trước.
                    </span>
                  ) : (
                    <ActionButton
                      variant="danger"
                      icon={Ban}
                      pending={isCancelling}
                      onClick={handleCancelSent}>
                      Hủy phiếu
                    </ActionButton>
                  ))}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  {onEdit &&
                    production.status !== 3 &&
                    // Phiếu gửi NSX sửa được cả khi đã gửi / đã nhận (ghi lại tồn, giá thành).
                    (!production.isExternal ||
                      production.status === 1 ||
                      isNsx) && (
                      <ActionButton
                        variant={production.isExternal ? "secondary" : "primary"}
                        icon={Pencil}
                        onClick={onEdit}>
                        Chỉnh sửa
                      </ActionButton>
                    )}
                  {production.isExternal &&
                    !production.manufacturerId &&
                    canCreatePurchaseOrder &&
                    production.status === 4 &&
                    !activePurchaseOrder && (
                      <Link
                        href={`/san-pham/nhap-hang/new?productionId=${production.id}`}
                        className={BUTTON_CLASS.secondary}>
                        <FilePlus2 size={16} />
                        Mở form nhập hàng
                      </Link>
                    )}
                  {isNsx && canUpdate && production.status === 5 && (
                    <ActionButton
                      icon={Flag}
                      pending={isClosing}
                      onClick={handleCloseReceiving}>
                      Kết thúc nhận hàng
                    </ActionButton>
                  )}
                  {isNsx &&
                    canUpdate &&
                    production.status === 2 &&
                    received < planned && (
                      <ActionButton
                        icon={RotateCcw}
                        pending={isReopening}
                        onClick={() => reopenReceiving(production.id)}>
                        Mở lại nhận hàng
                      </ActionButton>
                    )}
                  {production.isExternal &&
                    canApplyCost &&
                    // Phiếu gửi NSX: giá thành chốt lúc gửi nên áp được từ khi đã gửi.
                    (isNsx
                      ? [2, 4, 5].includes(production.status)
                      : production.status === 2) &&
                    !production.costAppliedAt && (
                      <ActionButton
                        // Còn nút Nhận hàng thì áp giá là thao tác phụ.
                        variant={canReceive ? "secondary" : "primary"}
                        icon={CircleDollarSign}
                        onClick={() => setReceiveMode("applyCost")}>
                        Áp dụng giá vốn
                      </ActionButton>
                    )}
                  {production.isExternal &&
                    canUpdate &&
                    production.status === 1 && (
                      <ActionButton
                        variant="primary"
                        icon={Send}
                        pending={isSending}
                        onClick={handleSend}>
                        Gửi hàng
                      </ActionButton>
                    )}
                  {canReceive && (
                    <ActionButton
                      variant="primary"
                      icon={PackageCheck}
                      onClick={() => setReceiveMode("receive")}>
                      {production.status === 5 ? "Nhận đợt tiếp" : "Nhận hàng"}
                    </ActionButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {receiveMode &&
          (production.manufacturerId ? (
            receiveMode === "receive" ? (
              <ExternalProductionReceiveModal
                production={production}
                onClose={() => setReceiveMode(null)}
              />
            ) : (
              canApplyCost && (
                <BatchCostApplyModal
                  productionId={production.id}
                  onClose={() => setReceiveMode(null)}
                />
              )
            )
          ) : (
            <ProductionReceiveModal
              production={production}
              mode={receiveMode}
              onClose={() => setReceiveMode(null)}
            />
          ))}
        {editingReceipt && (
          <ExternalProductionReceiveModal
            production={production}
            receipt={editingReceipt}
            onClose={() => setEditingReceipt(null)}
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

const qty = (value: unknown) =>
  Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 });

/** Giá thành dự kiến (chốt lúc gửi) + trạng thái áp giá của phiếu gửi NSX. */
function NsxCostInfo({ production }: { production: Production }) {
  return (
    <>
      <InfoItem label="Giá thành dự kiến / sp:">
        {production.batchUnitCost != null
          ? vnd(production.batchUnitCost, true)
          : "-"}
      </InfoItem>
      <InfoItem label="Giá vốn đã áp:">
        {production.costAppliedAt ? (
          vnd(production.appliedUnitCost, true)
        ) : (
          <span className="text-amber-600">Chưa áp giá vốn</span>
        )}
      </InfoItem>
      {production.costAppliedAt && (
        <InfoItem label="Thực hiện áp giá:">
          {production.costAppliedByName || "-"} ·{" "}
          {formatDate(production.costAppliedAt)} ·{" "}
          {production.costAppliedScope === "allBranches"
            ? "Tất cả chi nhánh"
            : "Kho nhận"}
        </InfoItem>
      )}
    </>
  );
}

/** Thanh tiến độ "Đã nhận X / Y · còn Z". */
function ReceiveProgress({
  planned,
  received,
}: {
  planned: number;
  received: number;
}) {
  const percent = planned > 0 ? Math.min(100, (received / planned) * 100) : 0;
  const left = Math.max(0, planned - received);
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-gray-700">Tiến độ nhận hàng</span>
        <span className="tabular-nums text-gray-600">
          Đã nhận <b className="text-green-700">{qty(received)}</b> /{" "}
          {qty(planned)}
          {left > 0 ? (
            <>
              {" "}
              · còn <b className="text-amber-700">{qty(left)}</b>
            </>
          ) : received > planned ? (
            <> · vượt {qty(received - planned)}</>
          ) : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-green-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Lịch sử các đợt nhận: sửa / hủy từng đợt. */
function ReceiptHistory({
  production,
  canEdit,
  canCancel,
  onEdit,
}: {
  production: Production;
  canEdit: boolean;
  canCancel: boolean;
  onEdit: (receipt: ProductionReceipt) => void;
}) {
  const { mutate: cancelReceipt, isPending } = useCancelProductionReceipt();
  const legacy = legacyReceipt(production);
  const receipts = production.receipts?.length
    ? production.receipts
    : legacy
      ? [legacy]
      : [];
  const cny = production.feeCurrency === "CNY";

  const handleCancel = async (receipt: ProductionReceipt) => {
    const res = await Swal.fire({
      title: `Hủy đợt nhận ${receipt.code}?`,
      html: `Trừ lại <b>${qty(receipt.quantity)}</b> thành phẩm khỏi kho ${production.destinationBranchName} và bỏ <b>${vnd(receipt.totalPayable)}</b> khỏi nợ NSX.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy đợt",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed)
      cancelReceipt({ id: production.id, receiptId: receipt.id });
  };

  return (
    <div>
      <label className="block text-md font-medium text-gray-500 mb-1.5">
        Lịch sử nhận hàng:
      </label>
      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Mã đợt</th>
              <th className="px-3 py-2 text-left">Ngày nhận</th>
              <th className="px-3 py-2 text-right">Số lượng</th>
              <th className="px-3 py-2 text-right">NL NSX</th>
              <th className="px-3 py-2 text-right">
                Phí gia công{cny ? " (VND)" : ""}
              </th>
              <th className="px-3 py-2 text-right">Phải trả</th>
              <th className="px-3 py-2 text-left">Người nhận</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => {
              const active = receipt.status === 1;
              return (
                <tr
                  key={receipt.id || receipt.code}
                  className={`border-t ${active ? "" : "text-gray-400 line-through decoration-gray-300"}`}>
                  <td className="px-3 py-2 font-medium">{receipt.code}</td>
                  <td className="px-3 py-2">
                    {formatDate(receipt.receivedDate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {qty(receipt.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {vnd(receipt.manufacturerMaterialCost)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {vnd(receipt.processingFee)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {vnd(receipt.totalPayable)}
                  </td>
                  <td className="px-3 py-2">
                    {receipt.updatedByName || receipt.createdByName}
                  </td>
                  <td className="px-3 py-2">
                    {active ? (
                      <span className="text-green-700">Đã nhận</span>
                    ) : (
                      <span title={receipt.cancelledByName ?? undefined}>
                        Đã hủy
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {active && canEdit && (
                        <button
                          onClick={() => onEdit(receipt)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft">
                          <Pencil size={14} />
                          Sửa
                        </button>
                      )}
                      {active && canCancel && (
                        <button
                          onClick={() => handleCancel(receipt)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                          <Ban size={14} />
                          Hủy đợt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!receipts.length && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                  Chưa nhận đợt nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BUTTON_BASE =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_CLASS = {
  primary: `${BUTTON_BASE} bg-brand text-white shadow-sm hover:bg-brand-dark focus-visible:ring-brand-soft`,
  secondary: `${BUTTON_BASE} border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-brand-soft`,
  danger: `${BUTTON_BASE} border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-100`,
} as const;

/** Nút thao tác của chi tiết phiếu: icon + nhãn, xoay khi đang xử lý. */
function ActionButton({
  variant = "secondary",
  icon: Icon,
  pending = false,
  onClick,
  children,
}: {
  variant?: keyof typeof BUTTON_CLASS;
  icon: LucideIcon;
  pending?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={BUTTON_CLASS[variant]}>
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Icon size={16} />
      )}
      {children}
    </button>
  );
}
