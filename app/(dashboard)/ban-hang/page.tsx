"use client";

import { useState, useEffect } from "react";
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

export interface DeliveryInfo {
  receiver: string;
  contactNumber: string;
  detailAddress: string;
  locationName: string;
  wardName: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  noteForDriver: string;
}

export default function BanHangPage() {
  const { selectedBranch } = useBranchStore();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [orderNote, setOrderNote] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountRatio, setDiscountRatio] = useState(0);
  const [useCOD, setUseCOD] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    receiver: "",
    contactNumber: "",
    detailAddress: "",
    locationName: "",
    wardName: "",
    weight: 0,
    length: 10,
    width: 10,
    height: 10,
    noteForDriver: "",
  });

  const createOrder = useCreateOrder();

  useEffect(() => {
    const totalWeight = cartItems.reduce((sum, item) => {
      const productWeight = item.product.weight || 0;
      const weightInGrams =
        item.product.weightUnit === "kg" ? productWeight * 1000 : productWeight;
      return sum + weightInGrams * item.quantity;
    }, 0);

    setDeliveryInfo((prev) => ({
      ...prev,
      weight: totalWeight,
      length: prev.length || 10,
      width: prev.width || 10,
      height: prev.height || 10,
    }));
  }, [cartItems]);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    if (customer) {
      setDeliveryInfo({
        ...deliveryInfo,
        receiver: customer.name || "",
        contactNumber: customer.contactNumber || customer.phone || "",
        detailAddress: customer.address || "",
        locationName: customer.cityName || "",
        wardName: customer.wardName || "",
      });
    } else {
      setDeliveryInfo({
        receiver: "",
        contactNumber: "",
        detailAddress: "",
        locationName: "",
        wardName: "",
        weight: 0,
        length: 10,
        width: 10,
        height: 10,
        noteForDriver: "",
      });
    }
  };

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
    return subtotal - discount - (subtotal * discountRatio) / 100;
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      toast.error("Vui lòng chọn khách hàng trước khi tạo đơn hàng");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào đơn hàng");
      return;
    }

    const total = calculateTotal();
    const actualPayment = useCOD ? 0 : paymentAmount;
    const debtAmount = Math.max(0, total - actualPayment);

    if (!useCOD && paymentAmount < 0) {
      toast.error("Số tiền thanh toán không hợp lệ");
      return;
    }

    if (!useCOD && paymentAmount > total) {
      toast.error("Số tiền thanh toán không được lớn hơn tổng tiền");
      return;
    }

    try {
      await createOrder.mutateAsync({
        customerId: selectedCustomer.id,
        branchId: selectedBranch?.id,
        notes: orderNote,
        discountAmount: discount,
        discountRatio: discountRatio,
        depositAmount: useCOD ? 0 : paymentAmount,
        orderStatus: "pending",
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
          note: item.note,
        })),
        delivery: {
          receiver: deliveryInfo.receiver,
          contactNumber: deliveryInfo.contactNumber,
          address: deliveryInfo.detailAddress,
          locationName: deliveryInfo.locationName,
          wardName: deliveryInfo.wardName,
          weight: deliveryInfo.weight,
          length: deliveryInfo.length || 10,
          width: deliveryInfo.width || 10,
          height: deliveryInfo.height || 10,
          noteForDriver: deliveryInfo.noteForDriver,
        },
      });

      setCartItems([]);
      setSelectedCustomer(null);
      setOrderNote("");
      setDiscount(0);
      setPaymentAmount(0);
      setDeliveryInfo({
        receiver: "",
        contactNumber: "",
        detailAddress: "",
        locationName: "",
        wardName: "",
        weight: 0,
        length: 10,
        width: 10,
        height: 10,
        noteForDriver: "",
      });

      if (debtAmount > 0) {
        toast.success(
          `Tạo đơn hàng thành công. Khách hàng còn nợ ${new Intl.NumberFormat(
            "vi-VN"
          ).format(debtAmount)}đ`
        );
      } else {
        toast.success("Tạo đơn hàng thành công");
      }
    } catch (error: any) {
      console.error("Create order error:", error);
      toast.error(error.message || "Không thể tạo đơn hàng");
    }
  };

  return (
    <div className="h-full flex flex-col bg-blue-600">
      <div className="px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <ProductSearchDropdown onAddProduct={addToCart} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/50">
            <span className="text-white font-medium">Đặt hàng</span>
            <button className="hover:bg-white/20 p-1 rounded">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <button className="px-3 py-1 rounded text-white hover:bg-white/20 font-medium">
            <span className="text-2xl">+</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <CartItemsList
          cartItems={cartItems}
          onUpdateItem={updateCartItem}
          onRemoveItem={removeFromCart}
          discount={discount}
          onDiscountChange={setDiscount}
          discountRatio={discountRatio}
          onDiscountRatioChange={setDiscountRatio}
          orderNote={orderNote}
          onOrderNoteChange={setOrderNote}
        />
        <OrderCart
          cartItems={cartItems}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={handleCustomerSelect}
          useCOD={useCOD}
          onUseCODChange={setUseCOD}
          paymentAmount={paymentAmount}
          onPaymentAmountChange={setPaymentAmount}
          onCreateOrder={handleCreateOrder}
          discount={discount}
          discountRatio={discountRatio}
          deliveryInfo={deliveryInfo}
          onDeliveryInfoChange={setDeliveryInfo}
        />
      </div>
    </div>
  );
}
