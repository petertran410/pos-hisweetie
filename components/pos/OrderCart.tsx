"use client";

import { CustomerSearch } from "./CustomerSearch";
import { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import {
  MapPin,
  User,
  Phone,
  House,
  MoreVertical,
  Check,
  ChevronDown,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MultiPaymentModal } from "./MultiPaymentModal";
import { DeliveryAddressDropdown } from "./DeliveryAddressDropdown";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { UnitPicker } from "./UnitPicker";

interface OrderCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  selectedPriceBookId: number | null;
  onSelectPriceBook: (priceBookId: number | null) => void;
  useCOD: boolean;
  onUseCODChange: (useCOD: boolean) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  onPaymentMethodsChange?: (
    methods: Array<{ method: string; amount: number }>
  ) => void;
  onCreateOrder: (payments?: Array<{ method: string; amount: number }>) => void;
  onSaveOrder: (payments?: Array<{ method: string; amount: number }>) => void;
  onCreateInvoice?: () => void;
  discount: number;
  discountRatio: number;
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
  isEditMode?: boolean;
  existingOrder?: any;
  documentType?: "order" | "invoice";
  onSelectAddress?: (address: any) => void;
  selectedAddressId?: number | null;
  soldById: number | null;
  onSellerChange: (id: number | null) => void;
  canEditSeller?: boolean;
  canViewPayment?: boolean;
  canEditPayment?: boolean;
  canCreateInvoice?: boolean;
  className?: string;
}

function SellerDropdown({
  users,
  soldById,
  currentUserId,
  currentUserName,
  onChange,
}: {
  users: Array<{ id: number; name: string }>;
  soldById: number | null;
  currentUserId: number;
  currentUserName: string;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const effectiveId = soldById ?? currentUserId;
  const selected = users.find((u) => u.id === effectiveId);
  const displayName = selected?.name ?? currentUserName;
  const isOverridden = soldById !== null && soldById !== currentUserId;

  return (
    <div ref={ref} className="relative min-w-[120px]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-1 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span
            className={`truncate ${
              isOverridden ? "text-blue-600 font-medium" : "text-gray-700"
            }`}>
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOverridden && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <XIcon className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {users.map((u, idx) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(
                  u.id === currentUserId && soldById === null ? null : u.id
                );
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                u.id === effectiveId ? "bg-blue-50" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="flex-1 truncate">{u.name}</span>
              {u.id === effectiveId && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderCart({
  cartItems,
  selectedCustomer,
  onSelectCustomer,
  selectedPriceBookId,
  onSelectPriceBook,
  useCOD,
  onUseCODChange,
  paymentAmount,
  onPaymentAmountChange,
  onPaymentMethodsChange,
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
  onSelectAddress,
  selectedAddressId,
  soldById,
  onSellerChange,
  canEditSeller = true,
  canViewPayment = true,
  canEditPayment = true,
  canCreateInvoice = true,
  className,
}: OrderCartProps) {
  const { data: usersForFilter = [] } = useUsersForFilter();
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

    if (onPaymentMethodsChange) {
      onPaymentMethodsChange(payments);
    }
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

    if (isEditMode && existingOrder) {
      const currentPaidAmount = Number(existingOrder.paidAmount || 0);
      const totalPaid = currentPaidAmount + paymentAmount;
      const newDebt = calculateTotal() - totalPaid;
      return Math.max(0, newDebt);
    }

    return Math.max(0, calculateTotal() - paymentAmount);
  };

  const displayDebt = (() => {
    if (useCOD) return calculateTotal();
    if (isEditMode && existingOrder) {
      return (
        calculateTotal() -
        (Number(existingOrder.paidAmount || 0) + paymentAmount)
      );
    }
    return calculateTotal() - paymentAmount;
  })();

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
    <div
      className={className ?? "w-[40%] h-full bg-white border-l flex flex-col"}>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="pl-2 lg:pl-3 pr-2 lg:pr-3 pt-2 lg:pt-3 pb-1 space-y-1.5 lg:space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canEditSeller ? (
                <SellerDropdown
                  users={usersForFilter}
                  soldById={soldById}
                  currentUserId={user?.id ?? 0}
                  currentUserName={user?.name ?? ""}
                  onChange={onSellerChange}
                />
              ) : (
                <span className="text-sm text-gray-600">{user?.name}</span>
              )}
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
          <div className="pl-2 lg:pl-3 pr-2 lg:pr-3 pb-2 lg:pb-3 space-y-1.5 lg:space-y-2 flex-1">
            {selectedCustomer.addresses &&
              selectedCustomer.addresses.length > 1 && (
                <DeliveryAddressDropdown
                  addresses={selectedCustomer.addresses}
                  selectedAddressId={selectedAddressId}
                  onSelect={(addr) => onSelectAddress?.(addr)}
                />
              )}

            <div className="border rounded-xl shadow-sm p-2 lg:p-3 space-y-1.5 lg:space-y-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] text-blue-500 flex-shrink-0" />
                <span className="text-sm lg:text-[16px]">
                  {selectedBranch?.address || ""}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <House className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] flex-shrink-0" />
                <span className="text-sm lg:text-[16px]">
                  {deliveryInfo.detailAddress}, {deliveryInfo.locationName},{" "}
                  {deliveryInfo.wardName}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <User className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] text-green-500 flex-shrink-0" />
                <span className="text-sm lg:text-[16px]">
                  {deliveryInfo.receiver || ""}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] text-gray-400 flex-shrink-0" />
                <span className="text-sm lg:text-[16px]">
                  {deliveryInfo.contactNumber || ""}
                </span>
              </div>
            </div>

            <div className="border rounded-xl shadow-sm p-2 lg:p-3">
              <div className="flex items-center gap-1.5 flex-wrap py-1 lg:py-2">
                <span className="text-sm lg:text-base flex-shrink-0">📦</span>
                <input
                  type="number"
                  value={deliveryInfo.weight || ""}
                  onChange={(e) =>
                    handleDeliveryChange("weight", Number(e.target.value))
                  }
                  placeholder="500"
                  className="w-14 text-sm lg:text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <UnitPicker
                  value={deliveryInfo.weightUnit || "g"}
                  options={[{ value: "g", label: "gram" }]}
                  onChange={(v) => handleDeliveryChange("weightUnit", v)}
                />
                <input
                  type="number"
                  value={deliveryInfo.length || 10}
                  onChange={(e) =>
                    handleDeliveryChange("length", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-sm lg:text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number"
                  value={deliveryInfo.width || 10}
                  onChange={(e) =>
                    handleDeliveryChange("width", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-sm lg:text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number"
                  value={deliveryInfo.height || 10}
                  onChange={(e) =>
                    handleDeliveryChange("height", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-sm lg:text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
                <select className="text-sm hidden lg:block lg:text-md bg-transparent outline-none">
                  <option>cm</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 py-1 lg:py-2">
                <span className="text-sm lg:text-md text-gray-700">
                  Ghi chú cho bưu tá
                </span>
              </div>
              <textarea
                value={deliveryInfo.noteForDriver || ""}
                onChange={(e) =>
                  handleDeliveryChange(
                    "noteForDriver",
                    e.target.value.slice(0, 1000)
                  )
                }
                maxLength={1000}
                placeholder="Nhập ghi chú..."
                className="w-full text-sm lg:text-md border rounded-xl p-2 outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5 lg:p-3 space-y-2 lg:space-y-2.5 flex-shrink-0 border mr-2 lg:mr-3 ml-2 lg:ml-3 mb-2 lg:mb-3 rounded-xl shadow-sm">
        {/* <div className="flex items-center justify-between">
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
        </div> */}

        <div className="flex items-center justify-between text-sm lg:text-md">
          <span>Khách cần trả</span>
          <span className="font-semibold">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        {canViewPayment && (
          <div className="flex items-center justify-between text-sm lg:text-md">
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span>Khách thanh toán</span>
              {canEditPayment && (
                <button
                  onClick={() => setShowMultiPaymentModal(true)}
                  className="p-1 lg:p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
              {canEditPayment ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={paymentDisplayValue}
                    onChange={handlePaymentInputChange}
                    onBlur={handlePaymentInputBlur}
                    placeholder="Nhập số tiền"
                    className="border rounded-xl px-2 lg:px-3 py-1 lg:py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 lg:w-32"
                  />
                </div>
              ) : null}
            </div>
            <span className="font-semibold">
              {paymentAmount.toLocaleString()}
            </span>
          </div>
        )}

        {isEditMode && existingOrder && (
          <div className="flex items-center justify-between text-sm lg:text-md">
            <span>Tổng đã thanh toán:</span>
            <span className="font-semibold">
              {(
                Number(existingOrder.paidAmount || 0) + paymentAmount
              ).toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm lg:text-md">
          <span>Công nợ</span>
          <span className="font-semibold">{displayDebt.toLocaleString()}</span>
        </div>

        {isEditMode ? (
          <div className="flex gap-4">
            {canCreateInvoice && (
              <button
                onClick={onCreateInvoice}
                disabled={cartItems.length === 0}
                className="w-full bg-blue-600 text-white py-2.5 lg:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm lg:text-base">
                TẠO HÓA ĐƠN
              </button>
            )}
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
          </div>
        ) : documentType === "invoice" ? (
          <button
            onClick={onCreateInvoice}
            disabled={cartItems.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
            TẠO HÓA ĐƠN
          </button>
        ) : (
          <button
            onClick={() =>
              onCreateOrder(
                paymentMethods.length > 0 ? paymentMethods : undefined
              )
            }
            disabled={cartItems.length === 0}
            className="w-full bg-blue-600 text-white py-2.5 lg:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm lg:text-base">
            Tạo đơn hàng
          </button>
        )}
      </div>
      {showMultiPaymentModal && canEditPayment && (
        <MultiPaymentModal
          isOpen={showMultiPaymentModal}
          onClose={() => setShowMultiPaymentModal(false)}
          totalAmount={calculateTotal()}
          onConfirm={handleMultiPaymentConfirm}
        />
      )}
    </div>
  );
}
