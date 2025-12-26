"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductSearchDropdown } from "@/components/pos/ProductSearchDropdown";
import { CartItemsList } from "@/components/pos/CartItemsList";
import { OrderCart } from "@/components/pos/OrderCart";
import { useBranchStore } from "@/lib/store/branch";
import {
  useCreateOrder,
  useUpdateOrder,
  useOrder,
} from "@/lib/hooks/useOrders";
import {
  useCreateInvoice,
  useUpdateInvoice,
  useInvoice,
} from "@/lib/hooks/useInvoices";
import { toast } from "sonner";
import { X, Plus, ArrowLeftRight } from "lucide-react";

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

type TabType = "order" | "invoice";

interface Tab {
  id: string;
  type: TabType;
  label: string;
  cartItems: CartItem[];
  selectedCustomer: any;
  orderNote: string;
  discount: number;
  discountRatio: number;
  useCOD: boolean;
  paymentAmount: number;
  deliveryInfo: DeliveryInfo;
  documentId?: number;
}

export default function BanHangPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedBranch } = useBranchStore();

  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "tab-1",
      type: "order",
      label: "Đơn hàng 1",
      cartItems: [],
      selectedCustomer: null,
      orderNote: "",
      discount: 0,
      discountRatio: 0,
      useCOD: false,
      paymentAmount: 0,
      deliveryInfo: {
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
      },
    },
  ]);

  const [activeTabId, setActiveTabId] = useState("tab-1");
  const activeTab = tabs.find((tab) => tab.id === activeTabId)!;

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleAddTab = () => {
    const currentType = activeTab.type;
    const tabsOfSameType = tabs.filter((t) => t.type === currentType);
    const newTabNumber = tabsOfSameType.length + 1;

    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      type: currentType,
      label:
        currentType === "order"
          ? `Đơn hàng ${newTabNumber}`
          : `Hóa đơn ${newTabNumber}`,
      cartItems: [],
      selectedCustomer: null,
      orderNote: "",
      discount: 0,
      discountRatio: 0,
      useCOD: false,
      paymentAmount: 0,
      deliveryInfo: {
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
      },
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      toast.error("Không thể đóng tab cuối cùng");
      return;
    }

    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);

    if (tabId === activeTabId) {
      const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
      setActiveTabId(newActiveTab.id);
    }

    setTabs(newTabs);
  };

  const handleToggleType = () => {
    const currentType = activeTab.type;
    const newType: TabType = currentType === "order" ? "invoice" : "order";

    const tabsOfNewType = tabs.filter((t) => t.type === newType);
    const newTabNumber = tabsOfNewType.length + 1;

    updateActiveTab({
      type: newType,
      label:
        newType === "order"
          ? `Đơn hàng ${newTabNumber}`
          : `Hóa đơn ${newTabNumber}`,
      cartItems: [],
      selectedCustomer: null,
      orderNote: "",
      discount: 0,
      discountRatio: 0,
      useCOD: false,
      paymentAmount: 0,
      deliveryInfo: {
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
      },
    });
  };

  useEffect(() => {
    const totalWeight = activeTab.cartItems.reduce((sum, item) => {
      const productWeight = Number(item.product.weight) || 0;
      const weightInGrams =
        item.product.weightUnit === "kg" ? productWeight * 1000 : productWeight;
      return sum + weightInGrams * item.quantity;
    }, 0);

    updateActiveTab({
      deliveryInfo: {
        ...activeTab.deliveryInfo,
        weight: totalWeight,
        length: activeTab.deliveryInfo.length || 10,
        width: activeTab.deliveryInfo.width || 10,
        height: activeTab.deliveryInfo.height || 10,
      },
    });
  }, [activeTab.cartItems]);

  const handleCustomerSelect = (customer: any) => {
    updateActiveTab({
      selectedCustomer: customer,
      deliveryInfo: customer
        ? {
            ...activeTab.deliveryInfo,
            receiver: customer.name || "",
            contactNumber: customer.contactNumber || customer.phone || "",
            detailAddress: customer.address || "",
            locationName: customer.cityName || "",
            wardName: customer.wardName || "",
          }
        : {
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
          },
    });
  };

  const addToCart = (product: any) => {
    const existingItem = activeTab.cartItems.find(
      (item) => item.product.id === product.id
    );

    if (existingItem) {
      updateActiveTab({
        cartItems: activeTab.cartItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      updateActiveTab({
        cartItems: [
          ...activeTab.cartItems,
          {
            product,
            quantity: 1,
            price: Number(product.basePrice),
            discount: 0,
          },
        ],
      });
    }
  };

  const updateCartItem = (productId: number, updates: Partial<CartItem>) => {
    updateActiveTab({
      cartItems: activeTab.cartItems.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeFromCart = (productId: number) => {
    updateActiveTab({
      cartItems: activeTab.cartItems.filter(
        (item) => item.product.id !== productId
      ),
    });
  };

  const calculateTotal = () => {
    const subtotal = activeTab.cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price - item.discount,
      0
    );
    return (
      subtotal - activeTab.discount - (subtotal * activeTab.discountRatio) / 100
    );
  };

  const handleCreateDocument = async () => {
    if (!activeTab.selectedCustomer) {
      toast.error(
        `Vui lòng chọn khách hàng trước khi tạo ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`
      );
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error(
        `Vui lòng thêm sản phẩm vào ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`
      );
      return;
    }

    const total = calculateTotal();
    const actualPayment = activeTab.useCOD ? 0 : activeTab.paymentAmount || 0;

    const documentData = {
      customerId: activeTab.selectedCustomer.id,
      branchId: selectedBranch?.id,
      ...(activeTab.type === "order"
        ? { orderDate: new Date().toISOString(), orderStatus: "pending" }
        : { purchaseDate: new Date().toISOString() }),
      notes: activeTab.orderNote,
      discountAmount: Number(activeTab.discount) || 0,
      discountRatio: Number(activeTab.discountRatio) || 0,
      ...(activeTab.type === "order"
        ? { depositAmount: Number(actualPayment) || 0 }
        : { paidAmount: Number(actualPayment) || 0 }),
      items: activeTab.cartItems.map((item) => ({
        productId: Number(item.product.id),
        productCode: item.product.code,
        productName: item.product.name,
        quantity: Number(item.quantity),
        ...(activeTab.type === "order"
          ? { unitPrice: Number(item.price) }
          : { price: Number(item.price) }),
        discount: Number(item.discount) || 0,
        discountRatio: 0,
        ...(activeTab.type === "order"
          ? {}
          : { totalPrice: item.quantity * item.price - item.discount }),
        note: item.note || "",
      })),
      delivery: {
        receiver: activeTab.deliveryInfo.receiver,
        contactNumber: activeTab.deliveryInfo.contactNumber,
        address: activeTab.deliveryInfo.detailAddress,
        locationName: activeTab.deliveryInfo.locationName,
        wardName: activeTab.deliveryInfo.wardName,
        weight: Number(activeTab.deliveryInfo.weight) || 0,
        length: Number(activeTab.deliveryInfo.length) || 10,
        width: Number(activeTab.deliveryInfo.width) || 10,
        height: Number(activeTab.deliveryInfo.height) || 10,
        noteForDriver: activeTab.deliveryInfo.noteForDriver,
      },
    };

    try {
      if (activeTab.type === "order") {
        await createOrder.mutateAsync(documentData);
      } else {
        await createInvoice.mutateAsync(documentData);
      }

      updateActiveTab({
        cartItems: [],
        selectedCustomer: null,
        orderNote: "",
        discount: 0,
        discountRatio: 0,
        useCOD: false,
        paymentAmount: 0,
      });
    } catch (error: any) {
      console.error("Create document error:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-blue-600">
      <div className="px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <ProductSearchDropdown onAddProduct={addToCart} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/10 rounded-md overflow-hidden">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                  tab.id === activeTabId ? "bg-white/30" : "hover:bg-white/20"
                }`}>
                <span className="text-white font-medium">{tab.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="hover:bg-white/20 p-1 rounded">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddTab}
            className="px-3 py-2 rounded text-white hover:bg-white/20 font-medium">
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleType}
            className="px-3 py-2 rounded text-white hover:bg-white/20 font-medium flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            {activeTab.type === "order"
              ? "Chuyển sang Hóa đơn"
              : "Chuyển sang Đơn hàng"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <CartItemsList
          cartItems={activeTab.cartItems}
          onUpdateItem={updateCartItem}
          onRemoveItem={removeFromCart}
          discount={activeTab.discount}
          onDiscountChange={(discount) => updateActiveTab({ discount })}
          discountRatio={activeTab.discountRatio}
          onDiscountRatioChange={(discountRatio) =>
            updateActiveTab({ discountRatio })
          }
          orderNote={activeTab.orderNote}
          onOrderNoteChange={(orderNote) => updateActiveTab({ orderNote })}
        />
        <OrderCart
          cartItems={activeTab.cartItems}
          selectedCustomer={activeTab.selectedCustomer}
          onSelectCustomer={handleCustomerSelect}
          useCOD={activeTab.useCOD}
          onUseCODChange={(useCOD) => updateActiveTab({ useCOD })}
          paymentAmount={activeTab.paymentAmount}
          onPaymentAmountChange={(paymentAmount) =>
            updateActiveTab({ paymentAmount })
          }
          onCreateOrder={handleCreateDocument}
          onSaveOrder={() => {}}
          discount={activeTab.discount}
          discountRatio={activeTab.discountRatio}
          deliveryInfo={activeTab.deliveryInfo}
          onDeliveryInfoChange={(deliveryInfo) =>
            updateActiveTab({ deliveryInfo })
          }
          isEditMode={false}
          documentType={activeTab.type}
        />
      </div>
    </div>
  );
}
