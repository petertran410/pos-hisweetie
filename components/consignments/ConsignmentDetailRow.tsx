"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  useConsignment,
  useUpdateConsignment,
  useCancelConsignment,
} from "@/lib/hooks/useConsignments";
import {
  useConfirmConsignmentReturnStock,
  useCancelConsignmentReturn,
} from "@/lib/hooks/useConsignmentReturns";
import {
  CONSIGNMENT_STATUS,
  CONSIGNMENT_STATUS_COLOR,
  CONSIGNMENT_RETURN_STATUS,
  CONSIGNMENT_RETURN_STATUS_COLOR,
  getStatusLabel,
  getReturnStatusLabel,
} from "@/lib/types/consignment";
import { Loader2, Pencil, Send, ChevronDown, Printer, Undo2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCan } from "@/lib/hooks/useCan";
import { toast } from "sonner";
import { printEntity } from "@/lib/utils/print";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { CodeLink } from "../shared/CodeLink";
import { CancelConsignmentModal } from "./CancelConsignmentModal";
import { CreateInvoiceFromConsignmentModal } from "./CreateInvoiceFromConsignmentModal";
import { CreateConsignmentReturnModal } from "./CreateConsignmentReturnModal";

interface ConsignmentDetailRowProps {
  consignmentId: number;
  colSpan: number;
}

const formatDateTime = (dateString?: string) =>
  dateString ? new Date(dateString).toLocaleString("vi-VN") : "-";

// NSX nhập dạng YYYY-MM-DD → chỉ hiển thị ngày, không kèm giờ.
const formatDate = (dateString?: string | null) =>
  dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "-";

export function ConsignmentDetailRow({
  consignmentId,
  colSpan,
}: ConsignmentDetailRowProps) {
  const router = useRouter();
  const { data: consignment, isLoading } = useConsignment(consignmentId);
  const updateConsignment = useUpdateConsignment();
  const cancelConsignment = useCancelConsignment();

  const confirmReturnStock = useConfirmConsignmentReturnStock();
  const cancelReturn = useCancelConsignmentReturn();

  const canUpdate = useCan("consignments", "update");
  const canCreateInvoice = useCan("invoices", "create");
  const canCreateReturn = useCan("consignment_returns", "create");
  const canUpdateReturn = useCan("consignment_returns", "update");
  const canCancelReturn = useCan("consignment_returns", "cancel");

  const [activeTab, setActiveTab] = useState<"products" | "returns">(
    "products"
  );
  const [showCancel, setShowCancel] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<number>(
    CONSIGNMENT_STATUS.PENDING
  );
  const [description, setDescription] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Danh sách mẫu in ký gửi đang active (để chọn khi in).
  const { data: printTemplates } = useQuery({
    queryKey: ["print-templates", "consignment"],
    queryFn: () =>
      printTemplatesApi.getAll({
        templateFor: "consignment",
        isActive: true,
      }),
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (printRef.current && !printRef.current.contains(e.target as Node))
        setShowPrintDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (consignment) {
      setSelectedStatus(consignment.status);
      setDescription(consignment.description || "");
    }
  }, [consignment]);

  if (isLoading || !consignment) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8 text-center bg-brand-soft">
          <Loader2 className="w-5 h-5 animate-spin inline text-brand" />
        </td>
      </tr>
    );
  }

  const status = consignment.status;
  const isCancelled = status === CONSIGNMENT_STATUS.CANCELLED;
  const isCompleted = status === CONSIGNMENT_STATUS.COMPLETED;

  // Chỉ cho đổi trạng thái thủ công (Phiếu tạm ↔ Đã xác nhận) khi chưa xử lý kho.
  const isStatusEditable =
    status === CONSIGNMENT_STATUS.PENDING ||
    status === CONSIGNMENT_STATUS.CONFIRMED;

  // B3: cho xuất hóa đơn khi đã giao / đang ký gửi một phần.
  const canInvoice =
    status === CONSIGNMENT_STATUS.DELIVERED ||
    status === CONSIGNMENT_STATUS.PARTIALLY_INVOICED;

  // Hoàn hàng ký gửi: khi đã giao / đang ký gửi một phần.
  const canReturn =
    status === CONSIGNMENT_STATUS.DELIVERED ||
    status === CONSIGNMENT_STATUS.PARTIALLY_INVOICED;

  // Cho sửa khi chưa xử lý kho.
  const canEdit = status < CONSIGNMENT_STATUS.PACKED && !isCancelled;

  const willRestoreStock =
    status >= CONSIGNMENT_STATUS.PACKED &&
    status <= CONSIGNMENT_STATUS.DELIVERED;

  const STATUS_TO_KEY: Record<number, string> = {
    [CONSIGNMENT_STATUS.PENDING]: "pending",
    [CONSIGNMENT_STATUS.CONFIRMED]: "confirmed",
  };

  // SL đã xuất hóa đơn theo product.
  const invoicedByProduct: Record<number, number> = {};
  for (const inv of consignment.invoices || []) {
    for (const d of inv.details || []) {
      invoicedByProduct[d.productId] =
        (invoicedByProduct[d.productId] || 0) + Number(d.quantity || 0);
    }
  }

  // Phiếu hoàn chưa hủy + SL đã nhận về kho theo product (STOCK_RECEIVED).
  const activeReturns = (consignment.returns || []).filter(
    (r) => r.status !== CONSIGNMENT_RETURN_STATUS.CANCELLED
  );
  const receivedByProduct: Record<number, number> = {};
  for (const ro of consignment.returns || []) {
    if (ro.status !== CONSIGNMENT_RETURN_STATUS.STOCK_RECEIVED) continue;
    for (const d of ro.details || []) {
      receivedByProduct[d.productId] =
        (receivedByProduct[d.productId] || 0) + Number(d.returnQuantity || 0);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: any = { description };
      if (isStatusEditable) {
        data.consignStatus = STATUS_TO_KEY[selectedStatus] || "pending";
      }
      await updateConsignment.mutateAsync({ id: consignment.id, data });
      toast.success("Lưu phiếu ký gửi thành công");
    } catch (e: any) {
      toast.error(e?.message || "Không thể lưu phiếu ký gửi");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async (templateId?: number) => {
    setShowPrintDropdown(false);
    try {
      await printEntity("consignment", consignment.id, templateId);
    } catch (e: any) {
      toast.error(e?.message || "In thất bại");
    }
  };

  return (
    <tr>
      <td colSpan={colSpan} className="bg-brand-soft px-6 py-4 border-b-2 border-brand">
        <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Khách hàng:</span>
              <span className="font-medium">
                {consignment.customer?.name || "-"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Chi nhánh:</span>
              <span>{consignment.branch?.name || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Ngày ký gửi:</span>
              <span>{formatDateTime(consignment.consignDate)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-32">Người tạo:</span>
              <span>{consignment.creator?.name || "-"}</span>
            </div>
          </div>
          <div className="space-y-2">
            {/* Trạng thái — dropdown (Phiếu tạm ↔ Đã xác nhận) */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-28">Trạng thái:</span>
              {!isStatusEditable ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    CONSIGNMENT_STATUS_COLOR[status] ??
                    "bg-gray-100 text-gray-700"
                  }`}>
                  {getStatusLabel(status)}
                </span>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown((p) => !p)}
                    className="w-[180px] px-2 py-1 border border-gray-200 rounded bg-white text-left flex items-center justify-between hover:border-brand">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        CONSIGNMENT_STATUS_COLOR[selectedStatus] ??
                        "bg-gray-100 text-gray-700"
                      }`}>
                      {getStatusLabel(selectedStatus)}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showStatusDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute z-20 mt-1 w-[180px] bg-white border rounded-lg shadow-lg overflow-hidden">
                      {[
                        CONSIGNMENT_STATUS.PENDING,
                        CONSIGNMENT_STATUS.CONFIRMED,
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(s);
                            setShowStatusDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50">
                          <span className="font-medium">
                            {getStatusLabel(s)}
                          </span>
                          {selectedStatus === s && (
                            <span className="text-brand text-xs ml-auto">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-28">Tổng cộng:</span>
              <span className="font-semibold text-brand">
                {formatCurrency(Number(consignment.grandTotal))}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === "products"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Sản phẩm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === "returns"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Hàng hoàn ký gửi
            {activeReturns.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs">
                {activeReturns.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab: Sản phẩm */}
        {activeTab === "products" && (
          <div className="bg-white rounded-lg border overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Mã hàng
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Tên hàng
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    NSX
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    SL ký gửi
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    Hàng đã xuất
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    Hoàn ký gửi
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    Ký gửi còn lại
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Đơn giá
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {consignment.items?.map((item) => {
                  const invoiced = invoicedByProduct[item.productId] || 0;
                  const returned = receivedByProduct[item.productId] || 0;
                  const remaining =
                    Number(item.quantity) - invoiced - returned;
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <CodeLink entity="product" code={item.productCode} />
                      </td>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">
                        {formatDate(item.manufactureDate)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {Number(item.quantity)}
                      </td>
                      <td className="px-3 py-2 text-center">{invoiced}</td>
                      <td className="px-3 py-2 text-center text-orange-600">
                        {returned}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">
                        {remaining}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(Number(item.price))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(Number(item.totalPrice))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Hàng hoàn ký gửi */}
        {activeTab === "returns" && (
          <div className="bg-white rounded-lg border overflow-x-auto mb-3">
            {activeReturns.length === 0 ? (
              <div className="px-3 py-8 text-center text-gray-400 text-sm">
                Chưa có phiếu hoàn ký gửi.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Mã phiếu hoàn
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Ngày tạo
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">
                      SL hoàn
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">
                      Trạng thái
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeReturns.map((ro) => {
                    const total =
                      ro.totalReturnQuantity ??
                      (ro.details || []).reduce(
                        (s, d) => s + Number(d.returnQuantity || 0),
                        0
                      );
                    const isRequest =
                      ro.status === CONSIGNMENT_RETURN_STATUS.REQUEST;
                    return (
                      <tr key={ro.id}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {ro.code}
                        </td>
                        <td className="px-3 py-2">
                          {formatDateTime(ro.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-center">{total}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              CONSIGNMENT_RETURN_STATUS_COLOR[ro.status] ??
                              "bg-gray-100 text-gray-700"
                            }`}>
                            {getReturnStatusLabel(ro.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isRequest && canUpdateReturn && (
                              <button
                                onClick={() =>
                                  confirmReturnStock.mutate(ro.id)
                                }
                                disabled={confirmReturnStock.isPending}
                                className="px-2.5 py-1 bg-brand text-white rounded text-xs hover:bg-brand-dark disabled:opacity-50">
                                Xác nhận nhận hàng
                              </button>
                            )}
                            {canCancelReturn && (
                              <button
                                onClick={() => cancelReturn.mutate(ro.id)}
                                disabled={cancelReturn.isPending}
                                className="px-2.5 py-1 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50 disabled:opacity-50">
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Hành động */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && canUpdate && (
            <button
              onClick={() => router.push(`/don-hang/ky-gui/${consignment.id}`)}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
              <Pencil className="w-4 h-4" /> Sửa
            </button>
          )}

          {canInvoice && canCreateInvoice && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Xuất hóa đơn
            </button>
          )}

          {canReturn && canCreateReturn && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="px-3 py-1.5 border border-orange-300 text-orange-600 rounded-lg text-sm hover:bg-orange-50 flex items-center gap-1.5">
              <Undo2 className="w-4 h-4" /> Hoàn hàng ký gửi
            </button>
          )}

          {(printTemplates?.length ?? 0) <= 1 ? (
            <button
              onClick={() => handlePrint(printTemplates?.[0]?.id)}
              className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> In
            </button>
          ) : (
            <div ref={printRef} className="relative">
              <button
                onClick={() => setShowPrintDropdown((p) => !p)}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> In
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showPrintDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showPrintDropdown && (
                <div className="absolute z-20 mt-1 w-[240px] bg-white border rounded-lg shadow-lg overflow-hidden">
                  {printTemplates!.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePrint(t.id)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                      {t.name}
                      {t.isDefault ? " (Mặc định)" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {canUpdate && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              {isSaving ? "Đang lưu..." : "Lưu"}
            </button>
          )}

          {!isCancelled && !isCompleted && canUpdate && (
            <button
              onClick={() => setShowCancel(true)}
              className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 ml-auto">
              Hủy phiếu
            </button>
          )}
        </div>

        <CancelConsignmentModal
          isOpen={showCancel}
          onClose={() => setShowCancel(false)}
          onConfirm={(reason) =>
            cancelConsignment.mutate({ id: consignment.id, reason })
          }
          consignmentCode={consignment.code}
          willRestoreStock={willRestoreStock}
        />

        {showInvoiceModal && (
          <CreateInvoiceFromConsignmentModal
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
            consignment={consignment}
          />
        )}

        {showReturnModal && (
          <CreateConsignmentReturnModal
            isOpen={showReturnModal}
            onClose={() => setShowReturnModal(false)}
            consignment={consignment}
          />
        )}
      </td>
    </tr>
  );
}
