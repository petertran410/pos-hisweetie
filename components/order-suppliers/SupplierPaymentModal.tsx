"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import {
  formatCurrency,
  parseNumberInput,
  formatNumberInput,
} from "@/lib/utils";

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  previouslyPaid?: number;
  onConfirm: (
    amount: number,
    method: "cash" | "transfer" | "card",
    accountId?: number
  ) => void;
}

export function SupplierPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  previouslyPaid = 0,
  onConfirm,
}: SupplierPaymentModalProps) {
  const needToPay = totalAmount - previouslyPaid;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const { data: bankAccountsData } = useBankAccountsForPayment();
  const bankAccounts: any[] = bankAccountsData || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset chọn tài khoản khi chuyển về Tiền mặt
  useEffect(() => {
    if (method !== "transfer") {
      setSelectedAccountId(null);
      setShowAccountDropdown(false);
    }
  }, [method]);

  if (!isOpen || !mounted) return null;

  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setAmount(formatted);
  };

  const handleConfirm = () => {
    const numericAmount = parseNumberInput(amount);
    if (numericAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (method === "transfer" && !selectedAccountId) {
      alert("Vui lòng chọn tài khoản ngân hàng");
      return;
    }
    onConfirm(numericAmount, method, selectedAccountId ?? undefined);
    onClose();
  };

  const numericAmount = parseNumberInput(amount);
  const remaining = needToPay - numericAmount;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Tiền trả nhà cung cấp</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thanh toán
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Nhập số tiền"
              className="w-full text-right text-2xl font-semibold border-2 border-brand rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMethod("cash")}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                method === "cash"
                  ? "bg-brand text-white"
                  : "bg-white text-brand border border-brand"
              }`}>
              Tiền mặt
            </button>
            <button
              onClick={() => setMethod("transfer")}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                method === "transfer"
                  ? "bg-brand text-white"
                  : "bg-white text-brand border border-brand"
              }`}>
              Chuyển khoản
            </button>
          </div>

          {/* Dropdown chọn tài khoản ngân hàng công ty - chỉ hiển thị khi
              chọn "Chuyển khoản". Tài khoản này là TK công ty dùng để
              chuyển tiền cho NCC, BE sẽ gắn vào CashFlow + OrderSupplierPayment. */}
          {method === "transfer" && (
            <div className="relative" ref={accountDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tài khoản ngân hàng <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAccountDropdown((v) => !v)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between hover:bg-gray-50">
                <span
                  className={
                    selectedAccountId ? "text-gray-900" : "text-gray-400"
                  }>
                  {selectedAccountId
                    ? (() => {
                        const account = bankAccounts.find(
                          (a: any) => a.id === selectedAccountId
                        );
                        return account
                          ? `${account.bankCode} - ${account.accountNumber}`
                          : "Chọn tài khoản";
                      })()
                    : "Chọn tài khoản"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showAccountDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {bankAccounts.length > 0 ? (
                    bankAccounts.map((account: any) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setShowAccountDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0">
                        <div className="font-medium text-sm">
                          {account.bankCode} - {account.accountNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.accountHolder}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      Chưa có tài khoản ngân hàng
                    </div>
                  )}
                </div>
              )}

              {/* Hiển thị chi tiết TK đang chọn */}
              {selectedAccountId && (
                <div className="mt-1 text-xs text-gray-500">
                  {(() => {
                    const account = bankAccounts.find(
                      (a: any) => a.id === selectedAccountId
                    );
                    return account ? (
                      <>
                        Chủ TK: {account.accountHolder}
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Cần trả nhà cung cấp</span>
              <span className="font-semibold text-brand">
                {formatCurrency(needToPay)}
              </span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Còn nợ</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
            Bỏ qua
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-brand text-white rounded-lg hover:bg-brand-dark font-medium">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
