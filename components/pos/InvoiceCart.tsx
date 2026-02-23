"use client";

import { CustomerSearch } from "./CustomerSearch";
import { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { MapPin, User, Phone, House, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { MultiPaymentModal } from "./MultiPaymentModal";

interface InvoiceCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  useCOD: boolean;
  selectedPriceBookId: number | null;
  onSelectPriceBook: (priceBookId: number | null) => void;
  onUseCODChange: (useCOD: boolean) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  onCreateOrder: (payments?: Array<{ method: string; amount: number }>) => void;
  onSaveOrder: (payments?: Array<{ method: string; amount: number }>) => void;
  onPayment?: () => void;
  discount: number;
  discountRatio: number;
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
  isEditMode?: boolean;
  isCreatingFromOrder?: boolean;
  existingOrder?: any;
  documentType?: "order" | "invoice";
}

export function InvoiceCart({
  cartItems,
  selectedCustomer,
  onSelectCustomer,
  selectedPriceBookId,
  onSelectPriceBook,
  useCOD,
  onUseCODChange,
  paymentAmount,
  onPaymentAmountChange,
  onCreateOrder,
  onSaveOrder,
  onPayment,
  discount,
  discountRatio,
  deliveryInfo,
  onDeliveryInfoChange,
  isEditMode = false,
  isCreatingFromOrder = false,
  existingOrder,
  documentType,
}: InvoiceCartProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const [paymentDisplayValue, setPaymentDisplayValue] = useState("");
  const [showMultiPaymentModal, setShowMultiPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{
      method: string;
      amount: number;
    }>
  >([]);

  useEffect(() => {
    if (isEditMode && existingOrder && paymentAmount > 0) {
      setPaymentDisplayValue(formatNumber(paymentAmount));
    }
  }, [isEditMode, existingOrder, paymentAmount]);

  const formatNumber = (value: number): string => {
    if (!value) return "";
    return value.toLocaleString("en-US");
  };

  const handleMultiPaymentConfirm = (
    payments: Array<{
      method: string;
      amount: number;
    }>
  ) => {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    setPaymentMethods(payments);
    onPaymentAmountChange(total);
    setPaymentDisplayValue(total.toLocaleString());
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const onlyNumbers = inputValue.replace(/[^\d]/g, "");

    if (onlyNumbers === "") {
      setPaymentDisplayValue("");
      onPaymentAmountChange(0);
      return;
    }

    const numericValue = parseInt(onlyNumbers, 10);
    onPaymentAmountChange(numericValue);
    setPaymentDisplayValue(formatNumber(numericValue));
  };

  const handlePaymentInputBlur = () => {
    if (paymentAmount === 0) {
      setPaymentDisplayValue("");
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + (item.price - item.discount) * item.quantity,
      0
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount - (subtotal * discountRatio) / 100;
  };

  const calculateDebt = () => {
    if (useCOD) return calculateTotal();

    if (isCreatingFromOrder && existingOrder) {
      const hasExistingInvoices = (existingOrder.invoices || []).some(
        (inv: any) => inv.status !== 5
      );
      const isFirstInvoice = !hasExistingInvoices;

      if (isFirstInvoice) {
        const currentPaidAmount = Number(existingOrder.paidAmount || 0);
        const totalPaid = currentPaidAmount + paymentAmount;
        const newDebt = calculateTotal() - totalPaid;
        return Math.max(0, newDebt);
      } else {
        const newDebt = calculateTotal() - paymentAmount;
        return Math.max(0, newDebt);
      }
    }

    if (isEditMode && existingOrder) {
      const currentPaidAmount = Number(existingOrder.paidAmount || 0);
      const totalPaid = currentPaidAmount + paymentAmount;
      const newDebt = calculateTotal() - totalPaid;
      return Math.max(0, newDebt);
    }

    return Math.max(0, calculateTotal() - paymentAmount);
  };

  const formatDate = () => {
    const now = new Date();
    return `${now.getDate()}/${
      now.getMonth() + 1
    }/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  };

  const handleDeliveryChange = (field: keyof DeliveryInfo, value: any) => {
    onDeliveryInfoChange({
      ...deliveryInfo,
      [field]: value,
    });
  };

  return (
    <div className="w-[40%] h-full bg-white border-l flex flex-col ">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-3 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 text-sm border rounded-md hover:bg-gray-50">
                {user?.name || "Admin"}
              </button>
            </div>
            <div className="text-xs text-gray-600">{formatDate()}</div>
          </div>

          <CustomerSearch
            selectedCustomer={selectedCustomer}
            onSelectCustomer={onSelectCustomer}
            selectedPriceBookId={selectedPriceBookId}
            onSelectPriceBook={onSelectPriceBook}
          />
        </div>

        {selectedCustomer && (
          <div className="pl-3 pr-3 pb-3 space-y-2 flex-1">
            <div className="border rounded-xl shadow-sm p-3 space-y-5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-lg">{selectedBranch?.address || ""}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <User className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-lg">{deliveryInfo.receiver || ""}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />{" "}
                <span className="text-lg">
                  {deliveryInfo.contactNumber || ""}
                </span>
              </div>
              <div className="flex gap-1.5">
                <House className="w-5 h-5 flex-shrink-0" />
                <span>
                  {deliveryInfo.detailAddress}, {deliveryInfo.locationName},{" "}
                  {deliveryInfo.wardName}
                </span>
              </div>
            </div>

            <div className="border rounded-xl shadow-sm p-3">
              <div className="flex items-center gap-1.5 flex-wrap py-2">
                <span className="text-base flex-shrink-0">📦</span>
                <input
                  type="number"
                  value={deliveryInfo.weight || ""}
                  onChange={(e) =>
                    handleDeliveryChange("weight", Number(e.target.value))
                  }
                  placeholder="500"
                  className="w-14 text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <select className="text-md bg-transparent outline-none">
                  <option>gram</option>
                  <option>kg</option>
                </select>
                <input
                  type="number"
                  value={deliveryInfo.length || 10}
                  onChange={(e) =>
                    handleDeliveryChange("length", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number"
                  value={deliveryInfo.width || 10}
                  onChange={(e) =>
                    handleDeliveryChange("width", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number"
                  value={deliveryInfo.height || 10}
                  onChange={(e) =>
                    handleDeliveryChange("height", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <select className="text-md bg-transparent outline-none">
                  <option>cm</option>
                  <option>m</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 py-2">
                <input
                  type="checkbox"
                  checked={deliveryInfo.noteForDriver !== ""}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      handleDeliveryChange("noteForDriver", "");
                    } else {
                      handleDeliveryChange("noteForDriver", " ");
                    }
                  }}
                  className="w-3.5 h-3.5 text-blue-600 rounded"
                />
                <span className="text-md text-gray-700">
                  Ghi chú cho bưu tá
                </span>
              </div>
              {deliveryInfo.noteForDriver !== "" && (
                <textarea
                  value={deliveryInfo.noteForDriver || ""}
                  onChange={(e) =>
                    handleDeliveryChange("noteForDriver", e.target.value)
                  }
                  placeholder="Nhập ghi chú..."
                  className="w-full text-md border rounded-xl p-2 outline-none focus:border-blue-500 resize-none"
                  rows={3}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2.5 flex-shrink-0 border mr-3 ml-3 mb-3 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-md">Thu hộ tiền (COD)</span>
            <label className="relative inline-flex items-center cursor-not-allowed opacity-60">
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-blue-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
          <span className="font-semibold text-md">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-md">
          <span>Khách cần trả</span>
          <span className="font-semibold">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-md">
          <div className="flex items-center gap-2">
            <span>{isEditMode ? "Khách trả thêm:" : "Khách đã trả:"}</span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={paymentDisplayValue}
                onChange={handlePaymentInputChange}
                onBlur={handlePaymentInputBlur}
                placeholder="Nhập số tiền"
                className="border rounded-xl px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
              <button
                onClick={() => setShowMultiPaymentModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <span className="font-semibold">
            {paymentAmount.toLocaleString()}
          </span>
        </div>

        {(isEditMode || isCreatingFromOrder) &&
          existingOrder &&
          (() => {
            const hasExistingInvoices = (existingOrder.invoices || []).some(
              (inv: any) => inv.status !== 5
            );
            const isFirstInvoice = !hasExistingInvoices;

            return (
              isFirstInvoice && (
                <div className="flex items-center justify-between text-md">
                  <span>Tổng khách đã trả:</span>
                  <span className="font-semibold">
                    {(
                      Number(existingOrder.paidAmount || 0) + paymentAmount
                    ).toLocaleString()}
                  </span>
                </div>
              )
            );
          })()}

        {calculateDebt() > 0 && (
          <div className="flex items-center justify-between text-md">
            <span>Công nợ</span>
            <span className="font-semibold">
              {calculateDebt().toLocaleString()}
            </span>
          </div>
        )}

        {!isEditMode &&
          !isCreatingFromOrder &&
          paymentAmount > calculateTotal() && (
            <div className="flex items-center justify-between text-md">
              <span>Tiền thừa trả khách</span>
              <span className="font-semibold">
                {(paymentAmount - calculateTotal()).toLocaleString()}
              </span>
            </div>
          )}

        {isCreatingFromOrder ? (
          <button
            onClick={onPayment}
            disabled={cartItems.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
            THANH TOÁN
          </button>
        ) : isEditMode ? (
          <button
            onClick={() =>
              onSaveOrder(
                paymentMethods.length > 0 ? paymentMethods : undefined
              )
            }
            disabled={cartItems.length === 0}
            className="w-full bg-orange-400 text-white py-3 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
            LƯU
          </button>
        ) : (
          <button
            onClick={() =>
              onCreateOrder(
                paymentMethods.length > 0 ? paymentMethods : undefined
              )
            }
            disabled={cartItems.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
            {documentType === "invoice" ? "Tạo hóa đơn" : "Tạo đơn hàng"}
          </button>
        )}
      </div>

      <MultiPaymentModal
        isOpen={showMultiPaymentModal}
        onClose={() => setShowMultiPaymentModal(false)}
        totalAmount={calculateTotal()}
        onConfirm={handleMultiPaymentConfirm}
      />
    </div>
  );
}
