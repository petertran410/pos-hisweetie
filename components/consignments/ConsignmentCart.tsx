"use client";

import { CustomerSearch } from "@/components/pos/CustomerSearch";
import { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import {
  MapPin,
  User,
  Phone,
  House,
  Check,
  ChevronDown,
  XIcon,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeliveryAddressDropdown } from "@/components/pos/DeliveryAddressDropdown";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { UnitPicker } from "@/components/pos/UnitPicker";

interface ConsignmentCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  selectedPriceBookId: number | null;
  selectedPriceBookName?: string | null;
  onSelectPriceBook: (
    priceBookId: number | null,
    priceBookName: string | null
  ) => void;
  discount: number;
  discountRatio: number;
  onDiscountChange: (discount: number) => void;
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
  onSelectAddress?: (address: any) => void;
  selectedAddressId?: number | null;
  soldById: number | null;
  onSellerChange: (id: number | null) => void;
  consignStatus: string;
  onConsignStatusChange: (status: string) => void;
  onSubmit: () => void;
  isEditMode?: boolean;
  isSubmitting?: boolean;
  disabled?: boolean;
  canEditSeller?: boolean;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Phiếu tạm" },
  { value: "confirmed", label: "Đã xác nhận" },
];

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
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const effectiveId = soldById ?? currentUserId;
  const selected = users.find((u) => u.id === effectiveId);
  const displayName = selected?.name ?? currentUserName;
  const isOverridden = soldById !== null && soldById !== currentUserId;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative min-w-[140px] lg:min-w-[180px]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span
            className={`truncate ${
              isOverridden ? "text-brand font-medium" : "text-gray-700"
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
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px]">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm người bán..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u, idx) => (
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
                    u.id === effectiveId ? "bg-brand-soft" : "hover:bg-gray-50"
                  } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                  <span className="flex-1 truncate">{u.name}</span>
                  {u.id === effectiveId && (
                    <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConsignmentCart({
  cartItems,
  selectedCustomer,
  onSelectCustomer,
  selectedPriceBookId,
  selectedPriceBookName,
  onSelectPriceBook,
  discount,
  discountRatio,
  onDiscountChange,
  deliveryInfo,
  onDeliveryInfoChange,
  onSelectAddress,
  selectedAddressId,
  soldById,
  onSellerChange,
  consignStatus,
  onConsignStatusChange,
  onSubmit,
  isEditMode = false,
  isSubmitting = false,
  disabled = false,
  canEditSeller = true,
  className,
}: ConsignmentCartProps) {
  const { data: usersForFilter = [] } = useUsersForFilter();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const formatDate = () => {
    const now = new Date();
    return `${now.getDate()}/${
      now.getMonth() + 1
    }/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  };

  const calculateSubtotal = () =>
    cartItems.reduce(
      (sum, item) => sum + (item.price - item.discount) * item.quantity,
      0
    );

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const effectiveDiscount =
      discount > 0 ? discount : (subtotal * discountRatio) / 100;
    return subtotal - effectiveDiscount;
  };

  const handleDeliveryChange = (field: keyof DeliveryInfo, value: any) => {
    onDeliveryInfoChange({ ...deliveryInfo, [field]: value });
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
            selectedPriceBookName={selectedPriceBookName}
            onSelectPriceBook={onSelectPriceBook}
            cartItems={cartItems}
          />
        </div>

        {selectedCustomer && (
          <div className="pl-2 lg:pl-3 pr-2 lg:pr-3 pb-2 lg:pb-3 space-y-1.5 lg:space-y-2 flex-1">
            <p className="text-xs text-red-600 italic pl-1">
              Nợ: {Number(selectedCustomer.totalDebt).toLocaleString("vi-VN")}
            </p>
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
                <MapPin className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] text-brand flex-shrink-0" />
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
                  onChange={(e) =>
                    handleDeliveryChange("height", Number(e.target.value))
                  }
                  placeholder="10"
                  className="w-12 text-sm lg:text-md text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 py-1 lg:py-2">
                <span className="text-sm lg:text-md text-gray-700">
                  Ghi chú cho bưu tá
                </span>
              </div>
              <textarea
                value={deliveryInfo.noteForDriver || ""}
                disabled={disabled}
                onChange={(e) =>
                  handleDeliveryChange(
                    "noteForDriver",
                    e.target.value.slice(0, 1000)
                  )
                }
                maxLength={1000}
                placeholder="Nhập ghi chú..."
                className="w-full text-sm lg:text-md border rounded-xl p-2 outline-none focus:border-brand resize-none"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5 lg:p-3 space-y-2 lg:space-y-2.5 flex-shrink-0 border mr-2 lg:mr-3 ml-2 lg:ml-3 mb-2 lg:mb-3 rounded-xl shadow-sm">
        <div className="flex items-center justify-between text-sm lg:text-md">
          <span className="text-gray-600">Trạng thái</span>
          <select
            value={consignStatus}
            disabled={disabled}
            onChange={(e) => onConsignStatusChange(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100">
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-sm lg:text-md">
          <span>Tổng tiền hàng</span>
          <span className="font-semibold">
            {calculateSubtotal().toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm lg:text-md gap-2">
          <span>Giảm giá</span>
          <input
            type="text"
            value={discount ? discount.toLocaleString("en-US") : ""}
            disabled={disabled}
            onChange={(e) => {
              const onlyNumbers = e.target.value.replace(/[^\d]/g, "");
              onDiscountChange(onlyNumbers ? parseInt(onlyNumbers, 10) : 0);
            }}
            placeholder="0"
            className="border rounded-xl px-2 lg:px-3 py-1 lg:py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand w-28 disabled:bg-gray-100"
          />
        </div>

        <div className="flex items-center justify-between text-sm lg:text-md border-t pt-2">
          <span className="font-semibold">Tổng cộng</span>
          <span className="font-bold text-brand text-base">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        <button
          onClick={onSubmit}
          disabled={cartItems.length === 0 || isSubmitting || disabled}
          className="w-full bg-brand text-white py-2 lg:py-3 rounded-lg hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed font-medium lg:font-semibold text-xs lg:text-base">
          {isEditMode ? "Cập nhật phiếu ký gửi" : "Tạo phiếu ký gửi"}
        </button>
      </div>
    </div>
  );
}
