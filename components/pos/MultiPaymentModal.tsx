"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface PaymentMethod {
  method: "cash" | "transfer" | "card" | "ewallet" | "voucher";
  amount: number;
}

interface MultiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (payments: PaymentMethod[]) => void;
}

export function MultiPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirm,
}: MultiPaymentModalProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [displayAmount, setDisplayAmount] = useState("");

  const quickAmounts = [3000, 4000, 5000, 10000, 20000, 50000, 100000, 200000];

  const methodLabels = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    card: "Thẻ",
    ewallet: "Ví",
    voucher: "Voucher",
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const handleQuickAmount = (amount: number) => {
    setDisplayAmount(amount.toLocaleString());
  };

  const handleMethodClick = (method: PaymentMethod["method"]) => {
    const amount = parseFloat(displayAmount.replace(/,/g, "")) || 0;
    if (amount <= 0) return;

    const existingIndex = payments.findIndex((p) => p.method === method);

    if (existingIndex >= 0) {
      const updated = [...payments];
      updated[existingIndex].amount += amount;
      setPayments(updated);
    } else {
      setPayments([...payments, { method, amount }]);
    }

    setDisplayAmount("");
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (getTotalPaid() === 0) {
      alert("Vui lòng nhập số tiền thanh toán");
      return;
    }
    onConfirm(payments);
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, "");
    if (/^\d*$/.test(value)) {
      setDisplayAmount(value ? parseInt(value).toLocaleString() : "");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Thanh toán nhiều phương thức
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg">Số tiền</span>
            <span className="text-2xl font-bold text-blue-600">
              {getTotalPaid().toLocaleString()}
            </span>
          </div>

          <input
            type="text"
            value={displayAmount}
            onChange={handleAmountChange}
            placeholder="Nhập số tiền"
            className="w-full border rounded-lg px-4 py-3 text-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="border rounded-lg py-2 hover:bg-gray-100">
                {amount.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {(
              Object.keys(methodLabels) as Array<keyof typeof methodLabels>
            ).map((method) => (
              <button
                key={method}
                onClick={() => handleMethodClick(method)}
                className="border rounded-lg py-3 hover:bg-blue-50 hover:border-blue-500">
                {methodLabels[method]}
              </button>
            ))}
          </div>

          {payments.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="font-medium mb-2">Danh sách thanh toán:</div>
              {payments.map((payment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span>{methodLabels[payment.method]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {payment.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleRemovePayment(index)}
                      className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-lg">
              <span>Khách cần trả:</span>
              <span className="font-semibold text-blue-600">
                {totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-lg">
              <span>Khách thanh toán:</span>
              <span className="font-semibold text-green-600">
                {getTotalPaid().toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-3 hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700">
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
