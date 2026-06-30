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
  /**
   * true khi NCC nước ngoài — hiển thị thêm ô tỉ giá quy đổi bắt buộc
   * + preview "Thành tiền CNY" realtime. Khi false, modal giữ nguyên UX cũ.
   */
  isImportMode?: boolean;
  /**
   * Tổng cần trả bằng ngoại tệ (hiện tại CNY), dùng khi isImportMode=true.
   * Modal vẫn nhập số tiền VND, nhưng phần tổng kết dưới sẽ hiển thị theo CNY.
   */
  foreignTotalAmount?: number;
  /**
   * Tỉ giá snapshot (chỉ làm placeholder cho ô input — KHÔNG tự dùng để
   * tính). User bắt buộc phải nhập lại tỉ giá thực tế tại thời điểm trả.
   */
  defaultExchangeRate?: number;
  onConfirm: (
    amount: number,
    method: "cash" | "transfer" | "card",
    accountId?: number,
    exchangeRate?: number,
    foreignAmount?: number
  ) => void;
}

function formatExchangeRateInput(value: number | string | undefined): string {
  if (value == null || value === "") return "";
  const normalized = String(value).replace(/,/g, "");
  if (!/^\d*(?:\.\d*)?$/.test(normalized)) return "";

  const [integerPart = "", decimalPart] = normalized.split(".");
  const formattedInteger = integerPart
    ? new Intl.NumberFormat("en-US").format(Number(integerPart))
    : "";

  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart.slice(0, 2)}`;
  }

  return formattedInteger;
}

function parseExchangeRateInput(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

export function SupplierPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  previouslyPaid = 0,
  isImportMode = false,
  foreignTotalAmount,
  defaultExchangeRate,
  onConfirm,
}: SupplierPaymentModalProps) {
  const needToPay = totalAmount - previouslyPaid;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  // Tỉ giá user nhập tay (chỉ dùng khi isImportMode=true). Snapshot tại thời
  // điểm thanh toán — khác defaultExchangeRate (snapshot lúc đặt hàng).
  const [exchangeRate, setExchangeRate] = useState<string>(
    defaultExchangeRate ? formatExchangeRateInput(defaultExchangeRate) : ""
  );
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

  // Reset tỉ giá về default khi mở modal mới
  useEffect(() => {
    if (isOpen) {
      setExchangeRate(
        defaultExchangeRate ? formatExchangeRateInput(defaultExchangeRate) : ""
      );
    }
  }, [isOpen, defaultExchangeRate]);

  if (!isOpen || !mounted) return null;

  const handleAmountChange = (value: string) => {
    setAmount(formatNumberInput(value));
  };

  const handleExchangeRateChange = (value: string) => {
    const normalized = value.replace(/,/g, "");
    if (normalized === "") {
      setExchangeRate("");
      return;
    }
    if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return;
    setExchangeRate(formatExchangeRateInput(normalized));
  };

  // Tỉ giá đã parse để tính toán.
  const parsedAmount = parseNumberInput(amount);
  const parsedRate = parseExchangeRateInput(exchangeRate);
  const effectiveRate =
    parsedRate > 0
      ? parsedRate
      : defaultExchangeRate && defaultExchangeRate > 0
      ? defaultExchangeRate
      : 0;
  const foreignPreview = effectiveRate > 0 ? parsedAmount / effectiveRate : 0;

  // Khi NCC nước ngoài, phần tổng kết dưới modal hiển thị theo ngoại tệ
  // (CNY), dù ô thanh toán vẫn nhập bằng VND.
  const foreignTotal =
    isImportMode && foreignTotalAmount != null
      ? foreignTotalAmount
      : isImportMode && effectiveRate > 0
        ? totalAmount / effectiveRate
        : 0;
  const foreignPreviouslyPaid =
    isImportMode && effectiveRate > 0 ? previouslyPaid / effectiveRate : 0;
  const foreignNeedToPay = Math.max(0, foreignTotal - foreignPreviouslyPaid);
  const foreignRemaining = Math.max(0, foreignNeedToPay - foreignPreview);

  // Chỉ hiện preview khi NCC nước ngoài.
  const showForeignPreview = isImportMode && effectiveRate > 0;

  const remaining = needToPay - parsedAmount;

  const handleConfirm = () => {
    if (parsedAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (method === "transfer" && !selectedAccountId) {
      alert("Vui lòng chọn tài khoản ngân hàng");
      return;
    }

    let rate: number | undefined;
    let foreign: number | undefined;
    if (isImportMode) {
      // Tỉ giá bắt buộc nhập khi NCC nước ngoài (F4).
      if (parsedRate <= 0) {
        alert("Vui lòng nhập tỉ giá quy đổi");
        return;
      }
      rate = parsedRate;
      foreign = parsedAmount / parsedRate;
    }

    onConfirm(
      parsedAmount,
      method,
      selectedAccountId ?? undefined,
      rate,
      foreign
    );
    onClose();
  };

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
                      <>Chủ TK: {account.accountHolder}</>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Block Quy đổi — chỉ hiện khi NCC nước ngoài (F4: bắt buộc nhập). */}
          {isImportMode && (
            <div className="border border-brand/30 rounded-lg p-3 bg-brand/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  Tỉ giá quy đổi: <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={exchangeRate}
                  onChange={(e) => handleExchangeRateChange(e.target.value)}
                  placeholder={
                    defaultExchangeRate
                      ? formatExchangeRateInput(defaultExchangeRate)
                      : "Nhập tỉ giá VND/CNY"
                  }
                  className="flex-1 text-right text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  VND/CNY
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Thành tiền (snapshot tại thời điểm TT):
                </span>
                <span className="font-semibold text-brand text-sm">
                  {showForeignPreview
                    ? new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 2,
                      }).format(foreignPreview) + " CNY"
                    : "—"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Cần trả nhà cung cấp</span>
              <span className="font-semibold text-brand">
                {isImportMode
                  ? new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 2,
                    }).format(foreignNeedToPay) + " CNY"
                  : formatCurrency(needToPay)}
              </span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Còn nợ</span>
              <span className="font-semibold text-red-600">
                {isImportMode
                  ? new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 2,
                    }).format(foreignRemaining) + " CNY"
                  : formatCurrency(Math.max(0, remaining))}
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
