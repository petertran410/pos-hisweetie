"use client";

import { useState } from "react";
import { ProductSearchDropdown } from "@/components/pos/ProductSearchDropdown";
import { CartItemsList } from "@/components/pos/CartItemsList";
import { OrderCart } from "@/components/pos/OrderCart";
import { useBranchStore } from "@/lib/store/branch";
import { useCreateOrder } from "@/lib/hooks/useOrders";
import { toast } from "sonner";
import { X } from "lucide-react";

export interface CartItem {
  product: any;
  quantity: number;
  price: number;
  discount: number;
  note?: string;
}

export default function BanHangPage() {
  const { selectedBranch } = useBranchStore();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [orderNote, setOrderNote] = useState("");
  const [discount, setDiscount] = useState(0);
  const [useCOD, setUseCOD] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const createOrder = useCreateOrder();

  const addToCart = (product: any) => {
    const existingItem = cartItems.find(
      (item) => item.product.id === product.id
    );

    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          product,
          quantity: 1,
          price: Number(product.basePrice),
          discount: 0,
        },
      ]);
    }
  };

  const updateCartItem = (productId: number, updates: Partial<CartItem>) => {
    setCartItems(
      cartItems.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCartItems(cartItems.filter((item) => item.product.id !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price - item.discount,
      0
    );
    return subtotal - discount;
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào đơn hàng");
      return;
    }

    if (!useCOD && paymentAmount === 0) {
      toast.error("Vui lòng nhập số tiền thanh toán");
      return;
    }

    const total = calculateTotal();

    if (!useCOD && paymentAmount < total) {
      toast.error("Số tiền thanh toán không đủ");
      return;
    }

    try {
      await createOrder.mutateAsync({
        customerId: selectedCustomer?.id,
        branchId: selectedBranch?.id,
        notes: orderNote,
        discountAmount: discount,
        depositAmount: useCOD ? 0 : paymentAmount,
        orderStatus: "pending",
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
          note: item.note,
        })),
      });

      setCartItems([]);
      setSelectedCustomer(null);
      setOrderNote("");
      setDiscount(0);
      setPaymentAmount(0);
      toast.success("Tạo đơn hàng thành công");
    } catch (error) {
      console.error("Create order error:", error);
      toast.error("Tạo đơn hàng thất bại");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-blue-600">
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <ProductSearchDropdown onAddProduct={addToCart} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/50">
            <span className="text-white font-medium">Đặt hàng</span>
            <button className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <button className="px-3 py-1.5 rounded text-white hover:bg-white/20 font-medium">
            +
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <CartItemsList
          cartItems={cartItems}
          onUpdateItem={updateCartItem}
          onRemoveItem={removeFromCart}
        />
        <OrderCart
          cartItems={cartItems}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          orderNote={orderNote}
          onOrderNoteChange={setOrderNote}
          discount={discount}
          onDiscountChange={setDiscount}
          useCOD={useCOD}
          onUseCODChange={setUseCOD}
          paymentAmount={paymentAmount}
          onPaymentAmountChange={setPaymentAmount}
          onCreateOrder={handleCreateOrder}
        />
      </div>
    </div>
  );
}
