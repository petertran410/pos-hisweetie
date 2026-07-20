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
   */
  foreignTotalAmount?: number;
  /**
   * Tổng tiền đã trả trước đó bằng ngoại tệ (CNY). Nếu được truyền, modal sẽ
   * dùng trực tiếp số này để tính "Cần trả" thay vì quy đổi từ previouslyPaid
   * (VND) qua tỉ giá đang nhập — tránh nợ CNY bị nhảy số khi user sửa tỉ giá.
   */
  previouslyPaidForeign?: number;
  /**
   * Tỉ giá snapshot (chỉ làm placeholder cho ô input — KHÔNG tự dùng để
   * tính). User bắt buộc phải nhập lại tỉ giá thực tế tại thời điểm trả.
   * Cũng dùng làm fallback quy đổi previouslyPaid (VND) → CNY khi parent
   * không truyền previouslyPaidForeign (legacy).
   */
  defaultExchangeRate?: number;
  /**
   * Tiền tệ của phiếu — dùng để xác định mode nhập tiền trong modal.
   * Khi là "CNY": hiện tab chuyển đơn vị nhập (CNY/VND) + ô tỉ giá; onConfirm
   * luôn trả amount=VND + foreignAmount=CNY + exchangeRate.
   */
  currency?: "VND" | "CNY";
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
  previouslyPaidForeign,
  defaultExchangeRate,
  currency = "VND",
  onConfirm,
}: SupplierPaymentModalProps) {
  const needToPay = totalAmount - previouslyPaid;
  const [amount, setAmount] = useState("");
  // Đơn vị đang nhập trong ô "Thanh toán". Chỉ có ý nghĩa khi phiếu CNY —
  // cho phép user gõ trực tiếp bằng CNY hoặc VND, dòng snapshot hiển thị
  // đơn vị "bên kia". Mặc định CNY (giống hành vi cũ).
  const [inputCurrency, setInputCurrency] = useState<"CNY" | "VND">("CNY");
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

  // Reset tỉ giá về default + tab nhập về CNY + xoá số tiền khi mở modal mới
  useEffect(() => {
    if (isOpen) {
      setExchangeRate(
        defaultExchangeRate ? formatExchangeRateInput(defaultExchangeRate) : ""
      );
      setInputCurrency("CNY");
      setAmount("");
      setMethod("cash");
      setSelectedAccountId(null);
    }
  }, [isOpen, defaultExchangeRate]);

  if (!isOpen || !mounted) return null;

  // Khi currency === "CNY": user nhập CNY trực tiếp. Modal convert → VND
  // cho onConfirm (CashFlow lưu amount bằng VND).
  const isCNYMode = currency === "CNY";

  // Tab CNY cho phép tối đa 2 chữ số thập phân; tab VND / phiếu VND thuần chỉ
  // nhận số nguyên (phân tách nghìn) như hành vi cũ.
  const allowDecimalInput = isCNYMode && inputCurrency === "CNY";

  const handleAmountChange = (value: string) => {
    if (allowDecimalInput) {
      const normalized = value.replace(/,/g, "");
      if (normalized === "") {
        setAmount("");
        return;
      }
      if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return;
      setAmount(formatExchangeRateInput(normalized));
      return;
    }
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

  // Tỉ giá đã parse để tính toán. Ưu tiên tỉ giá user nhập; nếu bỏ trống thì
  // dùng tỉ giá hệ thống đề xuất (defaultExchangeRate).
  const parsedAmount = parseNumberInput(amount);
  const parsedRate = parseExchangeRateInput(exchangeRate);
  const effectiveRate =
    parsedRate > 0
      ? parsedRate
      : defaultExchangeRate && defaultExchangeRate > 0
      ? defaultExchangeRate
      : 0;

  // Đổi tab đơn vị nhập: quy đổi số đang có trong ô sang đơn vị mới theo
  // effectiveRate (giữ nguyên "giá trị thật"). Ô rỗng hoặc rate ≤ 0 → chỉ
  // đổi tab, không convert.
  const handleInputCurrencyChange = (next: "CNY" | "VND") => {
    if (next === inputCurrency) return;
    if (parsedAmount > 0 && effectiveRate > 0) {
      if (next === "VND") {
        // CNY → VND: số nguyên.
        const converted = Math.round(parsedAmount * effectiveRate);
        setAmount(formatNumberInput(String(converted)));
      } else {
        // VND → CNY: giữ 2 chữ số thập phân.
        const converted = parsedAmount / effectiveRate;
        setAmount(formatExchangeRateInput(converted.toFixed(2)));
      }
    }
    setInputCurrency(next);
  };

  // Chuẩn hoá số tiền đang nhập về cả 2 đơn vị — "tiền nào ra tiền đó".
  // paymentCNY: giá trị ngoại tệ (lưu OrderSupplierPayment.foreignAmount).
  // paymentVND: giá trị nội tệ (lưu CashFlow.amount).
  const paymentCNY = !isCNYMode
    ? 0
    : inputCurrency === "CNY"
      ? parsedAmount
      : effectiveRate > 0
        ? parsedAmount / effectiveRate
        : 0;
  const paymentVND = !isCNYMode
    ? parsedAmount
    : inputCurrency === "VND"
      ? parsedAmount
      : effectiveRate > 0
        ? parsedAmount * effectiveRate
        : 0;

  // Snapshot dòng "Thành tiền" luôn hiển thị đơn vị "bên kia" so với tab.
  // Tab CNY → hiển thị VND; tab VND → hiển thị CNY.
  const snapshotValue = inputCurrency === "CNY" ? paymentVND : paymentCNY;
  const snapshotUnit = inputCurrency === "CNY" ? "VND" : "CNY";

  // Khi NCC nước ngoài, phần tổng kết dưới modal hiển thị theo CNY (tiền tệ
  // phiếu). foreignTotalAmount đã là CNY (từ calculateTotalCNY).
  //
  // "Đã trả CNY" / "Cần trả CNY" KHÔNG phụ thuộc tỉ giá user đang gõ trong
  // modal (tỉ giá TT chỉ dùng để quy lần trả hiện tại CNY↔VND). Ưu tiên
  // previouslyPaidForeign (sum foreignAmount từ parent); fallback legacy
  // chia previouslyPaid (VND) bằng defaultExchangeRate (tỉ giá phiếu),
  // KHÔNG dùng effectiveRate (tỉ giá đang sửa).
  const foreignTotal =
    isCNYMode && foreignTotalAmount != null
      ? foreignTotalAmount
      : isImportMode && defaultExchangeRate && defaultExchangeRate > 0
        ? totalAmount / defaultExchangeRate
        : 0;
  const foreignPreviouslyPaid =
    previouslyPaidForeign != null
      ? previouslyPaidForeign
      : isCNYMode || isImportMode
        ? defaultExchangeRate && defaultExchangeRate > 0
          ? previouslyPaid / defaultExchangeRate
          : 0
        : 0;
  const foreignNeedToPay = Math.max(0, foreignTotal - foreignPreviouslyPaid);
  const foreignRemaining = Math.max(0, foreignNeedToPay - paymentCNY);

  // Chỉ hiện snapshot khi phiếu CNY và có tỉ giá.
  const showForeignPreview = isCNYMode && effectiveRate > 0;

  const remaining = needToPay - paymentVND;

  const handleConfirm = () => {
    if (parsedAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (method === "transfer" && !selectedAccountId) {
      alert("Vui lòng chọn tài khoản ngân hàng");
      return;
    }

    if (isCNYMode) {
      // Phiếu CNY: tỉ giá bắt buộc (ưu tiên user nhập, fallback tỉ giá hệ
      // thống). Gửi cả VND (CashFlow) + CNY (OrderSupplierPayment.foreignAmount)
      // bất kể user đang nhập ở tab nào.
      if (effectiveRate <= 0) {
        alert("Vui lòng nhập tỉ giá quy đổi");
        return;
      }
      onConfirm(
        Math.round(paymentVND),   // VND để lưu vào CashFlow
        method,
        selectedAccountId ?? undefined,
        effectiveRate,
        paymentCNY                // CNY để lưu vào OrderSupplierPayment.foreignAmount
      );
    } else {
      onConfirm(
        paymentVND,
        method,
        selectedAccountId ?? undefined,
        undefined,
        undefined
      );
    }
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Thanh toán{isCNYMode ? ` (${inputCurrency})` : ""}
              </label>
              {/* Tab chuyển đơn vị nhập — chỉ hiện khi phiếu CNY. */}
              {isCNYMode && (
                <div className="flex gap-1 bg-gray-100 rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => handleInputCurrencyChange("CNY")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      inputCurrency === "CNY"
                        ? "bg-brand text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}>
                    CNY
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputCurrencyChange("VND")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      inputCurrency === "VND"
                        ? "bg-brand text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}>
                    VND
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder={
                isCNYMode
                  ? inputCurrency === "CNY"
                    ? "0.00"
                    : "0"
                  : "Nhập số tiền"
              }
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

          {/* Block Quy đổi — chỉ hiện khi currency = CNY. Tỉ giá bắt buộc nhập. */}
          {isCNYMode && (
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
                  Thành tiền (snapshot tại thời điểm TT)
                  {showForeignPreview ? ` ≈ ${snapshotUnit}:` : ":"}
                </span>
                <span className="font-semibold text-brand text-sm">
                  {showForeignPreview && parsedAmount > 0
                    ? snapshotUnit === "VND"
                      ? formatCurrency(Math.round(snapshotValue)) + " VND"
                      : new Intl.NumberFormat("vi-VN", {
                          maximumFractionDigits: 2,
                        }).format(snapshotValue) + " CNY"
                    : "—"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Cần trả nhà cung cấp</span>
              <span className="font-semibold text-brand">
                {isCNYMode
                  ? new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 2,
                    }).format(foreignNeedToPay) + " CNY"
                  : formatCurrency(needToPay)}
              </span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-gray-600">Còn nợ</span>
              <span className="font-semibold text-red-600">
                {isCNYMode
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
