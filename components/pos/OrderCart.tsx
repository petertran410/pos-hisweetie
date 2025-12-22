"use client";

import { useState } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { CartItem } from "@/app/(dashboard)/ban-hang/page";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { X, Minus, Plus } from "lucide-react";

interface OrderCartProps {
  cartItems: CartItem[];
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  onUpdateItem: (productId: number, updates: Partial<CartItem>) => void;
  onRemoveItem: (productId: number) => void;
  orderNote: string;
  onOrderNoteChange: (note: string) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  useCOD: boolean;
  onUseCODChange: (useCOD: boolean) => void;
  paymentAmount: number;
  onPaymentAmountChange: (amount: number) => void;
  onCreateOrder: () => void;
}

export function OrderCart({
  cartItems,
  selectedCustomer,
  onSelectCustomer,
  onUpdateItem,
  onRemoveItem,
  orderNote,
  onOrderNoteChange,
  discount,
  onDiscountChange,
  useCOD,
  onUseCODChange,
  paymentAmount,
  onPaymentAmountChange,
  onCreateOrder,
}: OrderCartProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

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

  return (
    <div className="w-1/2 bg-white border-l flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded hover:bg-gray-50">
              {user?.name || "admin"} ▼
            </button>
            <button className="p-2 hover:bg-gray-50 rounded">👤</button>
            <button className="p-2 hover:bg-gray-50 rounded">▼</button>
          </div>
          <div className="text-sm text-gray-600">{formatDate()}</div>
        </div>

        <CustomerSearch
          selectedCustomer={selectedCustomer}
          onSelectCustomer={onSelectCustomer}
        />

        <button className="w-full flex items-center justify-between border rounded px-3 py-2 hover:bg-gray-50">
          <span className="text-sm">Bảng giá chung</span>
          <span className="text-gray-400">▼</span>
        </button>

        {selectedCustomer && (
          <div className="p-3 bg-gray-50 rounded space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-medium">
                  {selectedCustomer.name} +{selectedCustomer.contactNumber}
                </span>
                <button
                  onClick={() => onSelectCustomer(null)}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-red-600">
              Nợ: {Number(selectedCustomer.totalDebt || 0).toLocaleString()}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">📍</span>
                <input
                  type="text"
                  defaultValue={selectedBranch?.address || ""}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="262/1/1D Phan Anh, Phường Hiệp Tân..."
                />
                <button className="text-gray-400">▼</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-500">📍</span>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    defaultValue={selectedCustomer.name || ""}
                    placeholder="Tên người nhận"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    defaultValue={selectedCustomer.contactNumber || ""}
                    placeholder="Số điện thoại"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <button className="text-gray-400">+</button>
              </div>

              <input
                type="text"
                defaultValue={selectedCustomer.address || ""}
                placeholder="Địa chỉ chi tiết (Số nhà, ngõ, đường)"
                className="w-full border rounded px-2 py-1 text-sm"
              />

              <input
                type="text"
                defaultValue={selectedCustomer.invoiceCityName || ""}
                placeholder="Khu vực"
                className="w-full border rounded px-2 py-1 text-sm"
              />

              <input
                type="text"
                defaultValue={selectedCustomer.invoiceWardName || ""}
                placeholder="Phường/Xã"
                className="w-full border rounded px-2 py-1 text-sm"
              />

              <div className="flex items-center gap-2">
                <span>📦</span>
                <input
                  type="text"
                  placeholder="500"
                  className="w-20 border rounded px-2 py-1 text-sm text-center"
                />
                <select className="border rounded px-2 py-1 text-sm">
                  <option>gram</option>
                  <option>kg</option>
                </select>
                <input
                  type="text"
                  placeholder="10"
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                />
                <span>×</span>
                <input
                  type="text"
                  placeholder="10"
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                />
                <span>×</span>
                <input
                  type="text"
                  placeholder="10"
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                />
                <select className="border rounded px-2 py-1 text-sm">
                  <option>cm</option>
                  <option>m</option>
                </select>
              </div>

              <textarea
                placeholder="Ghi chú cho bưu tá"
                className="w-full border rounded px-2 py-1 text-sm"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            Chưa có sản phẩm trong giỏ hàng
          </div>
        ) : (
          <div className="divide-y">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="p-3 hover:bg-gray-50 relative"
                onMouseEnter={() => setHoveredItemId(item.product.id)}
                onMouseLeave={() => setHoveredItemId(null)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {item.product.code}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.product.name}
                    </div>
                    {item.note && (
                      <div className="text-xs text-gray-500 italic mt-1">
                        {item.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {hoveredItemId === item.product.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onUpdateItem(item.product.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="p-1 hover:bg-gray-200 rounded">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            onUpdateItem(item.product.id, {
                              quantity: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="w-12 text-center border rounded px-1"
                        />
                        <button
                          onClick={() =>
                            onUpdateItem(item.product.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="p-1 hover:bg-gray-200 rounded">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm">{item.quantity}</div>
                    )}
                    <div className="text-sm">{item.price.toLocaleString()}</div>
                  </div>

                  <div className="text-right font-medium">
                    {(
                      item.quantity * item.price -
                      item.discount
                    ).toLocaleString()}
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-gray-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <button className="text-gray-600 hover:text-gray-800">
            ✏ Ghi chú đơn hàng
          </button>
          <div>
            <span>Tổng tiền hàng</span>
            <span className="ml-4 font-medium">{cartItems.length}</span>
            <span className="ml-8">{calculateSubtotal().toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Giảm giá</span>
          <input
            type="number"
            value={discount}
            onChange={(e) => onDiscountChange(Number(e.target.value))}
            className="w-32 text-right border rounded px-2 py-1"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Thu khác</span>
          <button className="text-blue-600 hover:underline">ⓘ</button>
          <span>0</span>
        </div>

        <div className="flex items-center justify-between font-medium text-lg border-t pt-2">
          <span>Khách cần trả</span>
          <span className="text-blue-600">
            {calculateTotal().toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Thu hộ tiền (COD)</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCOD}
                onChange={(e) => onUseCODChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <span className="font-medium">0</span>
        </div>

        {!useCOD && (
          <div className="flex items-center justify-between text-sm">
            <span>Tiền thừa trả khách</span>
            <span className="text-red-600">
              - {Math.max(0, paymentAmount - calculateTotal()).toLocaleString()}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {useCOD ? "Tính vào công nợ" : "Khách thanh toán"}
            </span>
            <button className="text-gray-400">⋯</button>
            <span className="font-medium text-blue-600">
              {useCOD ? calculateTotal().toLocaleString() : "0"}
            </span>
          </div>

          {!useCOD && (
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => onPaymentAmountChange(Number(e.target.value))}
              placeholder="Nhập số tiền thanh toán"
              className="w-full border rounded px-3 py-2 text-right"
            />
          )}
        </div>

        <button
          onClick={onCreateOrder}
          disabled={cartItems.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium">
          Tạo đơn (F9)
        </button>
      </div>
    </div>
  );
}
