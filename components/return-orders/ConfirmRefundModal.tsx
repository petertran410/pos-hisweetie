"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import {
  useReturnOrder,
  useCancelReturnOrder,
} from "@/lib/hooks/useReturnOrders";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useCan, useIsAdmin } from "@/lib/hooks/useCan";
import { formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";

interface ConfirmRefundModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
];

export function ConfirmRefundModal({
  returnOrderId,
  onClose,
  onSubmit,
}: ConfirmRefundModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const { data: bankAccounts } = useBankAccountsForPayment();
  const cancelReturnOrder = useCancelReturnOrder();
  const canCancel = useCan("return_orders", "cancel");
  const isAdmin = useIsAdmin();

  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [refundType, setRefundType] = useState<"cash_refund" | "debt_offset">(
    "debt_offset"
  );

  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const refundAmount = Number(returnOrder?.refundAmount || 0);

  // Chỉ phiếu ở trạng thái "Nhập hàng trả" (STOCK_RECEIVED = 2) mới được
  // xác nhận hoàn tiền. Các trạng thái khác (3/4/5) mở ở chế độ chỉ-xem.
  const isActionable = returnOrder?.status === 2;

  // Nút Hủy: phiếu đã hoàn thành (status 4) chỉ Admin/Super Admin mới được hủy;
  // các trạng thái còn lại (1/2/6/7) cho hủy bình thường. Phiếu đã hủy (5) thì ẩn.
  const status = returnOrder?.status;
  const canShowCancel =
    canCancel &&
    status !== undefined &&
    status !== 5 &&
    (status === 4 ? isAdmin : true);

  // ── Tính effectiveRefundAmount: phần dư vượt quá nợ còn lại
  const invoiceGrandTotal = Number(returnOrder?.invoice?.grandTotal || 0);
  const invoicePaidAmount = Number(returnOrder?.invoice?.paidAmount || 0);
  const originalDebt = Math.max(0, invoiceGrandTotal - invoicePaidAmount);
  const effectiveRefundAmount = Math.max(0, refundAmount - originalDebt);
  const hasExcessRefund = effectiveRefundAmount > 0;

  // Auto-set refundType khi không có khoản dư
  useEffect(() => {
    if (returnOrder && !hasExcessRefund) {
      setRefundType("debt_offset");
    }
  }, [returnOrder, hasExcessRefund]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        methodDropdownRef.current &&
        !methodDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMethodDropdown(false);
      }
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMethodLabel =
    METHOD_OPTIONS.find((m) => m.value === method)?.label || "Tiền mặt";
  const selectedAccount = bankAccounts?.find(
    (a: any) => a.id === selectedAccountId
  );

  const handleSubmit = () => {
    onSubmit({
      note,
      method: refundType === "cash_refund" ? method : undefined,
      accountId:
        refundType === "cash_refund" && method === "transfer"
          ? selectedAccountId
          : undefined,
      refundType,
    });
  };

  const handleCancel = async () => {
    const isCompleted = returnOrder?.status === 4;
    const res = await Swal.fire({
      title: "Hủy phiếu trả hàng?",
      text: isCompleted
        ? "Phiếu đã hoàn thành. Hủy sẽ hoàn tác tồn kho, khôi phục công nợ và hủy phiếu chi hoàn tiền liên quan (nếu có). Thao tác này không thể hoàn lại."
        : "Phiếu trả hàng sẽ chuyển sang trạng thái Đã hủy và hoàn tác các tác động liên quan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) {
      try {
        await cancelReturnOrder.mutateAsync(returnOrderId);
        onClose();
      } catch {
        // error handled by hook
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[900px] min-h-[85vh] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            {isActionable ? "Xác nhận hoàn tiền" : "Chi tiết phiếu trả hàng"} -{" "}
            {returnOrder?.code}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Thông tin cơ bản */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Hóa đơn:</span>{" "}
                {returnOrder?.invoice?.code ||
                  [
                    ...new Set(
                      (returnOrder?.details || []).map(
                        (d: any) => d.invoiceCode
                      )
                    ),
                  ].join(", ")}
              </div>
              <div>
                <span className="text-gray-500">Khách hàng:</span>{" "}
                {returnOrder?.customer?.name || "Khách lẻ"}
              </div>
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-right">SL xác nhận</th>
                <th className="px-3 py-2 text-right">Giá nhập lại</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(returnOrder?.details || []).map((d: any) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{d.productName}</div>
                    <div className="text-xs text-gray-500">{d.productCode}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(d.confirmedQuantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(Number(d.returnPrice))}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(
                      Number(d.confirmedQuantity) * Number(d.returnPrice)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tổng kết số tiền */}
          <div
            className={`p-4 rounded-lg ${hasExcessRefund ? "bg-red-50" : "bg-green-50"}`}>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Tổng giá trị trả hàng:</span>
                <div className="font-semibold mt-0.5">
                  {formatCurrency(refundAmount)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Nợ còn lại của hóa đơn:</span>
                <div className="font-semibold mt-0.5">
                  {formatCurrency(originalDebt)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Cần hoàn lại cho khách:</span>
                <div
                  className={`font-semibold mt-0.5 ${hasExcessRefund ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(effectiveRefundAmount)}
                </div>
              </div>
            </div>

            {!hasExcessRefund && (
              <div className="mt-2 text-sm text-green-700">
                {refundAmount === originalDebt
                  ? "Số tiền trả hàng khớp với nợ còn lại — không cần hoàn tiền cho khách."
                  : "Số tiền trả hàng thấp hơn nợ còn lại — không cần hoàn tiền cho khách."}
              </div>
            )}
          </div>

          {/* Hình thức xử lý — chỉ hiển thị khi phiếu đang chờ xác nhận và có khoản dư */}
          {isActionable && hasExcessRefund && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hình thức xử lý
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === "cash_refund"}
                      onChange={() => setRefundType("cash_refund")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      Tạo phiếu chi (hoàn tiền cho khách)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === "debt_offset"}
                      onChange={() => setRefundType("debt_offset")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      Cấn trừ công nợ (chỉ giảm nợ)
                    </span>
                  </label>
                </div>
              </div>

              {/* Phương thức hoàn tiền — chỉ hiển thị khi chọn cash_refund */}
              {refundType === "cash_refund" && (
                <div className="grid grid-cols-2 gap-4">
                  <div ref={methodDropdownRef} className="relative">
                    <label className="block text-sm font-medium mb-1">
                      Phương thức hoàn tiền
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                      className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between bg-white text-sm ${
                        showMethodDropdown
                          ? "border-brand"
                          : "border-gray-300"
                      }`}>
                      <span>{selectedMethodLabel}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${showMethodDropdown ? "rotate-180" : ""}`}
                      />
                    </button>
                    {showMethodDropdown && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                        {METHOD_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setMethod(opt.value);
                              setShowMethodDropdown(false);
                              if (opt.value === "cash")
                                setSelectedAccountId(null);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-brand-soft text-sm flex items-center gap-2 ${
                              method === opt.value
                                ? "bg-brand-soft text-brand-dark"
                                : "text-gray-900"
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {method === "transfer" && (
                    <div ref={accountDropdownRef} className="relative">
                      <label className="block text-sm font-medium mb-1">
                        Tài khoản ngân hàng
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowAccountDropdown(!showAccountDropdown)
                        }
                        className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between bg-white text-sm ${
                          showAccountDropdown
                            ? "border-brand"
                            : "border-gray-300"
                        }`}>
                        <span
                          className={
                            selectedAccount ? "text-gray-900" : "text-gray-400"
                          }>
                          {selectedAccount
                            ? `${selectedAccount.bankCode} - ${selectedAccount.accountNumber}`
                            : "Chọn tài khoản"}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${showAccountDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showAccountDropdown && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {bankAccounts && bankAccounts.length > 0 ? (
                            bankAccounts.map((account: any) => (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAccountId(account.id);
                                  setShowAccountDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-brand-soft border-b last:border-b-0 ${
                                  selectedAccountId === account.id
                                    ? "bg-brand-soft"
                                    : ""
                                }`}>
                                <div className="font-medium text-sm">
                                  {account.bankCode} - {account.accountNumber}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {account.accountHolder}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4">
                              Chưa có tài khoản ngân hàng
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tóm tắt xử lý (chỉ-xem) — khi phiếu đã chốt (status 3/4/5) */}
          {!isActionable && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Hình thức xử lý:</span>
                <span className="font-medium">
                  {returnOrder?.refundType === "cash_refund"
                    ? "Đã tạo phiếu chi (hoàn tiền cho khách)"
                    : returnOrder?.refundType === "debt_offset" ||
                        returnOrder?.refundType === "manual_offset"
                      ? "Đã cấn trừ công nợ"
                      : "—"}
                </span>
              </div>
              {returnOrder?.refundConfirmedByName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Người xác nhận:</span>
                  <span className="font-medium">
                    {returnOrder.refundConfirmedByName}
                  </span>
                </div>
              )}
              {returnOrder?.refundConfirmedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian xác nhận:</span>
                  <span className="font-medium">
                    {new Date(returnOrder.refundConfirmedAt).toLocaleString(
                      "vi-VN"
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ghi chú */}
        <div className="px-4 py-3 border-t shrink-0">
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          {isActionable ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {returnOrder?.note || "—"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
          <div>
            {canShowCancel && (
              <button
                onClick={handleCancel}
                disabled={cancelReturnOrder.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {cancelReturnOrder.isPending ? "Đang hủy..." : "Hủy phiếu"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
              {isActionable ? "Hủy" : "Đóng"}
            </button>
            {isActionable && (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                {hasExcessRefund
                  ? refundType === "cash_refund"
                    ? "Xác nhận & Tạo phiếu chi"
                    : "Xác nhận & Cấn trừ nợ"
                  : "Xác nhận hoàn thành"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
