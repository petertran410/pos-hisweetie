"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useSupplierReturn } from "@/lib/hooks/useSupplierReturns";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { formatCurrency } from "@/lib/utils";
import { PermissionGate } from "../permissions/PermissionGate";

interface Props {
  supplierReturnId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
];

export function ConfirmRefundModal({
  supplierReturnId,
  onClose,
  onSubmit,
  onCancel,
}: Props) {
  const { data: supplierReturn, isLoading } =
    useSupplierReturn(supplierReturnId);
  const { data: bankAccounts } = useBankAccountsForPayment();

  const [refundType, setRefundType] = useState<"cash_refund" | "debt_offset">(
    "debt_offset"
  );
  const [method, setMethod] = useState("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [note, setNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const methodRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const refundAmount = Number(supplierReturn?.refundAmount || 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (methodRef.current && !methodRef.current.contains(e.target as Node))
        setShowMethodDropdown(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setShowAccountDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = () => {
    onSubmit({
      refundType,
      note,
      method: refundType === "cash_refund" ? method : undefined,
      accountId:
        refundType === "cash_refund" && method === "transfer"
          ? selectedAccountId
          : undefined,
    });
  };

  if (isLoading) return null;

  const selectedMethodLabel = METHOD_OPTIONS.find(
    (m) => m.value === method
  )?.label;
  const selectedAccount = bankAccounts?.find(
    (a: any) => a.id === selectedAccountId
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Xử lý công nợ NCC</h2>
            <p className="text-sm text-gray-500">{supplierReturn?.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Nhà cung cấp</span>
              <span className="font-medium">
                {supplierReturn?.supplier?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số tiền xử lý</span>
              <span className="font-semibold text-brand">
                {formatCurrency(refundAmount)}
              </span>
            </div>
          </div>

          {/* Hình thức xử lý */}
          <div>
            <label className="block text-sm font-medium mb-2">
              NCC xử lý khoản này như thế nào?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${refundType === "debt_offset" ? "border-brand" : "border-gray-300"}`}>
                  {refundType === "debt_offset" && (
                    <div className="w-2 h-2 bg-brand rounded-full" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Giảm nợ</div>
                  <div className="text-xs text-gray-400">
                    NCC trừ vào khoản nợ hiện tại
                  </div>
                </div>
                <input
                  type="radio"
                  className="hidden"
                  checked={refundType === "debt_offset"}
                  onChange={() => setRefundType("debt_offset")}
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${refundType === "cash_refund" ? "border-brand" : "border-gray-300"}`}>
                  {refundType === "cash_refund" && (
                    <div className="w-2 h-2 bg-brand rounded-full" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">Trả tiền</div>
                  <div className="text-xs text-gray-400">
                    NCC hoàn tiền trực tiếp
                  </div>
                </div>
                <input
                  type="radio"
                  className="hidden"
                  checked={refundType === "cash_refund"}
                  onChange={() => setRefundType("cash_refund")}
                />
              </label>
            </div>
          </div>

          {/* Phương thức thanh toán — chỉ hiện khi cash_refund */}
          {refundType === "cash_refund" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phương thức
                </label>
                <div className="relative" ref={methodRef}>
                  <button
                    onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                    className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                    {selectedMethodLabel}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showMethodDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                      {METHOD_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setMethod(opt.value);
                            setShowMethodDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {method === "transfer" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tài khoản nhận
                  </label>
                  <div className="relative" ref={accountRef}>
                    <button
                      onClick={() =>
                        setShowAccountDropdown(!showAccountDropdown)
                      }
                      className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                      {selectedAccount?.name || "Chọn tài khoản"}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showAccountDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                        {bankAccounts?.map((acc: any) => (
                          <button
                            key={acc.id}
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              setShowAccountDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                            {acc.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ghi chú..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 space-y-3">
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
                action="confirm_refund">
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-dark">
                  Xác nhận
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
