"use client";

import { useState } from "react";
import { X, CreditCard } from "lucide-react";
import {
  formatCurrency,
  parseNumberInput,
  formatNumberInput,
} from "@/lib/utils";

interface SupplierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (amount: number, method: "cash" | "transfer" | "card") => void;
}

export function SupplierPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirm,
}: SupplierPaymentModalProps) {
  const [amount, setAmount] = useState(
    formatNumberInput(totalAmount.toString())
  );
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");

  if (!isOpen) return null;

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
    onConfirm(numericAmount, method);
    onClose();
  };

  const numericAmount = parseNumberInput(amount);
  const remaining = totalAmount - numericAmount;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Tiền trả nhà cung cấp</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Số tiền thanh toán */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thanh toán
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full text-right text-2xl font-semibold border-2 border-blue-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phương thức thanh toán */}
          <div className="flex gap-2">
            <button
              onClick={() => setMethod("cash")}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                method === "cash"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-600 border border-blue-600"
              }`}>
              Tiền mặt
            </button>
            <button
              onClick={() => setMethod("card")}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                method === "card"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-600 border border-blue-600"
              }`}>
              Thẻ
            </button>
            <button
              onClick={() => setMethod("transfer")}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                method === "transfer"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-600 border border-blue-600"
              }`}>
              Chuyển khoản
            </button>
          </div>

          {/* Thông tin thanh toán */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Cần trả nhà cung cấp</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Tiền nhà cung cấp trả lại</span>
              <span className="font-semibold">
                {remaining <= 0 ? formatCurrency(remaining * -1) : 0}
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
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
