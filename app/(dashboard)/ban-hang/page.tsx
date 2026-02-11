"use client";

import { useState, useEffect, useRef } from "react";
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
import { priceBooksApi } from "@/lib/api";
import { invoicesApi } from "@/lib/api/invoices";

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
  code?: string;
  cartItems: CartItem[];
  selectedCustomer: any;
  selectedPriceBookId: number | null;
  orderNote: string;
  discount: number;
  discountRatio: number;
  useCOD: boolean;
  paymentAmount: number;
  deliveryInfo: DeliveryInfo;
  documentId?: number;
  sourceOrderId?: number;
  sourceOrder?: any;
  isEditMode?: boolean;
}

const STORAGE_KEY = "pos-tabs";
const EDIT_STORAGE_KEY = "pos-edit-state";
const PRICE_BOOK_STORAGE_KEY = "pos-selected-price-book";

const getEditStorageKey = (id: number, type: "order" | "invoice"): string => {
  return `${EDIT_STORAGE_KEY}-${type}-${id}`;
};

const getDefaultTab = (type: TabType = "order", forceId?: string): Tab => ({
  id: forceId || `tab-${Date.now()}`,
  type,
  label: type === "order" ? "Đơn hàng 1" : "Hóa đơn 1",
  cartItems: [],
  selectedCustomer: null,
  selectedPriceBookId: null,
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

export default function BanHangPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const invoiceId = searchParams.get("invoiceId");
  const tabType = searchParams.get("type") as TabType | null;
  const router = useRouter();
  const { selectedBranch } = useBranchStore();

  const [tabs, setTabs] = useState<Tab[]>([getDefaultTab("order", "tab-1")]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [isInitialized, setIsInitialized] = useState(false);

  const [lastInvoiceModal, setLastInvoiceModal] = useState<{
    show: boolean;
    discountAmount: number;
    orderCode: string;
  } | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  const initialEditDataRef = useRef<{
    [key: string]: {
      cartItems: CartItem[];
      selectedCustomer: any;
      selectedPriceBookId: number | null;
      orderNote: string;
      discount: number;
      discountRatio: number;
      paymentAmount: number;
      deliveryInfo: DeliveryInfo;
    };
  }>({});

  const saveEditStateIfChanged = (tab: Tab) => {
    if (!tab.documentId || !tab.isEditMode) return;

    const key = getEditStorageKey(tab.documentId, tab.type);
    const initialData = initialEditDataRef.current[key];

    if (!initialData) return;

    const hasChanges =
      JSON.stringify(tab.cartItems) !== JSON.stringify(initialData.cartItems) ||
      JSON.stringify(tab.selectedCustomer) !==
        JSON.stringify(initialData.selectedCustomer) ||
      tab.orderNote !== initialData.orderNote ||
      tab.discount !== initialData.discount ||
      tab.discountRatio !== initialData.discountRatio ||
      tab.paymentAmount !== initialData.paymentAmount ||
      tab.selectedPriceBookId !== initialData.selectedPriceBookId ||
      JSON.stringify(tab.deliveryInfo) !==
        JSON.stringify(initialData.deliveryInfo);

    if (hasChanges) {
      const editState = {
        documentId: tab.documentId,
        type: tab.type,
        code: tab.code || tab.documentId.toString(),
        cartItems: tab.cartItems,
        selectedCustomer: tab.selectedCustomer,
        orderNote: tab.orderNote,
        discount: tab.discount,
        discountRatio: tab.discountRatio,
        paymentAmount: tab.paymentAmount,
        selectedPriceBookId: tab.selectedPriceBookId,
        deliveryInfo: tab.deliveryInfo,
        timestamp: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(editState));
    }
  };

  const loadOrderItemsForInvoice = (order: any) => {
    const invoicedQuantities: Record<number, number> = {};
    (order.invoices || []).forEach((inv: any) => {
      if (inv.status !== 5) {
        (inv.details || []).forEach((d: any) => {
          invoicedQuantities[d.productId] =
            (invoicedQuantities[d.productId] || 0) + Number(d.quantity);
        });
      }
    });

    return order.items
      .map((item: any) => {
        const invoiced = invoicedQuantities[item.productId] || 0;
        const remaining = Number(item.quantity) - invoiced;
        return {
          product: item.product,
          quantity: remaining,
          price: Number(item.price),
          discount: Number(item.discount),
        };
      })
      .filter((item: any) => item.quantity > 0);
  };

  const loadAllEditTabsFromStorage = () => {
    const editTabs: Tab[] = [];

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(EDIT_STORAGE_KEY)) {
        try {
          const editState = JSON.parse(localStorage.getItem(key) || "");
          if (editState && editState.documentId) {
            const parts = key.split("-");
            const type = parts[3] as TabType;
            const docId = parseInt(parts[4]);

            const code = editState.code || docId.toString();

            const editTab: Tab = {
              id: `edit-${type}-${docId}`,
              type: editState.type,
              label: type === "order" ? `Sửa ĐH #${code}` : `Sửa HĐ #${code}`,
              cartItems: editState.cartItems || [],
              selectedCustomer: editState.selectedCustomer || null,
              selectedPriceBookId: editState.selectedPriceBookId || null,
              orderNote: editState.orderNote || "",
              discount: editState.discount || 0,
              discountRatio: editState.discountRatio || 0,
              useCOD: editState.useCOD || false,
              paymentAmount: editState.paymentAmount || 0,
              deliveryInfo: editState.deliveryInfo || {
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
              documentId: editState.documentId,
              isEditMode: true,
            };

            const editKey = getEditStorageKey(docId, type);
            initialEditDataRef.current[editKey] = {
              cartItems: editTab.cartItems,
              selectedCustomer: editTab.selectedCustomer,
              selectedPriceBookId: editTab.selectedPriceBookId,
              orderNote: editTab.orderNote,
              discount: editTab.discount,
              discountRatio: editTab.discountRatio,
              paymentAmount: editTab.paymentAmount,
              deliveryInfo: editTab.deliveryInfo,
            };

            editTabs.push(editTab);
          }
        } catch (error) {
          console.error("Error loading edit tab:", key, error);
        }
      }
    });

    return editTabs;
  };

  const handlePriceBookSelect = async (priceBookId: number | null) => {
    if (priceBookId !== null) {
      localStorage.setItem(PRICE_BOOK_STORAGE_KEY, priceBookId.toString());
    } else {
      localStorage.removeItem(PRICE_BOOK_STORAGE_KEY);
    }

    const currentCartItems = activeTab.cartItems;

    if (currentCartItems.length === 0) {
      updateActiveTab({ selectedPriceBookId: priceBookId });
      return;
    }

    const updatedCartItems = await Promise.all(
      currentCartItems.map(async (item) => {
        let newPrice = Number(item.product.basePrice);

        if (priceBookId && priceBookId !== 0) {
          try {
            const priceInfo = await priceBooksApi.getPriceForProduct({
              productId: item.product.id,
              branchId: selectedBranch?.id,
            });

            if (priceInfo.priceBookId === priceBookId) {
              newPrice = priceInfo.price;
            }
          } catch (error) {
            console.error("Error fetching product price:", error);
          }
        }

        return {
          ...item,
          price: newPrice,
        };
      })
    );

    updateActiveTab({
      selectedPriceBookId: priceBookId,
      cartItems: updatedCartItems,
    });
  };

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const createOrderPayment = useCreateOrderPayment();
  const createInvoicePayment = useCreateInvoicePayment();
  const createInvoiceFromOrder = useCreateInvoiceFromOrder();

  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(
    orderId ? Number(orderId) : 0
  );

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(
    invoiceId ? Number(invoiceId) : 0
  );

  const [showPriceWarning, setShowPriceWarning] = useState<{
    productCode: string;
    productName: string;
    onConfirm: (confirmed: boolean) => void;
  } | null>(null);

  const checkIsLastInvoice = () => {
    if (!existingOrder) return { isLast: false, discountAmount: 0 };

    const invoicedQtyMap: Record<number, number> = {};
    existingOrder.invoices
      ?.filter((inv: any) => inv.status !== 2)
      .forEach((inv: any) => {
        inv.details?.forEach((detail: any) => {
          invoicedQtyMap[detail.productId] =
            (invoicedQtyMap[detail.productId] || 0) + Number(detail.quantity);
        });
      });

    const currentQtyMap: Record<number, number> = {};
    activeTab.cartItems.forEach((item) => {
      currentQtyMap[item.product.id] =
        (currentQtyMap[item.product.id] || 0) + item.quantity;
    });

    const isLast = existingOrder.items?.every((item: any) => {
      const alreadyInvoiced = invoicedQtyMap[item.product.id] || 0;
      const inCurrentInvoice = currentQtyMap[item.product.id] || 0;
      return alreadyInvoiced + inCurrentInvoice >= Number(item.quantity);
    });

    const usedDiscount =
      existingOrder.invoices
        ?.filter((inv: any) => inv.status !== 2)
        .reduce(
          (sum: number, inv: any) => sum + Number(inv.discount || 0),
          0
        ) ?? 0;

    const discountAmount = Math.max(
      0,
      Number(existingOrder.discount || 0) - usedDiscount
    );

    return { isLast: !!isLast, discountAmount };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTabs = localStorage.getItem(STORAGE_KEY);
    const allTabs: Tab[] = [];

    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allTabs.push(...parsed);
        }
      } catch (error) {
        console.error("Error loading saved tabs:", error);
      }
    }

    const editTabs = loadAllEditTabsFromStorage();
    allTabs.push(...editTabs);

    if (allTabs.length > 0) {
      setTabs(allTabs);
      setActiveTabId(allTabs[0].id);
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) return;

    const savedPriceBookId = localStorage.getItem(PRICE_BOOK_STORAGE_KEY);
    if (savedPriceBookId) {
      const priceBookId = parseInt(savedPriceBookId, 10);
      if (!isNaN(priceBookId)) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) => ({
            ...tab,
            selectedPriceBookId: priceBookId,
          }))
        );
      }
    }
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || orderId || invoiceId) return;

    if (tabType) {
      const savedTabsStr = localStorage.getItem(STORAGE_KEY);
      const savedTabs: Tab[] = [];

      if (savedTabsStr) {
        try {
          const parsed = JSON.parse(savedTabsStr);
          if (Array.isArray(parsed)) {
            savedTabs.push(
              ...parsed.filter(
                (t: Tab) =>
                  !t.documentId &&
                  (t.cartItems.length > 0 || t.selectedCustomer)
              )
            );
          }
        } catch (error) {
          console.error("Error loading saved tabs:", error);
        }
      }

      const editTabs = loadAllEditTabsFromStorage();

      const tabsOfType = savedTabs.filter((t) => t.type === tabType);
      const newTabNumber = tabsOfType.length + 1;

      const newTab: Tab = {
        ...getDefaultTab(tabType),
        id: `tab-${Date.now()}`,
        label:
          tabType === "order"
            ? `Đơn hàng ${newTabNumber}`
            : `Hóa đơn ${newTabNumber}`,
      };

      const allTabs = [...savedTabs, ...editTabs, newTab];
      setTabs(allTabs);
      setActiveTabId(newTab.id);

      router.replace("/ban-hang", { scroll: false });
    }
  }, [tabType, isInitialized, orderId, invoiceId]);

  useEffect(() => {
    if (!isInitialized) return;

    const tabsToSave = tabs.filter((tab) => {
      if (tab.documentId && tab.isEditMode) {
        return false;
      }
      return tab.cartItems.length > 0 || tab.selectedCustomer;
    });

    if (tabsToSave.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsToSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [tabs, isInitialized]);

  useEffect(() => {
    if (!existingOrder || !orderId) return;

    const key = getEditStorageKey(Number(orderId), "order");
    const savedEditState = localStorage.getItem(key);

    let restoredState = null;
    if (savedEditState) {
      try {
        restoredState = JSON.parse(savedEditState);
        const lastModified = new Date(restoredState.lastModified);
        const orderUpdated = new Date(existingOrder.updatedAt);

        if (lastModified > orderUpdated) {
          toast.info("Đã khôi phục thay đổi chưa lưu của bạn");
        } else {
          restoredState = null;
        }
      } catch (error) {
        console.error("Error loading edit state:", error);
        restoredState = null;
      }
    }

    const cartItems: CartItem[] = restoredState
      ? restoredState.cartItems
      : existingOrder.items?.map((item: any) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
        })) || [];

    const editTab: Tab = {
      id: `edit-order-${orderId}`,
      type: "order",
      label: `Sửa ĐH #${existingOrder.code}`,
      code: existingOrder.code,
      cartItems,
      selectedCustomer: restoredState
        ? restoredState.selectedCustomer
        : existingOrder.customer || null,
      selectedPriceBookId: restoredState
        ? restoredState.selectedPriceBookId
        : null,
      orderNote: restoredState
        ? restoredState.orderNote
        : existingOrder.description || "",
      discount: restoredState
        ? restoredState.discount
        : Number(existingOrder.discount) || 0,
      discountRatio: restoredState
        ? restoredState.discountRatio
        : Number(existingOrder.discountRatio) || 0,
      useCOD: restoredState ? restoredState.useCOD : false,
      paymentAmount: restoredState ? restoredState.paymentAmount : 0,
      deliveryInfo: restoredState
        ? restoredState.deliveryInfo
        : {
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
      isEditMode: true,
    };

    const editKey = getEditStorageKey(existingOrder.id, "order");
    initialEditDataRef.current[editKey] = {
      cartItems: editTab.cartItems,
      selectedCustomer: editTab.selectedCustomer,
      selectedPriceBookId: editTab.selectedPriceBookId,
      orderNote: editTab.orderNote,
      discount: editTab.discount,
      discountRatio: editTab.discountRatio,
      paymentAmount: editTab.paymentAmount,
      deliveryInfo: editTab.deliveryInfo,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex(
        (t) => t.documentId === existingOrder.id && t.isEditMode
      );

      if (existingEditIndex >= 0) {
        const updated = [...prevTabs];
        updated[existingEditIndex] = editTab;
        return updated;
      } else {
        const nonEditTabs = prevTabs.filter((t) => !t.isEditMode);
        return [...nonEditTabs, editTab];
      }
    });

    setActiveTabId(`edit-order-${orderId}`);
  }, [existingOrder, orderId]);

  useEffect(() => {
    if (!existingInvoice || !invoiceId) return;

    const key = getEditStorageKey(Number(invoiceId), "invoice");
    const savedEditState = localStorage.getItem(key);

    let restoredState = null;
    if (savedEditState) {
      try {
        restoredState = JSON.parse(savedEditState);
        const lastModified = new Date(restoredState.lastModified);
        const invoiceUpdated = new Date(existingInvoice.updatedAt);

        if (lastModified > invoiceUpdated) {
          toast.info("Đã khôi phục thay đổi chưa lưu của bạn");
        } else {
          restoredState = null;
        }
      } catch (error) {
        console.error("Error loading edit state:", error);
        restoredState = null;
      }
    }

    const cartItems: CartItem[] = restoredState
      ? restoredState.cartItems
      : existingInvoice.details?.map((item: any) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
        })) || [];

    const editTab: Tab = {
      id: `edit-invoice-${invoiceId}`,
      type: "invoice",
      label: `Sửa HĐ #${existingInvoice.code}`,
      code: existingInvoice.code,
      cartItems,
      selectedCustomer: restoredState
        ? restoredState.selectedCustomer
        : existingInvoice.customer || null,
      selectedPriceBookId: restoredState
        ? restoredState.selectedPriceBookId
        : null,
      orderNote: restoredState
        ? restoredState.orderNote
        : existingInvoice.description || "",
      discount: restoredState
        ? restoredState.discount
        : Number(existingInvoice.discount) || 0,
      discountRatio: restoredState
        ? restoredState.discountRatio
        : Number(existingInvoice.discountRatio) || 0,
      useCOD: restoredState
        ? restoredState.useCOD
        : existingInvoice.usingCod || false,
      paymentAmount: restoredState ? restoredState.paymentAmount : 0,
      deliveryInfo: restoredState
        ? restoredState.deliveryInfo
        : existingInvoice.delivery
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
      isEditMode: true,
    };

    const editKey = getEditStorageKey(existingInvoice.id, "invoice");
    initialEditDataRef.current[editKey] = {
      cartItems: editTab.cartItems,
      selectedCustomer: editTab.selectedCustomer,
      selectedPriceBookId: editTab.selectedPriceBookId,
      orderNote: editTab.orderNote,
      discount: editTab.discount,
      discountRatio: editTab.discountRatio,
      paymentAmount: editTab.paymentAmount,
      deliveryInfo: editTab.deliveryInfo,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex(
        (t) => t.documentId === existingInvoice.id && t.isEditMode
      );

      if (existingEditIndex >= 0) {
        const updated = [...prevTabs];
        updated[existingEditIndex] = editTab;
        return updated;
      } else {
        const nonEditTabs = prevTabs.filter((t) => !t.isEditMode);
        return [...nonEditTabs, editTab];
      }
    });

    setActiveTabId(`edit-invoice-${invoiceId}`);
  }, [existingInvoice, invoiceId]);

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleConvertToInvoice = () => {
    if (!activeTab.documentId || activeTab.type !== "order") {
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

  const doCreateInvoice = async () => {
    const actualPayment = activeTab.paymentAmount || 0;

    const originalItems =
      existingOrder?.items?.map((item: any) => ({
        productId: item.product.id,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount) || 0,
        note: item.note || "",
      })) || [];

    const currentItems = activeTab.cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      note: item.note || "",
    }));

    const hasCartChanges =
      JSON.stringify(currentItems) !== JSON.stringify(originalItems);

    try {
      if (hasCartChanges) {
        const documentData: any = {
          customerId: activeTab.selectedCustomer.id,
          branchId: selectedBranch?.id,
          discountAmount: Number(activeTab.discount) || 0,
          discountRatio: Number(activeTab.discountRatio) || 0,
          purchaseDate: new Date().toISOString(),
          description: activeTab.orderNote,
          paidAmount: Number(actualPayment) || 0,
          items: activeTab.cartItems.map((item) => {
            const price = Number(item.price);
            const quantity = Number(item.quantity);
            const discount = Number(item.discount) || 0;
            return {
              productId: Number(item.product.id),
              productCode: item.product.code,
              productName: item.product.name,
              quantity,
              price,
              discount,
              discountRatio: 0,
              totalPrice: (price - discount) * quantity,
              note: item.note || "",
            };
          }),
        };

        if (activeTab.deliveryInfo.receiver) {
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

        const result = await createInvoice.mutateAsync(documentData);

        if (result?.id) {
          await invoicesApi.linkOrderToInvoice(
            result.id,
            activeTab.sourceOrderId
          );
        }
      } else {
        await createInvoiceFromOrder.mutateAsync({
          orderId: activeTab.sourceOrderId,
          additionalPayment: actualPayment,
        });
      }

      setLastInvoiceModal(null);
      handleCloseTab(activeTabId);
      toast.success("Tạo hóa đơn thành công");
      router.push("/don-hang/hoa-don");
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo hóa đơn");
    }
  };

  const handlePayment = async () => {
    if (!activeTab.sourceOrderId) {
      toast.error("Không tìm thấy thông tin đơn hàng gốc");
      return;
    }

    if (!selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error("Vui lòng chọn khách hàng");
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error("Vui lòng thêm sản phẩm vào hóa đơn");
      return;
    }

    const { isLast, discountAmount } = checkIsLastInvoice();

    if (isLast && discountAmount > 0 && !lastInvoiceModal) {
      setLastInvoiceModal({
        show: true,
        discountAmount,
        orderCode: existingOrder?.code || "",
      });
      return;
    }

    await doCreateInvoice();
  };

  const handleAddTab = () => {
    const currentType = activeTab.type;
    const tabsOfSameType = tabs.filter((t) => t.type === currentType);
    const newTabNumber = tabsOfSameType.length + 1;

    const newTab: Tab = {
      ...getDefaultTab(currentType),
      id: `tab-${Date.now()}`,
      label:
        currentType === "order"
          ? `Đơn hàng ${newTabNumber}`
          : `Hóa đơn ${newTabNumber}`,
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    const closingTab = tabs.find((t) => t.id === tabId);

    if (closingTab?.isEditMode && closingTab.documentId) {
      const key = getEditStorageKey(closingTab.documentId, closingTab.type);
      localStorage.removeItem(key);
    }

    if (tabs.length === 1) {
      const lastTab = tabs[0];
      if (lastTab.cartItems.length === 0 && !lastTab.documentId) {
        router.push("/ban-hang");
        return;
      }
      const newTab = getDefaultTab(lastTab.type);
      setTabs([newTab]);
      setActiveTabId(newTab.id);
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

    const hasData =
      activeTab.cartItems.length > 0 || activeTab.selectedCustomer;

    if (hasData) {
      const newTab: Tab = {
        ...getDefaultTab(newType),
        id: `tab-${Date.now()}`,
        label:
          newType === "order"
            ? `Đơn hàng ${newTabNumber}`
            : `Hóa đơn ${newTabNumber}`,
      };

      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);

      toast.success(
        `Đã tạo tab ${
          newType === "order" ? "đơn hàng" : "hóa đơn"
        } mới. Tab cũ được giữ lại.`
      );
    } else {
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
        documentId: undefined,
      });

      toast.success(
        `Đã chuyển sang tab ${newType === "order" ? "đơn hàng" : "hóa đơn"}`
      );
    }
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
  }, [activeTab?.cartItems, activeTabId]);

  useEffect(() => {
    if (!isInitialized) return;

    tabs.forEach((tab) => {
      if (tab.documentId && tab.isEditMode) {
        saveEditStateIfChanged(tab);
      }
    });
  }, [tabs, isInitialized]);

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

  const addToCart = async (product: any) => {
    const selectedPriceBookId = activeTab.selectedPriceBookId;

    let productPrice = Number(product.basePrice);
    let useBasePriceForProduct = false;

    if (selectedPriceBookId && selectedPriceBookId !== 0) {
      try {
        const priceInfo = await priceBooksApi.getPriceForProduct({
          productId: product.id,
          branchId: selectedBranch?.id,
        });

        if (priceInfo.priceBookId === selectedPriceBookId) {
          productPrice = priceInfo.price;
        } else {
          const shouldAdd = await new Promise<boolean>((resolve) => {
            const handleConfirm = (confirmed: boolean) => {
              setShowPriceWarning(null);
              resolve(confirmed);
            };

            setShowPriceWarning({
              productCode: product.code,
              productName: product.name,
              onConfirm: handleConfirm,
            });
          });

          if (!shouldAdd) return;

          useBasePriceForProduct = true;
          productPrice = Number(product.basePrice);
        }
      } catch (error) {
        console.error("Error fetching product price:", error);
        productPrice = Number(product.basePrice);
      }
    }

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
            price: productPrice,
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

  const handleSaveOrder = async () => {
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

        const key = getEditStorageKey(activeTab.documentId, "order");
        localStorage.removeItem(key);

        setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

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

        const key = getEditStorageKey(activeTab.documentId, "invoice");
        localStorage.removeItem(key);

        setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

        toast.success("Lưu hóa đơn thành công");
        router.push("/don-hang/hoa-don");
      } catch (error: any) {
        console.error("Save invoice error:", error);
        toast.error(error.message || "Không thể lưu hóa đơn");
      }
    }
  };

  const handleCreateDocument = async () => {
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

      handleCloseTab(activeTabId);

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

  if (!activeTab) {
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
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md ${
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

          {!activeTab?.documentId && (
            <>
              <button
                onClick={handleAddTab}
                className="px-3 py-2 rounded text-white hover:bg-white/20 font-medium">
                <Plus className="w-5 h-5" />
              </button>

              <button
                onClick={handleToggleType}
                className="px-3 py-2 rounded text-white hover:bg-white/20 font-medium">
                <ArrowLeftRight className="w-5 h-5" />
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
              selectedPriceBookId={activeTab.selectedPriceBookId}
              onSelectPriceBook={handlePriceBookSelect}
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
              isEditMode={!!activeTab.documentId && !activeTab.sourceOrderId}
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
              selectedPriceBookId={activeTab.selectedPriceBookId}
              onSelectPriceBook={handlePriceBookSelect}
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
      {showPriceWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              Cảnh báo
            </h3>
            <p className="text-gray-700 mb-6">
              Sản phẩm{" "}
              <span className="font-semibold">
                {showPriceWarning.productCode}
              </span>{" "}
              Hàng{" "}
              <span className="font-semibold">
                {showPriceWarning.productName}
              </span>{" "}
              vừa lựa chọn{" "}
              <span className="text-red-600 font-semibold">
                không thuộc bảng giá Bảng Giá Chuỗi Đào Matcha.
              </span>{" "}
              Bạn có muốn thêm vào đơn hàng?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => showPriceWarning.onConfirm(false)}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                Không
              </button>
              <button
                onClick={() => showPriceWarning.onConfirm(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Có
              </button>
            </div>
          </div>
        </div>
      )}
      {lastInvoiceModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Xác nhận hóa đơn cuối
            </h3>
            <p className="text-gray-700 mb-2">
              Đây là hóa đơn cuối của đơn hàng{" "}
              <span className="font-semibold">
                {lastInvoiceModal.orderCode}
              </span>
              .
            </p>
            <p className="text-gray-700 mb-6">
              Hóa đơn sẽ được áp giảm giá với số tiền{" "}
              <span className="font-semibold text-green-600">
                {new Intl.NumberFormat("vi-VN").format(
                  lastInvoiceModal.discountAmount
                )}
                đ
              </span>
              .
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setLastInvoiceModal(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
                Không
              </button>
              <button
                onClick={doCreateInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
