"use client";

import { CustomerSearch } from "./CustomerSearch";
import { CartItem, DeliveryInfo } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { X, MapPin, User, Phone } from "lucide-react";

interface OrderCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  useCOD: boolean;
  onUseCODChange: (useCOD: boolean) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  onCreateOrder: () => void;
  discount: number;
  deliveryInfo: DeliveryInfo;
  onDeliveryInfoChange: (info: DeliveryInfo) => void;
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
  discount,
  deliveryInfo,
  onDeliveryInfoChange,
}: OrderCartProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price - item.discount,
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discount;
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
    <div className="w-[40%] h-full bg-white border-l flex flex-col">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-3 border-b space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 text-sm border rounded hover:bg-gray-50">
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
          <div className="p-3 space-y-2 flex-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-lg">{selectedBranch?.address || ""}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <User className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-lg">{deliveryInfo.receiver || ""}</span>
              {/* <input
                type="text"
                value={deliveryInfo.receiver}
                onChange={(e) =>
                  handleDeliveryChange("receiver", e.target.value)
                }
                placeholder="Tên người nhận"
                className="flex-1 text-md bg-transparent outline-none"
              /> */}

              {/* <input
                type="text"
                value={deliveryInfo.contactNumber}
                onChange={(e) =>
                  handleDeliveryChange("contactNumber", e.target.value)
                }
                placeholder="Số điện thoại"
                className="w-28 text-sm bg-transparent outline-none"
              /> */}
            </div>

            <span className="flex items-center gap-1.5">
              <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />{" "}
              <span className="text-lg">
                {deliveryInfo.contactNumber || ""}
              </span>
            </span>
            <div className="flex flex-col gap-1.5">
              <span>{deliveryInfo.detailAddress}</span>
              <span>{deliveryInfo.locationName}</span>
              <span>{deliveryInfo.wardName}</span>
            </div>

            {/* <input
              type="text"
              value={deliveryInfo.detailAddress}
              onChange={(e) =>
                handleDeliveryChange("detailAddress", e.target.value)
              }
              placeholder="Địa chỉ chi tiết (Số nhà, ngõ, đường)"
              className="w-full text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none"
            /> */}

            {/* <input
              type="text"
              value={deliveryInfo.locationName}
              onChange={(e) =>
                handleDeliveryChange("locationName", e.target.value)
              }
              placeholder="Khu vực"
              className="w-full text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none"
            />

            <input
              type="text"
              value={deliveryInfo.wardName}
              onChange={(e) => handleDeliveryChange("wardName", e.target.value)}
              placeholder="Phường/Xã"
              className="w-full text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none"
            /> */}

            <div className="flex items-center gap-1.5 flex-wrap py-2">
              <span className="text-base flex-shrink-0">📦</span>
              <input
                type="number"
                value={deliveryInfo.weight || ""}
                onChange={(e) =>
                  handleDeliveryChange("weight", Number(e.target.value))
                }
                placeholder="500"
                className="w-14 text-sm text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
              />
              <select className="text-sm bg-transparent outline-none">
                <option>gram</option>
                <option>kg</option>
              </select>
              <input
                type="number"
                value={deliveryInfo.length || ""}
                onChange={(e) =>
                  handleDeliveryChange("length", Number(e.target.value))
                }
                placeholder="10"
                className="w-12 text-sm text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                value={deliveryInfo.width || ""}
                onChange={(e) =>
                  handleDeliveryChange("width", Number(e.target.value))
                }
                placeholder="10"
                className="w-12 text-sm text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                value={deliveryInfo.height || ""}
                onChange={(e) =>
                  handleDeliveryChange("height", Number(e.target.value))
                }
                placeholder="10"
                className="w-12 text-sm text-center bg-transparent border-b border-gray-200 py-0.5 outline-none"
              />
              <select className="text-sm bg-transparent outline-none">
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
              <span className="text-sm text-gray-700">Ghi chú cho bưu tá</span>
            </div>

            {deliveryInfo.noteForDriver !== "" && (
              <textarea
                value={deliveryInfo.noteForDriver}
                onChange={(e) =>
                  handleDeliveryChange("noteForDriver", e.target.value)
                }
                placeholder="Nhập ghi chú..."
                className="w-full text-sm border rounded p-2 outline-none focus:border-blue-500"
                rows={3}
              />
            )}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2.5 flex-shrink-0">
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
          <span className="font-semibold">
            {useCOD ? calculateTotal().toLocaleString() : "0"}
          </span>
        </div>

        {!useCOD && (
          <div className="flex items-center justify-between text-sm">
            <span>Tiền thừa trả khách</span>
            <span className="text-red-600">
              - {Math.max(0, paymentAmount - calculateTotal()).toLocaleString()}
            </span>
          </div>
        )}

        {useCOD && (
          <div className="flex items-center justify-between text-sm">
            <span>Tính vào công nợ</span>
            <span className="text-blue-600 font-medium">
              - {calculateTotal().toLocaleString()}
            </span>
          </div>
        )}

        {!useCOD && (
          <input
            type="number"
            value={paymentAmount || ""}
            onChange={(e) => onPaymentAmountChange(Number(e.target.value))}
            placeholder="Nhập số tiền thanh toán"
            className="w-full border rounded px-3 py-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        <button
          onClick={onCreateOrder}
          disabled={cartItems.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-base">
          ĐẶT HÀNG
        </button>
      </div>
    </div>
  );
}
