"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductSearchDropdown } from "@/components/pos/ProductSearchDropdown";
import { OrderItemsList } from "@/components/pos/OrderItemsList";
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
  useCreateInvoiceFromOrder,
} from "@/lib/hooks/useInvoices";
import { toast } from "sonner";
import { X, Plus, ArrowLeftRight } from "lucide-react";
import { useCreateOrderPayment } from "@/lib/hooks/useOrderPayments";
import { useCreateInvoicePayment } from "@/lib/hooks/useInvoicePayments";
import { InvoiceCart } from "@/components/pos/InvoiceCart";
import { InvoiceItemsList } from "@/components/pos/InvoiceItemsList";
import { useDraftStore } from "@/lib/store/draft";

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

export interface Tab {
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
  sourceOrderId?: number;
  sourceOrder?: any;
}

const getEmptyDeliveryInfo = (): DeliveryInfo => ({
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

const createNewTab = (type: TabType, tabNumber: number): Tab => ({
  id: `tab-${Date.now()}-${Math.random()}`,
  type,
  label: type === "order" ? `Đơn hàng ${tabNumber}` : `Hóa đơn ${tabNumber}`,
  cartItems: [],
  selectedCustomer: null,
  orderNote: "",
  discount: 0,
  discountRatio: 0,
  useCOD: false,
  paymentAmount: 0,
  deliveryInfo: getEmptyDeliveryInfo(),
});

const getNextTabNumber = (tabs: Tab[], type: TabType): number => {
  const tabsOfType = tabs.filter((t) => t.type === type);
  if (tabsOfType.length === 0) return 1;

  const numbers = tabsOfType.map((tab) => {
    const match = tab.label.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  });

  return Math.max(...numbers) + 1;
};

export default function BanHangPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const invoiceId = searchParams.get("invoiceId");
  const typeParam = searchParams.get("type") as TabType | null;
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { drafts, saveDrafts, removeDraft } = useDraftStore();

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const createInvoiceFromOrder = useCreateInvoiceFromOrder();
  const createOrderPayment = useCreateOrderPayment();
  const createInvoicePayment = useCreateInvoicePayment();

  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(
    orderId ? parseInt(orderId) : 0
  );

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(
    invoiceId ? parseInt(invoiceId) : 0
  );

  const getInitialTabType = (): TabType => {
    if (orderId) return "order";
    if (invoiceId) return "invoice";
    if (typeParam === "invoice" || typeParam === "order") return typeParam;
    return "order";
  };

  const getInitialTabs = (): Tab[] => {
    if (orderId || invoiceId) {
      return [];
    }

    const hasDrafts = drafts && drafts.length > 0;

    if (typeParam) {
      const baseTabs = hasDrafts ? [...drafts] : [];
      const nextNumber = getNextTabNumber(baseTabs, typeParam);
      const newTab = createNewTab(typeParam, nextNumber);
      return [...baseTabs, newTab];
    }

    if (hasDrafts) {
      return drafts;
    }

    return [createNewTab("order", 1)];
  };

  const [isInitialized, setIsInitialized] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  useEffect(() => {
    if (!isInitialized && !orderId && !invoiceId) {
      const initialTabs = getInitialTabs();
      setTabs(initialTabs);
      if (initialTabs.length > 0) {
        setActiveTabId(initialTabs[initialTabs.length - 1].id);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, orderId, invoiceId, drafts, typeParam]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  useEffect(() => {
    if (!orderId && !invoiceId) {
      if (tabs.length === 0) {
        const newTab = createNewTab("order", 1);
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } else if (!activeTab) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTab, orderId, invoiceId]);

  useEffect(() => {
    const draftableTabs = tabs.filter(
      (tab) =>
        tab.cartItems.length > 0 ||
        tab.selectedCustomer ||
        tab.orderNote ||
        tab.discount > 0 ||
        tab.paymentAmount > 0
    );
    saveDrafts(draftableTabs);
  }, [tabs, saveDrafts]);

  useEffect(() => {
    if (existingOrder && orderId) {
      const cartItems: CartItem[] =
        existingOrder.items?.map((item: any) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
        })) || [];

      setTabs([
        {
          id: "tab-1",
          type: "order",
          label: `Đơn hàng ${existingOrder.code}`,
          cartItems,
          selectedCustomer: existingOrder.customer || null,
          orderNote: existingOrder.description || "",
          discount: Number(existingOrder.discount) || 0,
          discountRatio: Number(existingOrder.discountRatio) || 0,
          useCOD: false,
          paymentAmount: 0,
          deliveryInfo: {
            receiver: existingOrder.delivery?.receiver || "",
            contactNumber: existingOrder.delivery?.contactNumber || "",
            detailAddress: existingOrder.delivery?.address || "",
            locationName: existingOrder.delivery?.locationName || "",
            wardName: existingOrder.delivery?.wardName || "",
            weight: Number(existingOrder.delivery?.weight) || 0,
            length: Number(existingOrder.delivery?.length) || 10,
            width: Number(existingOrder.delivery?.width) || 10,
            height: Number(existingOrder.delivery?.height) || 10,
            noteForDriver: existingOrder.delivery?.noteForDriver || "",
          },
          documentId: existingOrder.id,
        },
      ]);
      setActiveTabId("tab-1");
    }
  }, [existingOrder, orderId]);

  useEffect(() => {
    if (existingInvoice && invoiceId) {
      const cartItems: CartItem[] =
        existingInvoice.details?.map((item: any) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
        })) || [];

      setTabs([
        {
          id: "tab-1",
          type: "invoice",
          label: `Hóa đơn ${existingInvoice.code}`,
          cartItems,
          selectedCustomer: existingInvoice.customer || null,
          orderNote: existingInvoice.description || "",
          discount: Number(existingInvoice.discount) || 0,
          discountRatio: Number(existingInvoice.discountRatio) || 0,
          useCOD: existingInvoice.usingCod || false,
          paymentAmount: 0,
          deliveryInfo: existingInvoice.delivery
            ? {
                receiver: existingInvoice.delivery.receiver || "",
                contactNumber: existingInvoice.delivery.contactNumber || "",
                detailAddress: existingInvoice.delivery.address || "",
                locationName: existingInvoice.delivery.locationName || "",
                wardName: existingInvoice.delivery.wardName || "",
                weight: Number(existingInvoice.delivery.weight) || 0,
                length: Number(existingInvoice.delivery.length) || 10,
                width: Number(existingInvoice.delivery.width) || 10,
                height: Number(existingInvoice.delivery.height) || 10,
                noteForDriver: existingInvoice.delivery.noteForDriver,
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
          documentId: existingInvoice.id,
        },
      ]);
    }
  }, [existingInvoice, invoiceId]);

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleConvertToInvoice = () => {
    if (!activeTab?.documentId || activeTab.type !== "order") {
      toast.error("Không tìm thấy thông tin đơn hàng");
      return;
    }

    setTabs(
      tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              type: "invoice",
              label: "Tạo hóa đơn",
              sourceOrderId: tab.documentId,
              sourceOrder: existingOrder,
              documentId: undefined,
              paymentAmount: 0,
            }
          : tab
      )
    );

    toast.success("Chuyển sang giao diện tạo hóa đơn");
  };

  const handlePayment = async () => {
    if (!activeTab?.sourceOrderId) {
      toast.error("Không tìm thấy thông tin đơn hàng gốc");
      return;
    }

    const additionalPayment = activeTab.paymentAmount || 0;

    try {
      await createInvoiceFromOrder.mutateAsync({
        orderId: activeTab.sourceOrderId,
        additionalPayment: additionalPayment,
      });
      toast.success("Tạo hóa đơn thành công");
      router.push(`/don-hang/hoa-don`);
    } catch (error: any) {
      console.error("Create invoice from order error:", error);
      toast.error(error.message || "Không thể tạo hóa đơn");
    }
  };

  const handleAddTab = () => {
    if (!activeTab) return;
    const currentType = activeTab.type;
    const nextNumber = getNextTabNumber(tabs, currentType);
    const newTab = createNewTab(currentType, nextNumber);

    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      removeDraft(tabId);
      router.push("/ban-hang");
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
    if (!activeTab) return;
    const currentType = activeTab.type;
    const newType: TabType = currentType === "order" ? "invoice" : "order";
    const nextNumber = getNextTabNumber(tabs, newType);

    updateActiveTab({
      type: newType,
      label:
        newType === "order"
          ? `Đơn hàng ${nextNumber}`
          : `Hóa đơn ${nextNumber}`,
      cartItems: [],
      selectedCustomer: null,
      orderNote: "",
      discount: 0,
      discountRatio: 0,
      useCOD: false,
      paymentAmount: 0,
      deliveryInfo: getEmptyDeliveryInfo(),
      documentId: undefined,
    });
  };

  useEffect(() => {
    if (!activeTab) return;

    const totalWeight = activeTab.cartItems.reduce((sum, item) => {
      const productWeight = Number(item.product.weight) || 0;
      const weightInGrams =
        item.product.weightUnit === "kg" ? productWeight * 1000 : productWeight;
      return sum + weightInGrams * item.quantity;
    }, 0);

    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              deliveryInfo: {
                ...tab.deliveryInfo,
                weight: totalWeight,
              },
            }
          : tab
      )
    );
  }, [activeTab, activeTabId]);

  const handleCustomerSelect = (customer: any) => {
    if (!activeTab) return;

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
        : getEmptyDeliveryInfo(),
    });
  };

  const addToCart = (product: any) => {
    if (!activeTab) return;

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
    if (!activeTab) return;

    updateActiveTab({
      cartItems: activeTab.cartItems.map((item) =>
        item.product.id === productId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeFromCart = (productId: number) => {
    if (!activeTab) return;

    updateActiveTab({
      cartItems: activeTab.cartItems.filter(
        (item) => item.product.id !== productId
      ),
    });
  };

  const handleSaveOrder = async () => {
    if (!activeTab) return;

    if (!selectedBranch) {
      toast.error(
        `Vui lòng chọn chi nhánh trước khi lưu ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`
      );
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error(
        `Vui lòng chọn khách hàng trước khi lưu ${
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

    if (!activeTab.documentId) {
      toast.error(
        `Không tìm thấy thông tin ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`
      );
      return;
    }

    if (activeTab.type === "order") {
      if (!existingOrder) {
        toast.error("Không tìm thấy thông tin đơn hàng");
        return;
      }

      const actualPayment = activeTab.paymentAmount || 0;

      const orderData = {
        customerId: activeTab.selectedCustomer.id,
        branchId: selectedBranch?.id,
        orderDate: new Date().toISOString(),
        orderStatus: existingOrder.orderStatus,
        notes: activeTab.orderNote,
        paidAmount: actualPayment,
        discountAmount: Number(activeTab.discount) || 0,
        discountRatio: Number(activeTab.discountRatio) || 0,
        items: activeTab.cartItems.map((item) => ({
          productId: Number(item.product.id),
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          discount: Number(item.discount) || 0,
          discountRatio: 0,
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
        if (actualPayment > 0) {
          await createOrderPayment.mutateAsync({
            orderId: activeTab.documentId,
            amount: actualPayment,
            paymentMethod: "cash",
            notes: "Thanh toán bổ sung",
          });
        }

        await updateOrder.mutateAsync({
          id: activeTab.documentId,
          data: orderData,
        });

        removeDraft(activeTabId);
        toast.success("Lưu đơn hàng thành công");
        router.push("/don-hang/dat-hang");
      } catch (error: any) {
        console.error("Save order error:", error);
        toast.error(error.message || "Không thể lưu đơn hàng");
      }
    } else {
      if (!existingInvoice) {
        toast.error("Không tìm thấy thông tin hóa đơn");
        return;
      }

      const actualPayment = activeTab.paymentAmount || 0;

      const invoiceData = {
        customerId: activeTab.selectedCustomer.id,
        branchId: selectedBranch?.id,
        purchaseDate: new Date().toISOString(),
        description: activeTab.orderNote,
        paidAmount: actualPayment,
        discountAmount: Number(activeTab.discount) || 0,
        discountRatio: Number(activeTab.discountRatio) || 0,
        items: activeTab.cartItems.map((item) => {
          const price = Number(item.price);
          const quantity = Number(item.quantity);
          const discount = Number(item.discount) || 0;
          return {
            productId: Number(item.product.id),
            productCode: item.product.code,
            productName: item.product.name,
            quantity: quantity,
            price: price,
            discount: discount,
            discountRatio: 0,
            totalPrice: quantity * price - discount,
            note: item.note || "",
          };
        }),
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
        },
      };

      try {
        if (actualPayment > 0) {
          await createInvoicePayment.mutateAsync({
            invoiceId: activeTab.documentId,
            amount: actualPayment,
            paymentMethod: "cash",
            notes: "Thanh toán bổ sung",
          });
        }

        await updateInvoice.mutateAsync({
          id: activeTab.documentId,
          data: invoiceData,
        });

        removeDraft(activeTabId);
        toast.success("Lưu hóa đơn thành công");
        router.push("/don-hang/hoa-don");
      } catch (error: any) {
        console.error("Save invoice error:", error);
        toast.error(error.message || "Không thể lưu hóa đơn");
      }
    }
  };

  const handleCreateDocument = async () => {
    if (!activeTab) return;

    if (!selectedBranch) {
      toast.error(
        `Vui lòng chọn chi nhánh trước khi tạo ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`
      );
      return;
    }

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

    const actualPayment = activeTab.paymentAmount || 0;

    const documentData: any = {
      customerId: activeTab.selectedCustomer.id,
      branchId: selectedBranch?.id,
      discountAmount: Number(activeTab.discount) || 0,
      discountRatio: Number(activeTab.discountRatio) || 0,
    };

    if (activeTab.type === "order") {
      documentData.orderDate = new Date().toISOString();
      documentData.orderStatus = "pending";
      documentData.notes = activeTab.orderNote;
      documentData.depositAmount = Number(actualPayment) || 0;
      documentData.items = activeTab.cartItems.map((item) => ({
        productId: Number(item.product.id),
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        discount: Number(item.discount) || 0,
        discountRatio: 0,
        note: item.note || "",
      }));
      documentData.delivery = {
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
      };
    } else {
      documentData.purchaseDate = new Date().toISOString();
      documentData.description = activeTab.orderNote;
      documentData.paidAmount = Number(actualPayment) || 0;
      documentData.items = activeTab.cartItems.map((item) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const discount = Number(item.discount) || 0;
        return {
          productId: Number(item.product.id),
          productCode: item.product.code,
          productName: item.product.name,
          quantity: quantity,
          price: price,
          discount: discount,
          discountRatio: 0,
          totalPrice: quantity * price - discount,
          note: item.note || "",
        };
      });
      documentData.delivery = {
        receiver: activeTab.deliveryInfo.receiver,
        contactNumber: activeTab.deliveryInfo.contactNumber,
        address: activeTab.deliveryInfo.detailAddress,
        locationName: activeTab.deliveryInfo.locationName,
        wardName: activeTab.deliveryInfo.wardName,
        weight: Number(activeTab.deliveryInfo.weight) || 0,
        length: Number(activeTab.deliveryInfo.length) || 10,
        width: Number(activeTab.deliveryInfo.width) || 10,
        height: Number(activeTab.deliveryInfo.height) || 10,
      };
    }

    try {
      if (activeTab.type === "order") {
        const result = await createOrder.mutateAsync(documentData);

        if (actualPayment > 0 && result?.order?.id) {
          await createOrderPayment.mutateAsync({
            orderId: result.order.id,
            amount: actualPayment,
            paymentMethod: "cash",
            notes: "Thanh toán khi tạo đơn",
          });
        }
      } else {
        await createInvoice.mutateAsync(documentData);
      }

      removeDraft(activeTabId);

      updateActiveTab({
        cartItems: [],
        selectedCustomer: null,
        orderNote: "",
        discount: 0,
        discountRatio: 0,
        useCOD: false,
        paymentAmount: 0,
      });

      toast.success(
        `Tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"} thành công`
      );
      router.push(
        activeTab.type === "order" ? "/don-hang/dat-hang" : "/don-hang/hoa-don"
      );
    } catch (error: any) {
      console.error("Create document error:", error);
      toast.error(
        error.message ||
          `Không thể tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"}`
      );
    }
  };

  if ((isLoadingOrder && orderId) || (isLoadingInvoice && invoiceId)) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-600">
        <div className="text-white text-lg">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!isInitialized || !activeTab) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-600">
        <div className="text-white text-lg">Đang khởi tạo...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-blue-600">
      <div className="px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <ProductSearchDropdown onAddProduct={addToCart} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors ${
                  tab.id === activeTabId
                    ? "bg-white/30"
                    : "bg-white/10 hover:bg-white/20"
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

          {!activeTab.documentId && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {activeTab.type === "order" ? (
          <>
            <OrderItemsList
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
              onSaveOrder={handleSaveOrder}
              onCreateInvoice={handleConvertToInvoice}
              discount={activeTab.discount}
              discountRatio={activeTab.discountRatio}
              onDeliveryInfoChange={(deliveryInfo) =>
                updateActiveTab({ deliveryInfo })
              }
              deliveryInfo={activeTab.deliveryInfo}
              isEditMode={!!activeTab.documentId}
              existingOrder={existingOrder}
              documentType={activeTab.type}
            />
          </>
        ) : (
          <>
            <InvoiceItemsList
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
            <InvoiceCart
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
              onSaveOrder={handleSaveOrder}
              onPayment={handlePayment}
              discount={activeTab.discount}
              discountRatio={activeTab.discountRatio}
              onDeliveryInfoChange={(deliveryInfo) =>
                updateActiveTab({ deliveryInfo })
              }
              deliveryInfo={activeTab.deliveryInfo}
              isEditMode={!!activeTab.documentId}
              isCreatingFromOrder={!!activeTab.sourceOrderId}
              existingOrder={activeTab.sourceOrder || existingInvoice}
              documentType={activeTab.type}
            />
          </>
        )}
      </div>
    </div>
  );
}
