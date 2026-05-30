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
import { X, Plus, ArrowLeftRight, List, ShoppingCart } from "lucide-react";
import { useCreateOrderPayment } from "@/lib/hooks/useOrderPayments";
import { useCreateInvoicePayment } from "@/lib/hooks/useInvoicePayments";
import { InvoiceCart } from "@/components/pos/InvoiceCart";
import { InvoiceItemsList } from "@/components/pos/InvoiceItemsList";
import { priceBooksApi } from "@/lib/api";
import { queuePrintAfterRedirect } from "@/lib/utils/print";
import {
  getDefaultAddress,
  addressToDeliveryInfo,
} from "@/lib/utils/customer-address";
import { useAuthStore } from "@/lib/store/auth";
import { useCan } from "@/lib/hooks/useCan";
import { MobilePrintPreviewModal } from "@/components/pos/MobilePrintPreviewModal";

export interface CartItem {
  rowId: string;
  product: any;
  quantity: number;
  price: number;
  discount: number;
  note?: string;
  conditionType?: string; // "normal" | "damaged" | "near_expiry"
}

export interface DeliveryInfo {
  receiver: string;
  contactNumber: string;
  detailAddress: string;
  locationName: string;
  wardName: string;
  weight: number;
  weightUnit: string;
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
  selectedPriceBookName: string | null;
  orderNote: string;
  discount: number;
  discountRatio: number;
  useCOD: boolean;
  paymentAmount: number;
  paymentMethods: Array<{ method: string; amount: number; accountId?: number }>;
  deliveryInfo: DeliveryInfo;
  documentId?: number;
  sourceOrderId?: number;
  sourceOrder?: any;
  isEditMode?: boolean;
  selectedAddressId?: number | null;
  soldById: number | null;
}

const STORAGE_KEY = "pos-tabs";
const EDIT_STORAGE_KEY = "pos-edit-state";
const getPriceBookStorageKey = (userId?: number) =>
  `pos-selected-price-book-${userId || "default"}`;

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
  selectedPriceBookName: null,
  orderNote: "",
  discount: 0,
  discountRatio: 0,
  useCOD: false,
  paymentAmount: 0,
  paymentMethods: [],
  selectedAddressId: null,
  soldById: null,
  deliveryInfo: {
    receiver: "",
    contactNumber: "",
    detailAddress: "",
    locationName: "",
    wardName: "",
    weight: 0,
    weightUnit: "g",
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
  const { user } = useAuthStore();

  const canCreateOrder = useCan("orders", "create");
  const canCreateInvoice = useCan("invoices", "create");
  const canEditPrice = useCan("pos_price", "update");
  const canEditDiscount = useCan("pos_discount", "update");
  const canEditSeller = useCan("pos_seller", "update");
  const canViewInventory = useCan("pos_inventory", "view");
  const canViewPayment = useCan("pos_payment", "view");
  const canEditPayment = useCan("pos_payment", "update");

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const createOrderPayment = useCreateOrderPayment();
  const createInvoicePayment = useCreateInvoicePayment();
  const createInvoiceFromOrder = useCreateInvoiceFromOrder();

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [isInitialized, setIsInitialized] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  const [mobilePrintData, setMobilePrintData] = useState<{
    templateFor: string;
    entityId: number;
    entityType?: string;
    followUpDelivery?: boolean;
  } | null>(null);

  const handlePostCreate = (
    templateFor: string,
    entityId: number,
    targetUrl: string
  ) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    // Nếu là hóa đơn, sau khi in hóa đơn sẽ tự động in phiếu giao hàng
    const followUpDelivery = templateFor === "invoice";
    if (isMobile) {
      setMobilePrintData({ templateFor, entityId, followUpDelivery });
    } else {
      queuePrintAfterRedirect(templateFor, entityId, { followUpDelivery });
      router.push(targetUrl);
    }
  };

  const initialEditDataRef = useRef<{
    [key: string]: {
      cartItems: CartItem[];
      selectedCustomer: any;
      selectedPriceBookId: number | null;
      selectedPriceBookName: string | null;
      orderNote: string;
      discount: number;
      discountRatio: number;
      paymentAmount: number;
      deliveryInfo: DeliveryInfo;
    };
  }>({});

  const isInitialCartLoad = useRef<Record<string, boolean>>({});

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
      tab.selectedPriceBookName !== initialData.selectedPriceBookName ||
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
        selectedPriceBookName: tab.selectedPriceBookName,
        deliveryInfo: tab.deliveryInfo,
        timestamp: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(editState));
    }
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
              cartItems: (editState.cartItems || []).map((item: CartItem) => ({
                ...item,
                rowId:
                  item.rowId ??
                  `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
              })),
              selectedCustomer: editState.selectedCustomer || null,
              selectedPriceBookId: editState.selectedPriceBookId || null,
              selectedPriceBookName: editState.selectedPriceBookName || null,
              orderNote: editState.orderNote || "",
              discount: editState.discount || 0,
              discountRatio: editState.discountRatio || 0,
              useCOD: editState.useCOD || false,
              paymentAmount: editState.paymentAmount || 0,
              paymentMethods: [],
              soldById: editState.soldById ?? null,
              deliveryInfo: editState.deliveryInfo || {
                receiver: "",
                contactNumber: "",
                detailAddress: "",
                locationName: "",
                wardName: "",
                weight: 0,
                weightUnit: "g",
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
              selectedPriceBookName: editTab.selectedPriceBookName,
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

  const handlePriceBookSelect = async (
    priceBookId: number | null,
    priceBookName: string | null
  ) => {
    const storageKey = getPriceBookStorageKey(user?.id);
    if (priceBookId !== null) {
      localStorage.setItem(storageKey, priceBookId.toString());
    } else {
      localStorage.removeItem(storageKey);
    }

    const currentCartItems = activeTab.cartItems;

    if (currentCartItems.length === 0) {
      updateActiveTab({
        selectedPriceBookId: priceBookId,
        selectedPriceBookName: priceBookName,
      });
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
              priceBookId: priceBookId ?? undefined,
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
      selectedPriceBookName: priceBookName,
      cartItems: updatedCartItems,
    });
  };

  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(
    orderId ? Number(orderId) : 0
  );

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(
    invoiceId ? Number(invoiceId) : 0
  );

  const [mobilePosView, setMobilePosView] = useState<"items" | "cart">("items");

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

    const uniqueTabs = allTabs.filter(
      (tab, index, self) => self.findIndex((t) => t.id === tab.id) === index
    );

    if (uniqueTabs.length > 0) {
      setTabs(uniqueTabs);
      setActiveTabId(uniqueTabs[0].id);
    } else {
      const defaultType: TabType = canCreateOrder ? "order" : "invoice";
      const defaultTab = getDefaultTab(defaultType, "tab-1");
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    const storageKey = getPriceBookStorageKey(user.id);
    const savedPriceBookId = localStorage.getItem(storageKey);
    if (savedPriceBookId) {
      const priceBookId = parseInt(savedPriceBookId, 10);
      if (!isNaN(priceBookId)) {
        setTabs((prevTabs) =>
          prevTabs.map((tab) =>
            // Chỉ áp dụng cho tab TRỐNG HOÀN TOÀN (chưa có cart và chưa có khách)
            // Tab đã có data thì giữ nguyên selectedPriceBookId từ storage
            !tab.documentId &&
            !tab.isEditMode &&
            tab.cartItems.length === 0 &&
            !tab.selectedCustomer
              ? { ...tab, selectedPriceBookId: priceBookId }
              : tab
          )
        );
      }
    }
  }, [isInitialized, user?.id]);

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

    // Guard: chặn mở đơn nếu chi nhánh đang chọn lệch với chi nhánh đơn
    if (
      selectedBranch &&
      existingOrder.branchId &&
      existingOrder.branchId !== selectedBranch.id
    ) {
      toast.error(
        `Vui lòng đổi chi nhánh sang ${
          existingOrder.branch?.name || "chi nhánh của đơn"
        } để xem/sửa đơn này`
      );
      router.replace("/don-hang/dat-hang");
      return;
    }

    const editTabId = `edit-order-${orderId}`;

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

    const hasActiveInvoices = (existingOrder.invoices || []).some(
      (inv: any) => inv.status !== 2 && inv.status !== 5
    );

    if (hasActiveInvoices && !restoredState) {
      const invoiceTabId = `invoice-from-order-${orderId}`;

      const invoicedQuantities: Record<number, number> = {};
      (existingOrder.invoices || []).forEach((inv: any) => {
        if (inv.status !== 2 && inv.status !== 5) {
          (inv.details || []).forEach((d: any) => {
            invoicedQuantities[d.productId] =
              (invoicedQuantities[d.productId] || 0) + Number(d.quantity);
          });
        }
      });

      const remainingCartItems: CartItem[] = (existingOrder.items || [])
        .map((item: any) => {
          const invoiced = invoicedQuantities[item.product?.id] || 0;
          const remaining = Number(item.quantity) - invoiced;
          if (remaining <= 0) return null;
          return {
            rowId: `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
            product: item.product,
            quantity: remaining,
            price: Number(item.price),
            discount: Number(item.discount) || 0,
            note: item.note || "",
            conditionType: item.conditionType || "normal",
          };
        })
        .filter(Boolean) as CartItem[];
      1;

      if (remainingCartItems.length === 0) {
        toast.info("Đơn hàng đã được xuất hóa đơn toàn bộ");
        return;
      }

      const invoiceTab: Tab = {
        id: invoiceTabId,
        type: "invoice",
        label: `HĐ từ ĐH #${existingOrder.code}`,
        cartItems: remainingCartItems,
        selectedCustomer: existingOrder.customer || null,
        selectedPriceBookId: existingOrder.priceBookId || null,
        selectedPriceBookName: existingOrder.priceBookName || null,
        orderNote: existingOrder.description || "",
        discount: 0,
        discountRatio: 0,
        useCOD: false,
        paymentAmount: 0,
        paymentMethods: [],
        soldById: existingOrder.soldById ?? null,
        deliveryInfo: {
          receiver: existingOrder.delivery?.receiver || "",
          contactNumber: existingOrder.delivery?.contactNumber || "",
          detailAddress: existingOrder.delivery?.address || "",
          locationName: existingOrder.delivery?.locationName || "",
          wardName: existingOrder.delivery?.wardName || "",
          weight: Number(existingOrder.delivery?.weight) || 0,
          weightUnit: existingOrder.delivery?.weightUnit || "g",
          length: Number(existingOrder.delivery?.length) || 10,
          width: Number(existingOrder.delivery?.width) || 10,
          height: Number(existingOrder.delivery?.height) || 10,
          noteForDriver: existingOrder.delivery?.noteForDriver || "",
        },
        sourceOrderId: existingOrder.id,
        sourceOrder: existingOrder,
      };

      setTabs((prevTabs) => {
        if (prevTabs.find((t) => t.id === invoiceTabId)) {
          return prevTabs;
        }
        return [...prevTabs, invoiceTab];
      });

      setActiveTabId(invoiceTabId);
      return;
    }

    const cartItems: CartItem[] = restoredState
      ? restoredState.cartItems.map((item: CartItem) => ({
          ...item,
          rowId:
            item.rowId ??
            `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
        }))
      : existingOrder.items?.map((item: any) => ({
          rowId: `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
        })) || [];

    const editTab: Tab = {
      id: editTabId,
      type: "order",
      label: `Sửa ĐH #${existingOrder.code}`,
      code: existingOrder.code,
      cartItems,
      selectedCustomer: restoredState
        ? restoredState.selectedCustomer
        : existingOrder.customer || null,
      selectedPriceBookId: restoredState
        ? restoredState.selectedPriceBookId
        : existingOrder.priceBookId || null,
      selectedPriceBookName: restoredState
        ? restoredState.selectedPriceBookName
        : existingOrder.priceBookName || null,
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
      paymentMethods: [],
      soldById: existingOrder.soldById ?? null,
      deliveryInfo: restoredState
        ? restoredState.deliveryInfo
        : {
            receiver: existingOrder.delivery?.receiver || "",
            contactNumber: existingOrder.delivery?.contactNumber || "",
            detailAddress: existingOrder.delivery?.address || "",
            locationName: existingOrder.delivery?.locationName || "",
            wardName: existingOrder.delivery?.wardName || "",
            weight: Number(existingOrder.delivery?.weight) || 0,
            weightUnit: existingOrder.delivery?.weightUnit || "g",
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
      selectedPriceBookName: editTab.selectedPriceBookName,
      orderNote: editTab.orderNote,
      discount: editTab.discount,
      discountRatio: editTab.discountRatio,
      paymentAmount: editTab.paymentAmount,
      deliveryInfo: editTab.deliveryInfo,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex((t) => t.id === editTabId);

      if (existingEditIndex >= 0) {
        const updatedTabs = [...prevTabs];
        updatedTabs[existingEditIndex] = editTab;
        return updatedTabs;
      } else {
        return [...prevTabs.filter((t) => t.id !== editTabId), editTab];
      }
    });

    setActiveTabId(editTabId);
  }, [existingOrder?.id, orderId, selectedBranch?.id]);

  useEffect(() => {
    if (!existingInvoice || !invoiceId) return;

    // Guard: chặn mở hóa đơn nếu chi nhánh đang chọn lệch với chi nhánh hóa đơn
    if (
      selectedBranch &&
      existingInvoice.branchId &&
      existingInvoice.branchId !== selectedBranch.id
    ) {
      toast.error(
        `Vui lòng đổi chi nhánh sang ${
          existingInvoice.branch?.name || "chi nhánh của hóa đơn"
        } để xem/sửa hóa đơn này`
      );
      router.replace("/don-hang/dat-hang");
      return;
    }

    const editTabId = `edit-invoice-${invoiceId}`;
    const existingTab = tabs.find((t) => t.id === editTabId);

    if (existingTab) {
      if (existingTab.cartItems.length > 0) {
        setActiveTabId(editTabId);
        return;
      }
    }

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
      ? restoredState.cartItems.map((item: CartItem) => ({
          ...item,
          rowId:
            item.rowId ??
            `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
        }))
      : existingInvoice.details?.map((item: any) => ({
          rowId: `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
        })) || [];

    const editTab: Tab = {
      id: editTabId,
      type: "invoice",
      label: `Sửa HĐ #${existingInvoice.code}`,
      code: existingInvoice.code,
      cartItems,
      selectedCustomer: restoredState
        ? restoredState.selectedCustomer
        : existingInvoice.customer || null,
      selectedPriceBookId: restoredState
        ? restoredState.selectedPriceBookId
        : existingInvoice.priceBookId || null,
      selectedPriceBookName: restoredState
        ? restoredState.selectedPriceBookName
        : existingInvoice.priceBookName || null,
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
      paymentMethods: [],
      soldById: existingInvoice.soldById ?? null,
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
              weightUnit: existingInvoice.delivery?.weightUnit || "g",
              length: Number(existingInvoice.delivery.length) || 10,
              width: Number(existingInvoice.delivery.width) || 10,
              height: Number(existingInvoice.delivery.height) || 10,
              noteForDriver: existingInvoice.delivery.noteForDriver || "",
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
      selectedPriceBookName: editTab.selectedPriceBookName,
      orderNote: editTab.orderNote,
      discount: editTab.discount,
      discountRatio: editTab.discountRatio,
      paymentAmount: editTab.paymentAmount,
      deliveryInfo: editTab.deliveryInfo,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex((t) => t.id === editTabId);

      if (existingEditIndex >= 0) {
        const updatedTabs = [...prevTabs];
        updatedTabs[existingEditIndex] = editTab;
        return updatedTabs;
      } else {
        const nonEditTabs = prevTabs.filter(
          (t) => !t.isEditMode || t.id !== editTabId
        );
        return [...nonEditTabs, editTab];
      }
    });

    setActiveTabId(editTabId);
  }, [existingInvoice?.id, invoiceId, selectedBranch?.id]);

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

    const order = existingOrder;
    if (!order) return;

    const invoicedQuantities: Record<number, number> = {};
    (order.invoices || []).forEach((inv: any) => {
      if (inv.status !== 5) {
        (inv.details || []).forEach((d: any) => {
          invoicedQuantities[d.productId] =
            (invoicedQuantities[d.productId] || 0) + Number(d.quantity);
        });
      }
    });

    const remainingCartItems: CartItem[] = (order.items || [])
      .map((item: any) => {
        const invoiced = invoicedQuantities[item.productId] || 0;
        const remaining = Number(item.quantity) - invoiced;
        return {
          rowId: `${item.productId}_normal_${Date.now()}_${Math.random()}`,
          product: item.product,
          quantity: remaining,
          price: Number(item.price),
          discount: Number(item.discount) || 0,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
        };
      })
      .filter((item: CartItem) => item.quantity > 0);

    if (remainingCartItems.length === 0) {
      toast.error("Tất cả sản phẩm trong đơn hàng đã được xuất hóa đơn");
      return;
    }

    const usedDiscount = (order.invoices || [])
      .filter((inv: any) => inv.status !== 5)
      .reduce((sum: number, inv: any) => sum + Number(inv.discount || 0), 0);
    const remainingDiscount = Number(order.discount || 0) - usedDiscount;

    setTabs(
      tabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              type: "invoice" as TabType,
              label: "Tạo hóa đơn",
              sourceOrderId: tab.documentId,
              sourceOrder: order,
              documentId: undefined,
              selectedAddressId: null,
              cartItems: remainingCartItems,
              selectedCustomer: order.customer || tab.selectedCustomer,
              selectedPriceBookId: order.priceBookId ?? tab.selectedPriceBookId,
              selectedPriceBookName:
                order.priceBookName ?? tab.selectedPriceBookName,
              discount: remainingDiscount > 0 ? remainingDiscount : 0,
              discountRatio: 0,
              paymentAmount: 0,
            }
          : tab
      )
    );

    toast.success("Chuyển sang giao diện tạo hóa đơn");
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

    const actualPayment = activeTab.paymentAmount || 0;

    try {
      const payments =
        activeTab.paymentMethods && activeTab.paymentMethods.length > 0
          ? activeTab.paymentMethods
          : actualPayment > 0
            ? [{ method: "cash", amount: actualPayment }]
            : [];

      const result = await createInvoiceFromOrder.mutateAsync({
        orderId: activeTab.sourceOrderId,
        additionalPayment: actualPayment,
        payments: payments,
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
            conditionType: item.conditionType || "normal",
          };
        }),
      });

      handleCloseTab(activeTabId);
      toast.success("Tạo hóa đơn thành công");
      if (result?.id) {
        handlePostCreate("invoice", result.id, "/don-hang/hoa-don");
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo hóa đơn");
    }
  };

  const handleAddTab = () => {
    const currentType = activeTab.type;
    if (currentType === "order" && !canCreateOrder) return;
    if (currentType === "invoice" && !canCreateInvoice) return;

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

    if (!closingTab) {
      console.warn("Tab not found:", tabId);
      return;
    }

    if (closingTab.isEditMode && closingTab.documentId) {
      const key = getEditStorageKey(closingTab.documentId, closingTab.type);
      localStorage.removeItem(key);
      delete initialEditDataRef.current[key];
    }

    if (tabs.length === 1) {
      const lastTab = tabs[0];
      if (lastTab && lastTab.cartItems.length === 0 && !lastTab.documentId) {
        router.push("/ban-hang");
        return;
      }
      const newTab = getDefaultTab(lastTab?.type || "order");
      setTabs([newTab]);
      setActiveTabId(newTab.id);
      return;
    }

    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);

    if (newTabs.length === 0) {
      const newTab = getDefaultTab("order");
      setTabs([newTab]);
      setActiveTabId(newTab.id);
      return;
    }

    if (tabId === activeTabId) {
      const newActiveIndex = Math.max(0, tabIndex - 1);
      const newActiveTab = newTabs[newActiveIndex];
      if (newActiveTab) {
        setActiveTabId(newActiveTab.id);
      }
    }

    setTabs(newTabs);
  };

  const handleToggleType = () => {
    const currentType = activeTab.type;
    const newType: TabType = currentType === "order" ? "invoice" : "order";

    if (newType === "order" && !canCreateOrder) return;
    if (newType === "invoice" && !canCreateInvoice) return;

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
          weightUnit: "g",
          length: 10,
          width: 10,
          height: 10,
          noteForDriver: "",
        },
        documentId: undefined,
        selectedAddressId: null,
      });

      toast.success(
        `Đã chuyển sang tab ${newType === "order" ? "đơn hàng" : "hóa đơn"}`
      );
    }
  };

  useEffect(() => {
    if (!activeTab) return;

    // Skip auto-calc weight lần đầu khi load đơn từ DB (giữ weight DB đã đúng).
    // Effect chỉ chạy bình thường khi user thực sự thêm/xóa/sửa SL trong cart.
    const loadKey = `${activeTab.id}-${activeTab.documentId ?? "new"}`;
    if (activeTab.isEditMode && !isInitialCartLoad.current[loadKey]) {
      isInitialCartLoad.current[loadKey] = true;
      return;
    }

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
    if (!customer) {
      updateActiveTab({
        selectedCustomer: null,
        deliveryInfo: {
          receiver: "",
          contactNumber: "",
          detailAddress: "",
          locationName: "",
          wardName: "",
          weight: 0,
          weightUnit: "g",
          length: 10,
          width: 10,
          height: 10,
          noteForDriver: "",
        },
      });
      return;
    }

    const defaultAddr = getDefaultAddress(customer.addresses);
    const fill = addressToDeliveryInfo(customer, defaultAddr);

    updateActiveTab({
      selectedCustomer: customer,
      deliveryInfo: {
        ...activeTab.deliveryInfo,
        ...fill,
      },
    });
  };

  const handleSelectAddress = (address: any) => {
    if (!activeTab.selectedCustomer) return;
    const fill = addressToDeliveryInfo(activeTab.selectedCustomer, address);
    updateActiveTab({
      deliveryInfo: {
        ...activeTab.deliveryInfo,
        ...fill,
      },
      selectedAddressId: address.id,
    });
  };

  const addToCart = async (
    product: any,
    conditionType: string = "normal",
    quantity: number = 1
  ) => {
    const selectedPriceBookId = activeTab.selectedPriceBookId;

    let productPrice = Number(product.basePrice);

    if (selectedPriceBookId && selectedPriceBookId !== 0) {
      try {
        const priceInfo = await priceBooksApi.getPriceForProduct({
          productId: product.id,
          branchId: selectedBranch?.id,
          priceBookId: selectedPriceBookId ?? undefined,
        });

        if (priceInfo.priceBookId === selectedPriceBookId) {
          // Sản phẩm có trong bảng giá → dùng giá bảng giá
          productPrice = priceInfo.price;
        } else {
          // Sản phẩm không có trong bảng giá → fallback basePrice + cảnh báo
          productPrice = Number(product.basePrice);
          toast.warning(
            `Sản phẩm "${product.name}" không có trong bảng giá đang chọn, dùng giá gốc ${productPrice.toLocaleString()}`
          );
        }
      } catch (error) {
        console.error("Error fetching product price:", error);
        productPrice = Number(product.basePrice);
      }
    }

    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              cartItems: [
                {
                  rowId: `${product.id}_${conditionType}_${Date.now()}`,
                  product,
                  quantity,
                  price: productPrice,
                  discount: 0,
                  conditionType,
                },
                ...tab.cartItems,
              ],
            }
          : tab
      )
    );

    // Auto-switch to "items" tab on mobile after adding product
    setMobilePosView("items");
  };

  const updateCartItem = (rowId: string, updates: Partial<CartItem>) => {
    updateActiveTab({
      cartItems: activeTab.cartItems.map((item) =>
        item.rowId === rowId ? { ...item, ...updates } : item
      ),
    });
  };

  const removeFromCart = (rowId: string) => {
    updateActiveTab({
      cartItems: activeTab.cartItems.filter((item) => item.rowId !== rowId),
    });
  };

  const duplicateCartItem = (item: CartItem) => {
    const index = activeTab.cartItems.findIndex((i) => i.rowId === item.rowId);
    const newItem: CartItem = {
      rowId: `${item.product.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
      product: item.product,
      quantity: 1,
      price: item.price,
      discount: item.discount,
      conditionType: item.conditionType,
      note: "",
    };
    const newCartItems = [...activeTab.cartItems];
    newCartItems.splice(index + 1, 0, newItem);
    updateActiveTab({ cartItems: newCartItems });
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
        soldById: activeTab.soldById ?? user?.id,
        priceBookId: activeTab.selectedPriceBookId ?? 0,
        orderDate: new Date().toISOString(),
        orderStatus: existingOrder.orderStatus,
        description: activeTab.orderNote,
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
          conditionType: item.conditionType || "normal",
        })),
        delivery: {
          receiver: activeTab.deliveryInfo.receiver,
          contactNumber: activeTab.deliveryInfo.contactNumber,
          address: activeTab.deliveryInfo.detailAddress,
          locationName: activeTab.deliveryInfo.locationName,
          wardName: activeTab.deliveryInfo.wardName,
          weight: Number(activeTab.deliveryInfo.weight) || 0,
          weightUnit: activeTab.deliveryInfo.weightUnit || "g",
          length: Number(activeTab.deliveryInfo.length) || 10,
          width: Number(activeTab.deliveryInfo.width) || 10,
          height: Number(activeTab.deliveryInfo.height) || 10,
          noteForDriver: activeTab.deliveryInfo.noteForDriver,
        },
      };

      try {
        if (actualPayment > 0) {
          const payments =
            activeTab.paymentMethods && activeTab.paymentMethods.length > 0
              ? activeTab.paymentMethods
              : [{ method: "cash", amount: actualPayment }];

          for (const payment of payments) {
            await createOrderPayment.mutateAsync({
              orderId: activeTab.documentId,
              amount: payment.amount,
              paymentMethod: payment.method,
              accountId: payment.accountId,
              description: `Thanh toán bổ sung - ${payment.method}`,
            });
          }
        }

        await updateOrder.mutateAsync({
          id: activeTab.documentId,
          data: orderData,
        });

        const key = getEditStorageKey(activeTab.documentId, "order");
        localStorage.removeItem(key);

        setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

        // QUEUE PRINT
        toast.success("Lưu đơn hàng thành công");
        handlePostCreate("order", activeTab.documentId, "/don-hang/dat-hang");
      } catch (error: any) {
        console.error("Save order error:", error);
        toast.error(error.message || "Không thể lưu đơn hàng");
      }
    }
  };

  const handleSaveInvoice = async () => {
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

    if (!existingInvoice) {
      toast.error("Không tìm thấy thông tin hóa đơn");
      return;
    }

    const actualPayment = activeTab.paymentAmount || 0;

    const invoiceData = {
      customerId: activeTab.selectedCustomer.id,
      branchId: selectedBranch?.id,
      soldById: activeTab.soldById ?? user?.id,
      priceBookId: activeTab.selectedPriceBookId ?? 0,
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
          totalPrice: (price - discount) * quantity,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
        };
      }),
      delivery: {
        receiver: activeTab.deliveryInfo.receiver,
        contactNumber: activeTab.deliveryInfo.contactNumber,
        address: activeTab.deliveryInfo.detailAddress,
        locationName: activeTab.deliveryInfo.locationName,
        wardName: activeTab.deliveryInfo.wardName,
        weight: Number(activeTab.deliveryInfo.weight) || 0,
        weightUnit: activeTab.deliveryInfo.weightUnit || "g",
        length: Number(activeTab.deliveryInfo.length) || 10,
        width: Number(activeTab.deliveryInfo.width) || 10,
        height: Number(activeTab.deliveryInfo.height) || 10,
        noteForDriver: activeTab.deliveryInfo.noteForDriver,
      },
    };

    try {
      if (actualPayment > 0) {
        const payments =
          activeTab.paymentMethods && activeTab.paymentMethods.length > 0
            ? activeTab.paymentMethods
            : [{ method: "cash", amount: actualPayment }];

        for (const payment of payments) {
          await createInvoicePayment.mutateAsync({
            invoiceId: activeTab.documentId,
            amount: payment.amount,
            paymentMethod: payment.method,
            accountId: payment.accountId,
            notes: `Thanh toán bổ sung - ${payment.method}`,
          });
        }
      }

      const updatedInvoice = await updateInvoice.mutateAsync({
        id: activeTab.documentId,
        data: invoiceData,
      });

      const key = getEditStorageKey(activeTab.documentId, "invoice");
      localStorage.removeItem(key);

      setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

      toast.success("Lưu hóa đơn thành công");
      handlePostCreate(
        "invoice",
        updatedInvoice?.id ?? activeTab.documentId,
        "/don-hang/hoa-don"
      );
    } catch (error: any) {
      console.error("Save invoice error:", error);
      toast.error(error.message || "Không thể lưu hóa đơn");
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
      soldById: activeTab.soldById ?? user?.id,
      discountAmount: Number(activeTab.discount) || 0,
      discountRatio: Number(activeTab.discountRatio) || 0,
      priceBookId: activeTab.selectedPriceBookId ?? 0,
    };

    if (activeTab.type === "order") {
      documentData.orderDate = new Date().toISOString();
      documentData.orderStatus = "pending";
      documentData.description = activeTab.orderNote;
      documentData.depositAmount = Number(actualPayment) || 0;
      documentData.items = activeTab.cartItems.map((item) => ({
        productId: Number(item.product.id),
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        discount: Number(item.discount) || 0,
        discountRatio: 0,
        note: item.note || "",
        conditionType: item.conditionType || "normal",
      }));
      documentData.delivery = {
        receiver: activeTab.deliveryInfo.receiver,
        contactNumber: activeTab.deliveryInfo.contactNumber,
        address: activeTab.deliveryInfo.detailAddress,
        locationName: activeTab.deliveryInfo.locationName,
        wardName: activeTab.deliveryInfo.wardName,
        weight: Number(activeTab.deliveryInfo.weight) || 0,
        weightUnit: activeTab.deliveryInfo.weightUnit || "g",
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
          totalPrice: (price - discount) * quantity,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
        };
      });
      documentData.delivery = {
        receiver: activeTab.deliveryInfo.receiver,
        contactNumber: activeTab.deliveryInfo.contactNumber,
        address: activeTab.deliveryInfo.detailAddress,
        locationName: activeTab.deliveryInfo.locationName,
        wardName: activeTab.deliveryInfo.wardName,
        weight: Number(activeTab.deliveryInfo.weight) || 0,
        weightUnit: activeTab.deliveryInfo.weightUnit || "g",
        length: Number(activeTab.deliveryInfo.length) || 10,
        width: Number(activeTab.deliveryInfo.width) || 10,
        height: Number(activeTab.deliveryInfo.height) || 10,
        noteForDriver: activeTab.deliveryInfo.noteForDriver,
      };
    }

    try {
      try {
        let docId: number | undefined;

        if (activeTab.type === "order") {
          const result = await createOrder.mutateAsync(documentData);

          if (actualPayment > 0 && result?.order?.id) {
            const payments =
              activeTab.paymentMethods && activeTab.paymentMethods.length > 0
                ? activeTab.paymentMethods
                : [{ method: "cash", amount: actualPayment }];

            for (const payment of payments) {
              await createOrderPayment.mutateAsync({
                orderId: result.order.id,
                amount: payment.amount,
                paymentMethod: payment.method,
                description: `Thanh toán khi tạo đơn - ${payment.method}`,
              });
            }
          }

          docId = result?.order?.id;
        } else {
          const result = await createInvoice.mutateAsync(documentData);

          docId = result?.id;
        }

        handleCloseTab(activeTabId);

        if (docId) {
          handlePostCreate(
            activeTab.type === "order" ? "order" : "invoice",
            docId,
            activeTab.type === "order"
              ? "/don-hang/dat-hang"
              : "/don-hang/hoa-don"
          );
        }
      } catch (error: any) {
        console.error("Create document error:", error);
        toast.error(
          error.message ||
            `Không thể tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"}`
        );
      }
    } catch (error: any) {
      console.error("Create document error:", error);
      toast.error(
        error.message ||
          `Không thể tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"}`
      );
    }
  };

  if (!canCreateOrder && !canCreateInvoice) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500">
            Bạn chưa được cấp quyền tạo đơn hàng hoặc hóa đơn.
          </p>
        </div>
      </div>
    );
  }

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

  const tabsRow = (
    <div className="flex items-center gap-2 overflow-x-auto flex-shrink-0">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTabId(tab.id)}
          className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-1 lg:py-2 rounded cursor-pointer flex-shrink-0 ${
            tab.id === activeTabId ? "bg-white/30" : "hover:bg-white/20"
          }`}>
          <span className="text-white font-medium text-sm">{tab.label}</span>
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
      <button
        onClick={handleAddTab}
        className="px-2 lg:px-3 py-1 lg:py-2 rounded text-white hover:bg-white/20 font-medium flex-shrink-0">
        <Plus className="w-5 h-5" />
      </button>
      {canCreateOrder && canCreateInvoice && (
        <button
          onClick={handleToggleType}
          className="px-2 lg:px-3 py-1 lg:py-2 rounded text-white hover:bg-white/20 font-medium flex-shrink-0">
          <ArrowLeftRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-blue-600">
      {/* ══════════════════════════════════════════
          DESKTOP HEADER — chỉ hiện lg+, giữ nguyên
      ══════════════════════════════════════════ */}
      <div className="hidden lg:flex px-4 py-3 items-center gap-4 flex-shrink-0">
        <div className="flex-1 max-w-md">
          <ProductSearchDropdown
            onAddProduct={addToCart}
            selectedPriceBookId={activeTab.selectedPriceBookId}
          />
        </div>
        {tabsRow}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE HEADER — chỉ hiện dưới lg
      ══════════════════════════════════════════ */}
      <div className="lg:hidden px-2 pt-1.5 pb-1.5 flex flex-col gap-1.5 flex-shrink-0">
        {tabsRow}
        <ProductSearchDropdown
          onAddProduct={addToCart}
          selectedPriceBookId={activeTab.selectedPriceBookId}
        />
      </div>

      {/* ══════════════════════════════════════════
          BODY
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {activeTab.type === "order" ? (
          <>
            {/* Items panel */}
            <div
              className={`${
                mobilePosView === "items" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[60%] min-h-0 flex-1 lg:flex-none`}>
              <OrderItemsList
                cartItems={activeTab.cartItems}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                onDuplicateItem={duplicateCartItem}
                discount={activeTab.discount}
                onDiscountChange={(discount) => updateActiveTab({ discount })}
                discountRatio={activeTab.discountRatio}
                onDiscountRatioChange={(discountRatio) =>
                  updateActiveTab({ discountRatio })
                }
                orderNote={activeTab.orderNote}
                onOrderNoteChange={(orderNote) =>
                  updateActiveTab({ orderNote })
                }
                selectedCustomerId={activeTab.selectedCustomer?.id}
                canEditPrice={canEditPrice}
                canEditDiscount={canEditDiscount}
                canViewInventory={canViewInventory}
                className="w-full flex-1 bg-white flex flex-col min-h-0"
              />
              {/* Mobile action buttons */}
              <div className="lg:hidden flex-shrink-0 px-3 py-2 border-t bg-white">
                {activeTab.isEditMode ? (
                  <div className="flex gap-4">
                    {canCreateInvoice && (
                      <button
                        onClick={handleConvertToInvoice}
                        disabled={activeTab.cartItems.length === 0}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                        TẠO HÓA ĐƠN
                      </button>
                    )}
                    <button
                      onClick={() => handleSaveOrder()}
                      disabled={activeTab.cartItems.length === 0}
                      className="w-full bg-orange-400 text-white py-2 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                      LƯU
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateDocument()}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                    Tạo đơn hàng
                  </button>
                )}
              </div>
            </div>

            {/* Cart panel */}
            <div
              className={`${
                mobilePosView === "cart" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[40%] min-h-0 border-l flex-1 lg:flex-none`}>
              <OrderCart
                cartItems={activeTab.cartItems}
                selectedCustomer={activeTab.selectedCustomer}
                onSelectCustomer={handleCustomerSelect}
                selectedPriceBookId={activeTab.selectedPriceBookId}
                selectedPriceBookName={activeTab.selectedPriceBookName}
                onSelectPriceBook={handlePriceBookSelect}
                useCOD={activeTab.useCOD}
                onUseCODChange={(useCOD) => updateActiveTab({ useCOD })}
                paymentAmount={activeTab.paymentAmount}
                onPaymentAmountChange={(paymentAmount) =>
                  updateActiveTab({ paymentAmount })
                }
                onPaymentMethodsChange={(paymentMethods) =>
                  updateActiveTab({ paymentMethods })
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
                isEditMode={!!activeTab.isEditMode}
                existingOrder={activeTab.sourceOrder || existingOrder}
                documentType={activeTab.type}
                onSelectAddress={handleSelectAddress}
                selectedAddressId={activeTab.selectedAddressId}
                soldById={activeTab.soldById}
                onSellerChange={(soldById) => updateActiveTab({ soldById })}
                canEditSeller={canEditSeller}
                canViewPayment={canViewPayment}
                canEditPayment={canEditPayment}
                canCreateInvoice={canCreateInvoice}
                className="w-full h-full bg-white flex flex-col"
              />
            </div>
          </>
        ) : (
          <>
            {/* Invoice items panel */}
            <div
              className={`${
                mobilePosView === "items" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[60%] min-h-0 flex-1 lg:flex-none`}>
              <InvoiceItemsList
                cartItems={activeTab.cartItems}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                onDuplicateItem={duplicateCartItem}
                discount={activeTab.discount}
                onDiscountChange={(discount) => updateActiveTab({ discount })}
                discountRatio={activeTab.discountRatio}
                onDiscountRatioChange={(discountRatio) =>
                  updateActiveTab({ discountRatio })
                }
                orderNote={activeTab.orderNote}
                onOrderNoteChange={(orderNote) =>
                  updateActiveTab({ orderNote })
                }
                selectedCustomerId={activeTab.selectedCustomer?.id}
                canEditPrice={canEditPrice}
                canEditDiscount={canEditDiscount}
                canViewInventory={canViewInventory}
                className="w-full flex-1 bg-white flex flex-col min-h-0"
              />
              {/* Mobile action buttons */}
              <div className="lg:hidden flex-shrink-0 px-3 py-2 border-t bg-white">
                {activeTab.sourceOrderId ? (
                  <button
                    onClick={handlePayment}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                    THANH TOÁN
                  </button>
                ) : activeTab.documentId ? (
                  <button
                    onClick={() => handleSaveInvoice()}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-orange-400 text-white py-2 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                    LƯU
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateDocument()}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs">
                    Tạo hóa đơn
                  </button>
                )}
              </div>
            </div>

            {/* Invoice cart panel */}
            <div
              className={`${
                mobilePosView === "cart" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[40%] min-h-0 border-l flex-1 lg:flex-none`}>
              <InvoiceCart
                cartItems={activeTab.cartItems}
                selectedCustomer={activeTab.selectedCustomer}
                onSelectCustomer={handleCustomerSelect}
                useCOD={activeTab.useCOD}
                selectedPriceBookId={activeTab.selectedPriceBookId}
                selectedPriceBookName={activeTab.selectedPriceBookName}
                onSelectPriceBook={handlePriceBookSelect}
                onUseCODChange={(useCOD) => updateActiveTab({ useCOD })}
                paymentAmount={activeTab.paymentAmount}
                onPaymentAmountChange={(paymentAmount) =>
                  updateActiveTab({ paymentAmount })
                }
                onPaymentMethodsChange={(paymentMethods) =>
                  updateActiveTab({ paymentMethods })
                }
                onCreateOrder={handleCreateDocument}
                onSaveOrder={handleSaveInvoice}
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
                onSelectAddress={handleSelectAddress}
                selectedAddressId={activeTab.selectedAddressId}
                soldById={activeTab.soldById}
                onSellerChange={(soldById) => updateActiveTab({ soldById })}
                canEditSeller={canEditSeller}
                canViewPayment={canViewPayment}
                canEditPayment={canEditPayment}
                className="w-full h-full bg-white flex flex-col"
              />
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM TAB BAR — chỉ hiện dưới lg
          Không dùng fixed — tích hợp flex flow
      ══════════════════════════════════════════ */}
      <div className="lg:hidden flex-shrink-0 h-14 bg-white border-t flex">
        <button
          onClick={() => setMobilePosView("items")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            mobilePosView === "items"
              ? "text-blue-600 border-t-2 border-blue-600"
              : "text-gray-500"
          }`}>
          <List className="w-5 h-5" />
          <span className="text-xs font-medium">Hàng hóa</span>
        </button>

        <button
          onClick={() => setMobilePosView("cart")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
            mobilePosView === "cart"
              ? "text-blue-600 border-t-2 border-blue-600"
              : "text-gray-500"
          }`}>
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {activeTab.cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {activeTab.cartItems.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Giỏ hàng</span>
        </button>
      </div>

      {mobilePrintData && (
        <MobilePrintPreviewModal
          templateFor={mobilePrintData.templateFor}
          entityId={mobilePrintData.entityId}
          entityType={mobilePrintData.entityType}
          onClose={() => {
            const { followUpDelivery, entityId, templateFor } = mobilePrintData;
            setMobilePrintData(null);
            // Nếu vừa đóng modal in hóa đơn và có followUpDelivery, hiện tiếp modal phiếu giao hàng
            if (followUpDelivery && templateFor === "invoice") {
              setTimeout(() => {
                setMobilePrintData({
                  templateFor: "delivery",
                  entityId,
                  entityType: "invoice_delivery",
                  followUpDelivery: false,
                });
              }, 300);
            }
          }}
        />
      )}
    </div>
  );
}
