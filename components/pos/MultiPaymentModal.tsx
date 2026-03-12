"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";

interface PaymentMethod {
  method: "cash" | "transfer" | "card" | "ewallet" | "voucher";
  amount: number;
  accountId?: number;
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
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<
    PaymentMethod["method"] | null
  >(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: bankAccounts } = useBankAccountsForPayment();

  const quickAmounts = [3000, 4000, 5000, 10000, 20000, 50000, 100000, 200000];

  const methodLabels = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    card: "Thẻ",
    ewallet: "Ví",
    voucher: "Voucher",
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const handleQuickAmount = (amount: number) => {
    setDisplayAmount(amount.toLocaleString());
  };

  const needsBankAccount = (method: PaymentMethod["method"]) => {
    return ["transfer", "card", "ewallet"].includes(method);
  };

  const handleMethodClick = (method: PaymentMethod["method"]) => {
    const amount = parseFloat(displayAmount.replace(/,/g, "")) || 0;
    if (amount <= 0) return;

    if (needsBankAccount(method)) {
      setCurrentMethod(method);
      setShowAccountDropdown(true);
      return;
    }

    addPayment(method, amount, null);
  };

  const addPayment = (
    method: PaymentMethod["method"],
    amount: number,
    accountId: number | null
  ) => {
    const existingIndex = payments.findIndex(
      (p) => p.method === method && p.accountId === accountId
    );

    if (existingIndex >= 0) {
      const updated = [...payments];
      updated[existingIndex].amount += amount;
      setPayments(updated);
    } else {
      setPayments([
        ...payments,
        { method, amount, accountId: accountId || undefined },
      ]);
    }

    setDisplayAmount("");
    setSelectedAccountId(null);
    setCurrentMethod(null);
  };

  const handleAccountSelect = (accountId: number) => {
    if (!currentMethod) return;

    const amount = parseFloat(displayAmount.replace(/,/g, "")) || 0;
    if (amount <= 0) return;

    addPayment(currentMethod, amount, accountId);
    setShowAccountDropdown(false);
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

  const getAccountDisplay = (accountId?: number) => {
    if (!accountId || !bankAccounts) return "";
    const account = bankAccounts.find((a: any) => a.id === accountId);
    if (!account) return "";
    return `${account.bankCode} - ${account.accountNumber} - ${account.accountHolder}`;
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

          {showAccountDropdown && currentMethod && (
            <div ref={dropdownRef} className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium mb-2">
                Chọn tài khoản thanh toán:
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bankAccounts && bankAccounts.length > 0 ? (
                  bankAccounts.map((account: any) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className="w-full text-left px-3 py-2 border rounded hover:bg-white hover:border-blue-500 transition-colors">
                      <div className="font-medium text-sm">
                        {account.bankCode} - {account.accountNumber}
                      </div>
                      <div className="text-xs text-gray-600">
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
              <button
                onClick={() => {
                  setShowAccountDropdown(false);
                  setCurrentMethod(null);
                }}
                className="mt-2 w-full py-2 text-sm text-gray-600 hover:text-gray-800">
                Đóng
              </button>
            </div>
          )}

          {payments.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="font-medium mb-2">Khách cần trả</div>
              <div className="text-2xl font-bold text-blue-600 mb-3">
                {totalAmount.toLocaleString()}
              </div>

              <div className="font-medium mb-2">Danh sách thanh toán:</div>
              {payments.map((payment, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {methodLabels[payment.method]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {payment.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="text-red-500 hover:text-red-700 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {payment.accountId && (
                    <div className="text-sm text-gray-600">
                      {getAccountDisplay(payment.accountId)}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t mt-3">
                <div className="flex items-center justify-between font-medium">
                  <span>Khách thanh toán</span>
                  <span className="text-lg text-green-600">
                    {getTotalPaid().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
