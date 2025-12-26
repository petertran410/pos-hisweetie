"use client";

import { CustomerSearch } from "./CustomerSearch";
import { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { X, MapPin, User, Phone, House, MapPinHouse } from "lucide-react";
import { useState } from "react";

interface OrderCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  useCOD: boolean;
  onUseCODChange: (useCOD: boolean) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  onCreateOrder: () => void;
  onSaveOrder?: () => void;
  onCreateInvoice?: () => void;
  discount: number;
  discountRatio: number;
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
  isEditMode?: boolean;
  existingOrder?: any;
  documentType?: "order" | "invoice";
}

export function OrderCart({
  cartItems,
  selectedCustomer,
  onSelectCustomer,
  useCOD,
  onUseCODChange,
  paymentAmount,
  onPaymentAmountChange,
  onCreateOrder,
  onSaveOrder,
  onCreateInvoice,
  discount,
  discountRatio,
  deliveryInfo,
  onDeliveryInfoChange,
  isEditMode = false,
  existingOrder,
  documentType,
}: OrderCartProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const [paymentDisplayValue, setPaymentDisplayValue] = useState("");

  const formatNumber = (value: number): string => {
    if (!value) return "";
    return value.toLocaleString("en-US");
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
      (sum, item) => sum + item.quantity * item.price - item.discount,
      0
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount - (subtotal * discountRatio) / 100;
  };

  const calculateDebt = () => {
    if (useCOD) return calculateTotal();

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
                  value={deliveryInfo.noteForDriver}
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
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCOD}
                onChange={(e) => onUseCODChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <span className="font-semibold text-md">
            {useCOD ? calculateTotal().toLocaleString() : "0"}
          </span>
        </div>

        <div className="flex items-center justify-between text-md">
          <span>Khách cần trả</span>
          <span className="font-semibold">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        {!useCOD && (
          <>
            <div className="flex items-center justify-between text-md">
              <div>
                <span className="mr-1">
                  {isEditMode ? "Khách trả thêm:" : "Khách đã trả:"}
                </span>
                <input
                  type="text"
                  value={paymentDisplayValue}
                  onChange={handlePaymentInputChange}
                  onBlur={handlePaymentInputBlur}
                  placeholder="Nhập số tiền"
                  className="border rounded-xl px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <span className="font-semibold">
                {paymentAmount.toLocaleString()}
              </span>
            </div>

            {isEditMode && existingOrder && (
              <div className="flex items-center justify-between text-md bg-green-50 px-3 py-2 rounded">
                <span className="text-green-700">Tổng khách đã trả:</span>
                <span className="font-semibold text-green-700">
                  {(
                    Number(existingOrder.paidAmount || 0) + paymentAmount
                  ).toLocaleString()}
                </span>
              </div>
            )}

            {calculateDebt() > 0 && (
              <div className="flex items-center justify-between text-md">
                <span>Công nợ</span>
                <span className="font-semibold">
                  {calculateDebt().toLocaleString()}
                </span>
              </div>
            )}

            {!isEditMode && paymentAmount > calculateTotal() && (
              <div className="flex items-center justify-between text-md">
                <span>Tiền thừa trả khách</span>
                <span className="font-semibold">
                  {(paymentAmount - calculateTotal()).toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        {useCOD && (
          <div className="flex items-center justify-between text-md">
            <span>Tính vào công nợ</span>
            <span className="font-semibold">
              {calculateTotal().toLocaleString()}
            </span>
          </div>
        )}

        {isEditMode ? (
          <div className="flex gap-4">
            <button
              onClick={onCreateInvoice}
              disabled={cartItems.length === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
              HÓA ĐƠN
            </button>
            <button
              onClick={onSaveOrder}
              disabled={cartItems.length === 0}
              className="w-full bg-orange-400 text-white py-3 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
              LƯU
            </button>
          </div>
        ) : (
          <button
            onClick={onCreateOrder}
            disabled={cartItems.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
            {documentType === "invoice" ? "Tạo hóa đơn" : "Tạo đơn hàng"}
          </button>
        )}
      </div>
    </div>
  );
}
