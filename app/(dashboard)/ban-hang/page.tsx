"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  useCreatePosInvoice,
  useUpdateInvoice,
  useInvoice,
  useCreatePosInvoiceFromOrder,
} from "@/lib/hooks/useInvoices";
import { toast } from "sonner";
import { X, Plus, ArrowLeftRight, List, ShoppingCart } from "lucide-react";
import { useCreateOrderPayment } from "@/lib/hooks/useOrderPayments";
import { useCreateInvoicePayment } from "@/lib/hooks/useInvoicePayments";
import { InvoiceCart } from "@/components/pos/InvoiceCart";
import { InvoiceItemsList } from "@/components/pos/InvoiceItemsList";
import {
  useCreateConsignment,
  useUpdateConsignment,
  useConsignment,
} from "@/lib/hooks/useConsignments";
import { priceBooksApi } from "@/lib/api";
import { ordersApi } from "@/lib/api/orders";
import { INVOICE_STATUS } from "@/lib/types/invoice";
import { ORDER_STATUS } from "@/lib/types/order";
import { promotionsApi } from "@/lib/api/promotions";
import { paymentNotesApi } from "@/lib/api/paymentNotes";
import type { AppliedPromotion } from "@/lib/types/promotion";
import {
  getDefaultAddress,
  addressToDeliveryInfo,
  findAddressFromDelivery,
} from "@/lib/utils/customer-address";
import { useAuthStore } from "@/lib/store/auth";
import { useCan } from "@/lib/hooks/useCan";
import { MobilePrintPreviewModal } from "@/components/pos/MobilePrintPreviewModal";
import {
  printEntity,
  printDeliverySlip,
  queuePrintAfterRedirect,
} from "@/lib/utils/print";
import { useLatestSalePrices } from "@/lib/hooks/useLatestSalePrices";
import { getPriceWarning, type PriceWarning } from "@/lib/utils/price-warning";
import { formatCurrency } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/LoadingButton";
import Swal from "sweetalert2";

export interface CartItem {
  rowId: string;
  product: any;
  quantity: number;
  price: number;
  discount: number;
  note?: string;
  conditionType?: string; // "normal" | "damaged" | "near_expiry"
  soldExpiryDate?: string; // lô cận date (YYYY-MM-DD) khi conditionType = near_expiry
  // ── Khuyến mãi tự động (inline, KiotViet-style) ──
  // Dòng quà/mua kèm do KM sinh ra
  isPromoGift?: boolean;
  promotionId?: number;
  promotionName?: string;
  promotionCode?: string;
  promoLineType?: "gift" | "discounted_buy";
  // Dòng thực tế trừ bucket PROMO: quà Y luôn true; hàng X phụ thuộc cấu hình CT.
  deductPromoStock?: boolean;
  triggerRowId?: string; // rowId dòng SP X kích hoạt CT (để chèn dưới + gỡ cùng)
  triggerProductId?: number; // productId X kích hoạt — dùng khi lưu/re-validate BE
  rewardOptions?: {
    productId: number;
    productCode?: string;
    productName?: string;
    availableStock: number;
    remaining?: number | null;
  }[];
  requiresChoice?: boolean; // dòng quà cần thu ngân chọn SP
  // Dòng quà cộng dồn: neo theo promotionId (không theo 1 triggerProductId).
  cumulative?: boolean;
  // Dòng SP thường: các promotionId được thu ngân bật áp dụng (opt-in).
  // KM chỉ sinh dòng quà khi promotionId nằm trong danh sách này.
  promoEnabledIds?: number[];
  // Dòng SP thường: các CT (id+tên+mã) đang khớp dòng này (để hiện icon 🎁 / badge mã KM)
  eligiblePromos?: {
    promotionId: number;
    name: string;
    code: string;
    cumulative?: boolean;
    matchedProductIds?: number[];
    deductPromoStock?: boolean;
  }[];
}

// Lựa chọn phân bổ quà cho 1 KM cộng dồn: mỗi SP quà nhận n suất.
export interface CumulativeGiftSelection {
  productId: number;
  productCode?: string;
  productName?: string;
  rewardTimes: number;
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

type TabType = "order" | "invoice" | "consignment";

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
  paymentNoteType: "cash" | "transfer" | null;
  // null = ô trống (chưa nhập). Bắt buộc có giá trị khi paymentNoteType = "cash".
  paymentNoteAmount: number | null;
  deliveryInfo: DeliveryInfo;
  documentId?: number;
  sourceOrderId?: number;
  sourceOrder?: any;
  isEditMode?: boolean;
  selectedAddressId?: number | null;
  soldById: number | null;
  consignStatus?: string;
  // fromPage = "dat-hang" | "hoa-don" → khi tạo xong sẽ redirect về trang này (dùng cho copy)
  fromPage?: string;
  // Phân bổ quà KM cộng dồn: { [promotionId]: các SP quà + số suất }.
  cumulativeGiftSelections?: Record<number, CumulativeGiftSelection[]>;
  // Opt-in KM cộng dồn ở cấp tab (áp cho MỌI dòng X thuộc CT, kể cả thêm sau).
  enabledCumulativePromoIds?: number[];
  // Tombstone cho CT cộng dồn user đã chủ động "Bỏ áp dụng". Tách riêng với
  // enabled=[] để vẫn hydrate đúng dữ liệu quà của HĐ/đơn cũ, nhưng không bật lại
  // CT mà user vừa tắt trong cùng tab.
  disabledCumulativePromoIds?: number[];
}

const STORAGE_KEY = "pos-tabs";
const EDIT_STORAGE_KEY = "pos-edit-state";

const getPriceBookStorageKey = (userId?: number) =>
  `pos-selected-price-book-${userId || "default"}`;

const getEditStorageKey = (id: number, type: TabType): string => {
  return `${EDIT_STORAGE_KEY}-${type}-${id}`;
};

/**
 * Tìm dòng quà KM chưa hoàn tất lựa chọn (chặn lưu/tạo).
 * - KM thường: requiresChoice=true (chưa chọn SP tặng).
 * - KM cộng dồn: placeholder product.id=0 hoặc requiresChoice=true (chưa phân bổ đủ suất).
 */
const findUnchosenGift = (cartItems: CartItem[]): CartItem | undefined =>
  cartItems.find(
    (it) =>
      it.isPromoGift &&
      (it.requiresChoice || (it.cumulative && !Number(it.product?.id))),
  );

/**
 * Dựng danh sách appliedPromotions gửi BE để re-validate KM.
 * - KM thường (không cumulative): 1 dòng quà → 1 applied {promotionId, triggerProductId,
 *   giftProductId, giftQuantity}.
 * - KM cộng dồn: gộp mọi dòng quà cùng promotionId → 1 applied với rewardSelections[]
 *   (mỗi SP quà = số suất). Không gửi triggerProductId.
 */
const buildAppliedPromotions = (
  cartItems: CartItem[],
  cumulativeGiftSelections?: Record<number, CumulativeGiftSelection[]>,
  enabledCumulativePromoIds?: number[],
): AppliedPromotion[] => {
  const applied: AppliedPromotion[] = [];

  // KM cộng dồn: dựng từ NGUỒN SỰ THẬT cấp tab (enabledCumulativePromoIds), KHÔNG
  // phụ thuộc dòng quà (dòng quà do effect sinh có debounce → có thể chưa kịp có).
  const enabledCum = enabledCumulativePromoIds || [];
  for (const promoId of enabledCum) {
    const selections = cumulativeGiftSelections?.[promoId] || [];
    applied.push({
      promotionId: promoId,
      rewardSelections: selections
        .filter((s) => s.rewardTimes > 0)
        .map((s) => ({ productId: s.productId, rewardTimes: s.rewardTimes })),
    });
  }

  for (const it of cartItems) {
    if (!it.isPromoGift || it.promotionId == null) continue;
    // Dòng quà cộng dồn đã xử lý ở trên (theo tab) → bỏ qua để tránh trùng.
    if (it.cumulative) continue;

    applied.push({
      promotionId: it.promotionId,
      triggerProductId: it.triggerProductId,
      giftProductId: Number(it.product.id),
      giftQuantity: Number(it.quantity),
    });
  }

  return applied;
};

/**
 * Chuẩn hóa loại dòng về "gift" | "discounted_buy" | "normal".
 * Dùng chung cho dòng đơn/HĐ (API) và dòng giỏ (CartItem).
 */
const normalizeLineType = (raw: {
  lineType?: string | null;
  isGift?: boolean | null;
  isPromoGift?: boolean | null;
  promoLineType?: string | null;
}): "gift" | "discounted_buy" | "normal" => {
  if (
    raw.lineType === "discounted_buy" ||
    raw.promoLineType === "discounted_buy"
  )
    return "discounted_buy";
  if (
    raw.lineType === "gift" ||
    raw.promoLineType === "gift" ||
    raw.isGift ||
    raw.isPromoGift
  )
    return "gift";
  return "normal";
};

/**
 * Sinh key nhận diện dòng, dùng CHUNG cho dòng đơn gốc và dòng giỏ:
 * - Dòng thường: `productId|normal|conditionType`. KHÔNG đưa promotionId vào key
 *   vì đơn gốc lưu promotionId ở dòng X điều kiện, còn giỏ chỉ dùng
 *   promoEnabledIds → nếu so promotionId sẽ lệch, báo thiếu nhầm.
 * - Dòng quà/mua kèm CÓ promotionId: so theo `lineType|promo:promotionId`
 *   (bỏ productId). KM cộng dồn có thể sinh lại dòng quà với sản phẩm khác so
 *   với lúc lưu đơn → chỉ cần KM đó còn quà trong giỏ là không thiếu.
 * - Dòng quà thủ công (không promotionId): so theo productId như dòng thường.
 */
const buildLineKey = (
  productId: number,
  lineType: "gift" | "discounted_buy" | "normal",
  promotionId: number | null,
  conditionType: string,
): string => {
  if (lineType !== "normal" && promotionId != null) {
    return `${lineType}|promo:${promotionId}`;
  }
  return `${productId}|${lineType}|${conditionType}`;
};

const getOrderLineKey = (item: any): string =>
  buildLineKey(
    Number(item.product?.id ?? item.productId) || 0,
    normalizeLineType(item),
    item.promotionId != null ? Number(item.promotionId) : null,
    item.conditionType || "normal",
  );

const getCartLineKey = (item: CartItem): string =>
  buildLineKey(
    Number(item.product?.id) || 0,
    normalizeLineType(item),
    item.promotionId != null ? Number(item.promotionId) : null,
    item.conditionType || "normal",
  );

export interface MissingOrderLine {
  productId: number;
  productName: string;
  lineType: "gift" | "discounted_buy" | "normal";
  promotionName?: string;
}

/**
 * Tìm các dòng của ĐƠN HÀNG bị thiếu HẲN (tổng đã xuất = 0) so với:
 * - tất cả HĐ đã tạo của đơn (bỏ HĐ hủy status=2 và HĐ đang sửa nếu có), CỘNG
 * - giỏ hiện tại (cartItems) đang chuẩn bị lưu/tạo.
 *
 * Đối chiếu theo buildLineKey: dòng thường so theo sản phẩm + conditionType;
 * dòng quà/mua kèm có promotionId so theo (loại dòng + promotionId) để KM cộng
 * dồn sinh lại quà khác sản phẩm vẫn không bị báo thiếu nhầm.
 *
 * @param excludeInvoiceId  bỏ HĐ này khỏi phần "đã xuất" (dùng khi đang sửa
 *   chính HĐ đó — phần đóng góp của nó được thay bằng cartItems).
 */
const findMissingOrderLines = (
  sourceOrder: any,
  cartItems: CartItem[],
  excludeInvoiceId?: number,
): MissingOrderLine[] => {
  if (!sourceOrder) return [];

  // (1) Gom dòng đơn gốc theo key.
  const orderLines = new Map<string, MissingOrderLine>();
  (sourceOrder.items || []).forEach((item: any) => {
    const pid = Number(item.product?.id ?? item.productId) || 0;
    if (!pid) return;
    const key = getOrderLineKey(item);
    if (!orderLines.has(key)) {
      orderLines.set(key, {
        productId: pid,
        productName: item.product?.name || item.productName || "",
        lineType: normalizeLineType(item),
        promotionName: item.promotion?.name || item.promotionName || undefined,
      });
    }
  });

  if (orderLines.size === 0) return [];

  // (2) Cộng dồn số lượng đã xuất theo key: từ HĐ hiện có + giỏ hiện tại.
  const issuedQtyByKey: Record<string, number> = {};
  (sourceOrder.invoices || []).forEach((inv: any) => {
    // Bỏ HĐ không tính vào số đã xuất (khớp logic hasShortfall sẵn có: status 2 và 5)
    // và HĐ đang sửa (excludeInvoiceId — phần đóng góp của nó thay bằng cartItems).
    if (inv.status === 2 || inv.status === 5) return;
    if (excludeInvoiceId != null && Number(inv.id) === Number(excludeInvoiceId))
      return;
    (inv.details || []).forEach((d: any) => {
      const key = getOrderLineKey(d);
      issuedQtyByKey[key] =
        (issuedQtyByKey[key] || 0) + Number(d.quantity || 0);
    });
  });

  cartItems.forEach((item) => {
    const key = getCartLineKey(item);
    issuedQtyByKey[key] =
      (issuedQtyByKey[key] || 0) + Number(item.quantity || 0);
  });

  // (3) Dòng đơn nào có tổng đã xuất = 0 → thiếu hẳn.
  const missing: MissingOrderLine[] = [];
  for (const [key, info] of orderLines) {
    if ((issuedQtyByKey[key] || 0) <= 0) {
      missing.push(info);
    }
  }
  return missing;
};

const LINE_TYPE_BADGE: Record<MissingOrderLine["lineType"], string> = {
  gift: "Quà KM",
  discounted_buy: "Mua kèm KM",
  normal: "",
};

/** Dựng HTML danh sách dòng thiếu hẳn cho Swal. */
const buildMissingLinesHtml = (missing: MissingOrderLine[]): string => {
  const rows = missing
    .map((m) => {
      const badgeText =
        LINE_TYPE_BADGE[m.lineType] ||
        (m.promotionName ? `KM: ${m.promotionName}` : "");
      const badge = badgeText
        ? ` <span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:11px;padding:1px 6px;border-radius:8px;margin-left:4px">${badgeText}</span>`
        : "";
      return `<li style="margin-bottom:2px">${m.productName || "(Không tên)"}${badge}</li>`;
    })
    .join("");
  return `<ul style="text-align:left;margin-top:8px;padding-left:18px;font-size:14px">${rows}</ul>`;
};

/**
 * Map dòng đơn/HĐ (API) → CartItem, khôi phục cờ KM:
 * - gift / discounted_buy → isPromoGift
 * - dòng thường: promoEnabledIds CHỈ từ promotionId của chính dòng đó
 * - gắn triggerRowId / promotionName cho dòng quà
 */
const mapDocumentLinesToCartItems = (
  lines: any[] | undefined | null,
): CartItem[] => {
  if (!lines?.length) return [];

  const mapped: CartItem[] = lines.map((item: any) => {
    const promoLineType =
      item.lineType === "discounted_buy"
        ? "discounted_buy"
        : item.isGift || item.lineType === "gift"
          ? "gift"
          : undefined;
    const rowId = `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`;
    if (promoLineType) {
      return {
        rowId,
        product: item.product,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount) || 0,
        note: item.note || "",
        conditionType: item.conditionType || "normal",
        soldExpiryDate: item.soldExpiryDate
          ? String(item.soldExpiryDate).slice(0, 10)
          : undefined,
        isPromoGift: true,
        promoLineType,
        promotionId:
          item.promotionId != null ? Number(item.promotionId) : undefined,
        promotionName: item.promotion?.name || item.promotionName || undefined,
        promotionCode: item.promotion?.code || item.promotionCode || undefined,
        deductPromoStock: promoLineType === "gift",
      };
    }
    const ownConditionType = item.conditionType || "normal";
    const ownPromoId =
      item.promotionId != null ? Number(item.promotionId) : null;
    // Chỉ opt-in KM cho đúng dòng có promotionId của chính nó (dòng X điều kiện).
    // Không suy từ dòng quà sibling → tránh gán nhầm KM cho dòng thường khác.
    // Chỉ hàng loại tồn 'normal' mới được KM — bỏ mọi stamp promotionId dính sai
    // trên dòng bục rách (damaged) / cận date (near_expiry) khi khôi phục đơn cũ.
    const promoEnabledIds =
      ownPromoId != null && ownConditionType === "normal" ? [ownPromoId] : [];
    return {
      rowId,
      product: item.product,
      quantity: Number(item.quantity),
      price: Number(item.price),
      discount: Number(item.discount) || 0,
      note: item.note || "",
      conditionType: item.conditionType || "normal",
      soldExpiryDate: item.soldExpiryDate
        ? String(item.soldExpiryDate).slice(0, 10)
        : undefined,
      promoEnabledIds,
      deductPromoStock:
        ownConditionType === "normal" &&
        item.promotion?.deductPromoStock === true,
    };
  });

  // Dữ liệu BE đã sắp gift ngay sau đúng dòng X. Khôi phục trigger theo thứ tự
  // thay vì luôn gắn vào dòng đầu tiên có cùng promotionId.
  for (let index = 0; index < mapped.length; index += 1) {
    const gift = mapped[index];
    if (!gift.isPromoGift) continue;
    const trigger = mapped
      .slice(0, index)
      .reverse()
      .find(
        (item) =>
          !item.isPromoGift &&
          gift.promotionId != null &&
          (item.promoEnabledIds || []).includes(gift.promotionId),
      );
    if (trigger) {
      gift.triggerRowId = trigger.rowId;
      gift.triggerProductId = Number(trigger.product?.id);
    }
  }

  return mapped;
};

const getLatestPaymentNote = (notes: any[] | undefined) => {
  const latest = Array.isArray(notes) && notes.length > 0 ? notes[0] : null;
  if (
    !latest ||
    (latest.paymentType !== "cash" && latest.paymentType !== "transfer")
  ) {
    return {
      type: null as "cash" | "transfer" | null,
      amount: null as number | null,
    };
  }
  return {
    type: latest.paymentType as "cash" | "transfer",
    amount: latest.amount == null ? null : Number(latest.amount),
  };
};

const getDefaultTab = (type: TabType = "order", forceId?: string): Tab => ({
  id: forceId || `tab-${Date.now()}`,
  type,
  label:
    type === "order"
      ? "Đơn hàng 1"
      : type === "consignment"
        ? "Ký gửi 1"
        : "Hóa đơn 1",
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
  paymentNoteType: null,
  paymentNoteAmount: null,
  selectedAddressId: null,
  soldById: null,
  consignStatus: "pending",
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
  const consignmentId = searchParams.get("consignmentId");
  const copyOrderId = searchParams.get("copyOrderId");
  const copyInvoiceId = searchParams.get("copyInvoiceId");
  const tabType = searchParams.get("type") as TabType | null;
  const fromPage = searchParams.get("from"); // nguồn gốc navigate: "dat-hang", "hoa-don", hoặc null
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
  const createPosInvoice = useCreatePosInvoice();
  const updateInvoice = useUpdateInvoice();
  const createOrderPayment = useCreateOrderPayment();
  const createInvoicePayment = useCreateInvoicePayment();
  const createConsignment = useCreateConsignment();
  const updateConsignment = useUpdateConsignment();
  const createPosInvoiceFromOrder = useCreatePosInvoiceFromOrder();

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [isInitialized, setIsInitialized] = useState(false);
  const fromPageRef = useRef<string | null>(fromPage);

  // ── Chống double-click tạo trùng (đơn/hóa đơn/thanh toán/lưu) ──
  // Ref đồng bộ: chặn click thứ 2 ngay cả khi đang await confirm (chưa re-render).
  // State: để disable nút + hiện spinner cho người dùng biết "đã ấn rồi".
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  const isPrepaidNoDebt = (customer: any) => {
    const policy = customer?.debtPolicy;
    return !!(
      policy?.isActive !== false &&
      policy?.debtForm === "PREPAID" &&
      !policy?.hasCreditLimit &&
      !policy?.hasTermDays
    );
  };

  const showPrepaidNoDebtWarning = (input: {
    paidAmount: number;
    grandTotal: number;
    fromOrder: boolean;
  }) => {
    toast.warning(
      input.fromOrder
        ? "Khách hàng thuộc hình thức Chuyển khoản ngay và loại Không công nợ. Đơn hàng chưa được thanh toán đủ nên không thể tạo hóa đơn. Vui lòng ghi nhận đủ tiền trên đơn hàng trước khi tạo hóa đơn."
        : "Khách hàng thuộc hình thức Chuyển khoản ngay và loại Không công nợ. Hóa đơn chưa được thanh toán đủ nên không thể tạo hóa đơn. Vui lòng thu đủ tiền trước khi tạo hóa đơn.",
      {
        description: `Đã thanh toán: ${formatCurrency(input.paidAmount)} / Cần thanh toán: ${formatCurrency(input.grandTotal)}`,
      },
    );
  };

  const assertPrepaidOrderCanBeInvoiced = async (orderId: number) => {
    const fresh = await ordersApi.getOrder(orderId);
    if (!isPrepaidNoDebt(fresh.customer)) return true;

    const paidAmount = Number(fresh.paidAmount || 0);
    const grandTotal = Number(fresh.grandTotal || 0);
    if (paidAmount + 1 < grandTotal) {
      showPrepaidNoDebtWarning({ paidAmount, grandTotal, fromOrder: true });
      return false;
    }
    return true;
  };

  // ── Cảnh báo lệch giá: so đơn giá hiện tại với giá bán gần nhất (hóa đơn) ──
  const activeProductIds = useMemo(
    () => (activeTab?.cartItems || []).map((item) => Number(item.product?.id)),
    [activeTab?.cartItems],
  );

  const { pricesByProduct, isLoading: isLoadingLatestPrices } =
    useLatestSalePrices(
      activeTab?.selectedCustomer?.id,
      activeProductIds,
      "invoice",
      selectedBranch?.id,
    );

  // Map rowId → cảnh báo lệch giá (null nếu không lệch). Tự cập nhật khi đổi
  // khách hàng, đổi sản phẩm hoặc sửa đơn giá.
  const priceWarnings = useMemo(() => {
    const map: Record<string, PriceWarning | null> = {};
    (activeTab?.cartItems || []).forEach((item) => {
      const latestPrice = pricesByProduct[Number(item.product?.id)];
      const currentPrice = item.price - item.discount;
      map[item.rowId] = getPriceWarning(currentPrice, latestPrice);
    });
    return map;
  }, [activeTab?.cartItems, pricesByProduct]);

  // ════════════════════════════════════════════════════════════
  // KHUYẾN MÃI TỰ ĐỘNG (inline, KiotViet-style)
  // Quan sát các dòng "thường" trong giỏ → gọi /promotions/evaluate →
  // tự thêm/gỡ dòng quà (isPromoGift) ngay dưới dòng SP kích hoạt.
  // ════════════════════════════════════════════════════════════
  const promoSyncRef = useRef<string>("");
  // Tiến độ tích lũy KM sinh quà theo tab (để render khối "Khuyến mãi của đơn hàng").
  const [promoProgressByTab, setPromoProgressByTab] = useState<
    Record<string, import("@/lib/types/promotion").PromotionProgress[]>
  >({});

  useEffect(() => {
    if (!activeTab) return;
    const branchId = selectedBranch?.id;
    const tabId = activeTab.id;
    // Chỉ hàng loại tồn 'normal' mới tham gia KM. Hàng bục rách (damaged) / cận date
    // (near_expiry) KHÔNG tính vào ngưỡng, không sinh quà, không hiện badge KM.
    const normalItems = (activeTab.cartItems || []).filter(
      (it) => !it.isPromoGift && (it.conditionType || "normal") === "normal",
    );

    // Chữ ký đầu vào để tránh chạy lặp vô hạn (effect tự sửa cartItems)
    const signature = JSON.stringify({
      tabId,
      branchId,
      customerId: activeTab.selectedCustomer?.id,
      userId: activeTab.soldById ?? user?.id,
      items: normalItems.map((it) => ({
        rowId: it.rowId,
        productId: Number(it.product?.id),
        quantity: Number(it.quantity),
        price: Number(it.price),
        discount: Number(it.discount) || 0,
        enabled: it.promoEnabledIds || [],
        giftChoice: it.rowId, // placeholder để chữ ký đổi khi cần
      })),
      // lựa chọn quà hiện tại
      choices: (activeTab.cartItems || [])
        .filter((it) => it.isPromoGift)
        .map((it) => ({
          t: it.triggerRowId,
          p: it.promotionId,
          g: it.product?.id,
        })),
      // phân bổ quà KM cộng dồn (đổi → sinh lại dòng quà)
      cumSel: activeTab.cumulativeGiftSelections || {},
      // opt-in / opt-out KM cộng dồn cấp tab (đổi → áp/gỡ toàn CT)
      enabledCum: activeTab.enabledCumulativePromoIds || [],
      disabledCum: activeTab.disabledCumulativePromoIds || [],
    });

    if (!branchId || normalItems.length === 0) {
      // Giỏ trống dòng thường → xóa hết dòng quà nếu có
      if ((activeTab.cartItems || []).some((it) => it.isPromoGift)) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? { ...t, cartItems: t.cartItems.filter((it) => !it.isPromoGift) }
              : t,
          ),
        );
      }
      promoSyncRef.current = signature;
      return;
    }

    if (signature === promoSyncRef.current) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      promoSyncRef.current = signature;
      try {
        // (1) discovery — KHÔNG truyền opt-in → biết CT nào khớp + matchedProductIds.
        const discoveryRes = await promotionsApi.evaluate({
          branchId,
          customerId: activeTab.selectedCustomer?.id,
          userId: activeTab.soldById ?? user?.id,
          items: normalItems.map((it) => ({
            productId: Number(it.product.id),
            quantity: Number(it.quantity),
            price: Number(it.price),
            discount: Number(it.discount) || 0,
          })),
        });

        const isGiftType = (p: any) =>
          p.type === "BUY_X_GET_Y" ||
          p.type === "BUY_N_GET_M_SAME" ||
          p.type === "BUY_X_BUY_Y_PRICE";

        // Opt-in KM cộng dồn ở cấp tab → suy ra matchedProductIds để áp cho MỌI dòng.
        // Luôn hydrate từ dòng quà cũ để mở được đơn/HĐ historical; tombstone
        // disabledCumulativePromoIds chặn duy nhất trường hợp user đã chủ động bỏ.
        const enabledCumIds = new Set(
          activeTab.enabledCumulativePromoIds || [],
        );
        const disabledCumIds = new Set(
          activeTab.disabledCumulativePromoIds || [],
        );
        const cumIdSet = new Set(
          discoveryRes.eligiblePromotions
            .filter((p) => isGiftType(p) && p.cumulative)
            .map((p) => p.promotionId),
        );
        for (const it of activeTab.cartItems || []) {
          if (
            it.isPromoGift &&
            it.promotionId != null &&
            cumIdSet.has(it.promotionId) &&
            !disabledCumIds.has(it.promotionId)
          ) {
            enabledCumIds.add(it.promotionId);
          }
        }
        const cumMatchByProduct = new Map<number, number[]>(); // productId -> [promoId]
        for (const p of discoveryRes.eligiblePromotions) {
          if (!isGiftType(p) || !p.cumulative) continue;
          if (!enabledCumIds.has(p.promotionId)) continue;
          for (const pid of p.matchedProductIds || []) {
            const arr = cumMatchByProduct.get(pid) || [];
            arr.push(p.promotionId);
            cumMatchByProduct.set(pid, arr);
          }
        }

        // (2) applied — opt-in per-dòng: per-row (KM thường) + cấp tab (KM cộng dồn).
        const appliedRes = await promotionsApi.evaluate({
          branchId,
          customerId: activeTab.selectedCustomer?.id,
          userId: activeTab.soldById ?? user?.id,
          items: normalItems.map((it) => {
            const pid = Number(it.product.id);
            const merged = new Set(it.promoEnabledIds || []);
            (cumMatchByProduct.get(pid) || []).forEach((id) => merged.add(id));
            return {
              productId: pid,
              quantity: Number(it.quantity),
              price: Number(it.price),
              discount: Number(it.discount) || 0,
              enabledPromotionIds: [...merged],
            };
          }),
        });

        // Badge: dựa trên discovery (không phụ thuộc opt-in)
        const discoveryGiftPromos =
          discoveryRes.eligiblePromotions.filter(isGiftType);
        // Sinh dòng quà: dựa trên applied (đã lọc theo opt-in)
        const giftPromos = appliedRes.eligiblePromotions.filter(isGiftType);

        // Thông tin CT cộng dồn (perTime = SL quà mỗi suất) để tái dựng lựa chọn
        // khi mở lại đơn/HĐ (dòng quà từ DB không mang cờ cumulative).
        // unitMode="carton": perTime tính theo thùng; dòng quà từ DB lưu theo GÓI
        // → khi suy ngược số suất phải chia thêm conversionValue của SP quà.
        const cumulativePromoInfo = new Map<
          number,
          { perTime: number; unitMode?: string }
        >();
        for (const p of [...discoveryGiftPromos, ...giftPromos]) {
          if (!p.cumulative) continue;
          const rt = Number(p.rewardTimes || 0);
          const perTime =
            rt > 0
              ? Number(p.rewardQuantity || 0) / rt
              : Number(p.rewardQuantity || 0);
          if (perTime > 0 && !cumulativePromoInfo.has(p.promotionId)) {
            cumulativePromoInfo.set(p.promotionId, {
              perTime,
              unitMode: p.unitMode,
            });
          }
        }
        const cumulativePromoIds = new Set(cumulativePromoInfo.keys());

        // Bỏ qua response evaluate của state cũ (ví dụ user vừa bấm "Bỏ áp dụng"
        // trong lúc request trước đó còn đang chờ) để không ghi đè opt-in mới.
        if (cancelled) return;

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            // normals: MỌI dòng không phải quà (kể cả bục rách/cận date) — dùng để
            // ghép lại giỏ ở cuối, tránh làm mất dòng bục rách/cận date.
            const normals = t.cartItems.filter((it) => !it.isPromoGift);
            // promoNormals: chỉ hàng loại tồn 'normal' — dùng cho mọi tính toán KM
            // (badge, tìm trigger/anchor, giữ quà). Bục rách/cận date KHÔNG hưởng KM.
            const promoNormals = normals.filter(
              (it) => (it.conditionType || "normal") === "normal",
            );
            const oldGifts = t.cartItems.filter((it) => it.isPromoGift);

            // Tái dựng phân bổ quà cộng dồn từ dòng quà DB/historical. Chỉ bỏ qua
            // CT người dùng đã chủ động tắt trong tab này.
            const reconstructedSel: Record<number, CumulativeGiftSelection[]> =
              {
                ...(t.cumulativeGiftSelections || {}),
              };
            const disabledForTab = new Set(t.disabledCumulativePromoIds || []);
            for (const promoId of cumulativePromoIds) {
              if (disabledForTab.has(promoId)) continue;
              if (reconstructedSel[promoId]?.length) continue;
              const info = cumulativePromoInfo.get(promoId);
              if (!info || info.perTime <= 0) continue;
              const dbGifts = oldGifts.filter(
                (g) => g.promotionId === promoId && Number(g.product?.id) > 0,
              );
              if (dbGifts.length === 0) continue;
              // Lấy conversionValue của từng SP quà từ rewardOptions của CT (carton).
              const promoInfo = [...discoveryGiftPromos, ...giftPromos].find(
                (pp) => pp.promotionId === promoId,
              );
              const convOf = (pid: number) => {
                const opt = promoInfo?.rewardOptions?.find(
                  (o) => o.productId === pid,
                );
                return Number(opt?.conversionValue || 1) || 1;
              };
              const isCarton = info.unitMode === "carton";
              const sels: CumulativeGiftSelection[] = [];
              for (const g of dbGifts) {
                const goi = Number(g.quantity);
                const times = isCarton
                  ? Math.round(
                      goi / info.perTime / convOf(Number(g.product.id)),
                    )
                  : Math.round(goi / info.perTime);
                if (times <= 0) continue;
                sels.push({
                  productId: Number(g.product.id),
                  productCode: g.product.code,
                  productName: g.product.name,
                  rewardTimes: times,
                });
              }
              if (sels.length) reconstructedSel[promoId] = sels;
            }

            // Opt-in cấp tab: hydrate CT từ quà historical, trừ CT user đã tắt.
            const reconstructedEnabledCum = new Set([
              ...(t.enabledCumulativePromoIds || []),
              ...enabledCumIds,
            ]);
            for (const promoId of disabledForTab) {
              reconstructedEnabledCum.delete(promoId);
              delete reconstructedSel[promoId];
            }
            for (const promoId of cumulativePromoIds) {
              if (disabledForTab.has(promoId)) continue;
              const hasDbGift = oldGifts.some(
                (g) => g.promotionId === promoId && Number(g.product?.id) > 0,
              );
              if (hasDbGift || reconstructedSel[promoId]?.length) {
                reconstructedEnabledCum.add(promoId);
              }
            }

            // Gắn "CT đang khớp" cho từng dòng thường (để hiện icon 🎁 / badge).
            // - KM cộng dồn: khớp mọi SP thuộc matchedProductIds (gộp tổng SL).
            // - KM thường: khớp đúng triggerProductId (từng mã tự đạt ngưỡng).
            const eligibleByRow: Record<
              string,
              {
                promotionId: number;
                name: string;
                code: string;
                cumulative?: boolean;
                matchedProductIds?: number[];
                deductPromoStock?: boolean;
              }[]
            > = {};
            for (const n of promoNormals) {
              const pid = Number(n.product?.id);
              const matched = discoveryGiftPromos.filter((p) =>
                p.cumulative
                  ? (p.matchedProductIds || []).includes(pid)
                  : p.triggerProductId === pid,
              );
              if (matched.length > 0) {
                eligibleByRow[n.rowId] = matched.map((p) => ({
                  promotionId: p.promotionId,
                  name: p.name,
                  code: p.code,
                  cumulative: p.cumulative,
                  matchedProductIds: p.matchedProductIds,
                  deductPromoStock:
                    p.deductPromoStock === true &&
                    (p.type === "BUY_X_GET_Y" || p.type === "BUY_N_GET_M_SAME"),
                }));
              }
            }

            // Sinh dòng quà độc lập theo từng mã X đã bật KM.
            const newGifts: CartItem[] = [];
            for (const promo of giftPromos) {
              // ── KM CỘNG DỒN: gộp tổng SL mọi mã X, phân bổ quà theo suất ──
              if (promo.cumulative) {
                // Opt-in cấp tab → neo dòng quà dưới dòng X đầu tiên thuộc CT.
                if (!enabledCumIds.has(promo.promotionId)) continue;
                const anchor = promoNormals.find((n) =>
                  (promo.matchedProductIds || []).includes(
                    Number(n.product?.id),
                  ),
                );
                if (!anchor) continue;

                const isBuyY = promo.type === "BUY_X_BUY_Y_PRICE";
                const rewardTimes = Number(promo.rewardTimes || 0);
                const perTime =
                  rewardTimes > 0
                    ? Number(promo.rewardQuantity || 0) / rewardTimes
                    : Number(promo.rewardQuantity || 0);

                if (promo.requiresChoice) {
                  const selections =
                    t.cumulativeGiftSelections?.[promo.promotionId] || [];
                  const totalSelectedTimes = selections.reduce(
                    (s, sel) => s + Number(sel.rewardTimes || 0),
                    0,
                  );
                  // Chưa phân bổ đủ suất → 1 dòng quà placeholder cần chọn.
                  if (
                    selections.length === 0 ||
                    totalSelectedTimes !== rewardTimes
                  ) {
                    newGifts.push({
                      rowId: `promo_${promo.promotionId}_cumulative`,
                      product: {
                        id: 0,
                        name: "(Chưa chọn quà khuyến mãi)",
                        code: "",
                        basePrice: 0,
                      },
                      quantity: 0,
                      price: 0,
                      discount: 0,
                      conditionType: "normal",
                      isPromoGift: true,
                      cumulative: true,
                      promotionId: promo.promotionId,
                      promotionName: promo.name,
                      promotionCode: promo.code,
                      promoLineType: isBuyY ? "discounted_buy" : "gift",
                      triggerRowId: anchor.rowId,
                      rewardOptions: promo.rewardOptions,
                      requiresChoice: true,
                      deductPromoStock: !isBuyY,
                    });
                    continue;
                  }
                  // Đã phân bổ đủ → mỗi SP quà 1 dòng.
                  for (const sel of selections) {
                    const times = Number(sel.rewardTimes || 0);
                    if (times <= 0) continue;
                    const opt = promo.rewardOptions?.find(
                      (o) => o.productId === sel.productId,
                    );
                    if (!opt) continue;
                    let qty = times * perTime; // đơn vị CT (gói hoặc thùng)
                    if (opt.remaining != null) {
                      qty = Math.min(qty, Number(opt.remaining));
                    }
                    // carton: quy số quà (thùng) → gói theo conversionValue
                    // của SP quà được chọn.
                    const isCarton = promo.unitMode === "carton";
                    const qtyGoi = isCarton
                      ? Math.round(qty * Number(opt.conversionValue || 1))
                      : qty;
                    if (qtyGoi <= 0) continue;
                    newGifts.push({
                      rowId: `promo_${promo.promotionId}_gift_${sel.productId}`,
                      product: {
                        id: opt.productId,
                        name: opt.productName,
                        code: opt.productCode || "",
                        basePrice: 0,
                      },
                      quantity: qtyGoi,
                      price: isBuyY ? Number(promo.promoPrice || 0) : 0,
                      discount: 0,
                      conditionType: "normal",
                      isPromoGift: true,
                      cumulative: true,
                      promotionId: promo.promotionId,
                      promotionName: promo.name,
                      promotionCode: promo.code,
                      promoLineType: isBuyY ? "discounted_buy" : "gift",
                      triggerRowId: anchor.rowId,
                      rewardOptions: promo.rewardOptions,
                      requiresChoice: false,
                      deductPromoStock: !isBuyY,
                    });
                  }
                  continue;
                }

                // Chỉ 1 SP quà → engine đã sinh sẵn giftLine/discountedBuyLine.
                const line = isBuyY
                  ? promo.discountedBuyLines?.[0]
                  : promo.giftLines?.[0];
                if (!line) continue;
                const cumQty = Number(promo.rewardQuantity || 0);
                if (cumQty <= 0) continue;
                newGifts.push({
                  rowId: `promo_${promo.promotionId}_cumulative`,
                  product: {
                    id: line.productId,
                    name: line.productName,
                    code: line.productCode || "",
                    basePrice: 0,
                  },
                  quantity: cumQty,
                  price: isBuyY ? Number(promo.promoPrice || 0) : 0,
                  discount: 0,
                  conditionType: "normal",
                  isPromoGift: true,
                  cumulative: true,
                  promotionId: promo.promotionId,
                  promotionName: promo.name,
                  promotionCode: promo.code,
                  promoLineType: isBuyY ? "discounted_buy" : "gift",
                  triggerRowId: anchor.rowId,
                  rewardOptions: promo.rewardOptions,
                  requiresChoice: false,
                  deductPromoStock: !isBuyY,
                });
                continue;
              }

              // ── KM THƯỜNG: từng mã X tự đạt ngưỡng ──
              const trigger = promoNormals.find(
                (n) =>
                  Number(n.product?.id) === promo.triggerProductId &&
                  (n.promoEnabledIds || []).includes(promo.promotionId),
              );
              if (!trigger) continue;

              const prevGift = oldGifts.find(
                (g) =>
                  g.promotionId === promo.promotionId &&
                  g.triggerRowId === trigger.rowId,
              );

              const isBuyY = promo.type === "BUY_X_BUY_Y_PRICE";
              const baseQty = Number(promo.rewardQuantity || 0);

              let giftProduct: any = null;
              let requiresChoice = false;
              let optRemaining: number | null | undefined = undefined;
              if (promo.requiresChoice) {
                const chosenId =
                  prevGift?.product?.id || promo.rewardOptions?.[0]?.productId;
                requiresChoice = !prevGift?.product?.id;
                const opt = promo.rewardOptions?.find(
                  (o) => o.productId === chosenId,
                );
                if (opt) {
                  optRemaining = opt.remaining;
                  giftProduct = {
                    id: opt.productId,
                    name: opt.productName,
                    code: opt.productCode || "",
                    basePrice: 0,
                  };
                }
              } else {
                const line = isBuyY
                  ? promo.discountedBuyLines?.[0]
                  : promo.giftLines?.[0];
                if (line) {
                  giftProduct = {
                    id: line.productId,
                    name: line.productName,
                    code: line.productCode || "",
                    basePrice: 0,
                  };
                }
              }
              if (!giftProduct) continue;

              // Cap SL quà theo suất còn lại (lifetime) của SP được chọn.
              // Với option đã có giftLine/discountedBuyLine (không requiresChoice)
              // engine đã cap sẵn nên baseQty đã đúng.
              let qty = baseQty;
              if (optRemaining != null) {
                qty = Math.min(qty, Number(optRemaining));
              }
              if (requiresChoice ? false : qty <= 0) continue;

              const promoPrice = isBuyY ? Number(promo.promoPrice || 0) : 0;

              newGifts.push({
                rowId: `promo_${promo.promotionId}_${trigger.rowId}`,
                product: giftProduct,
                quantity: qty || 1,
                price: promoPrice,
                discount: 0,
                conditionType: "normal",
                isPromoGift: true,
                promotionId: promo.promotionId,
                promotionName: promo.name,
                promotionCode: promo.code,
                promoLineType: isBuyY ? "discounted_buy" : "gift",
                triggerRowId: trigger.rowId,
                triggerProductId: promo.triggerProductId,
                rewardOptions: promo.rewardOptions,
                requiresChoice,
                deductPromoStock: !isBuyY,
              });
            }

            // Giữ gift đã hydrate từ đơn/HĐ nếu evaluate không re-apply
            // nhưng opt-in vẫn bật (hoặc gift thủ công không có promotionId).
            // Tránh mất KM khi mở xử lý HĐ; vẫn gỡ khi user tắt opt-in.
            const appliedGiftKeys = new Set(
              newGifts
                .filter((g) => g.promotionId != null && g.triggerRowId != null)
                .map((g) => `${g.promotionId}:${g.triggerRowId}`),
            );
            const preservedGifts: CartItem[] = oldGifts.filter((g) => {
              // Dòng quà cộng dồn luôn được sinh lại từ selections → không giữ bản cũ.
              // (Dòng quà từ DB không mang cờ cumulative → nhận diện thêm qua promotionId.)
              if (g.cumulative) return false;
              if (
                g.promotionId != null &&
                cumulativePromoIds.has(g.promotionId)
              )
                return false;
              if (
                g.promotionId != null &&
                g.triggerRowId != null &&
                appliedGiftKeys.has(`${g.promotionId}:${g.triggerRowId}`)
              ) {
                return false;
              }
              if (promoNormals.length === 0) return false;
              // Gift engine: chỉ giữ khi CT vẫn được opt-in trên dòng thường
              const trigger = g.triggerRowId
                ? promoNormals.find(
                    (n) =>
                      n.rowId === g.triggerRowId &&
                      (g.promotionId == null ||
                        (n.promoEnabledIds || []).includes(g.promotionId)),
                  )
                : g.promotionId != null && g.triggerProductId != null
                  ? promoNormals.find(
                      (n) =>
                        Number(n.product?.id) === g.triggerProductId &&
                        (n.promoEnabledIds || []).includes(g.promotionId!),
                    )
                  : undefined;
              if (!trigger) return false;
              g.triggerRowId = trigger.rowId;
              g.triggerProductId = Number(trigger.product?.id);
              return true;
            });

            // Ghép lại: mỗi dòng thường (kèm eligiblePromos) + dòng quà dưới nó.
            // Đóng dấu promoEnabledIds cho MỌI dòng X thuộc KM cộng dồn đã bật
            // → badge hiện đồng nhất trên mọi dòng + BE re-validate đúng khi lưu.
            const merged: CartItem[] = [];
            const allGifts = [...newGifts, ...preservedGifts];
            for (const n of normals) {
              // Dòng bục rách/cận date không hưởng KM: chỉ ẩn trạng thái hiển thị,
              // nhưng giữ promoEnabledIds để khi quay về hàng thường có thể áp lại
              // đúng CT trước đó. Dòng này đã bị loại khỏi promoNormals nên không
              // được gửi evaluate, không tính ngưỡng và không sinh quà khi còn là
              // damaged/near_expiry.
              if ((n.conditionType || "normal") !== "normal") {
                merged.push({
                  ...n,
                  eligiblePromos: undefined,
                });
                continue;
              }
              const pid = Number(n.product?.id);
              const cumIds = cumMatchByProduct.get(pid) || [];
              const enabledSet = new Set(n.promoEnabledIds || []);
              // Bỏ các cumId không còn bật (đã tắt ở tab) rồi thêm lại cumId đang bật.
              for (const p of discoveryGiftPromos) {
                if (p.cumulative && (p.matchedProductIds || []).includes(pid)) {
                  enabledSet.delete(p.promotionId);
                }
              }
              cumIds.forEach((id) => enabledSet.add(id));
              merged.push({
                ...n,
                promoEnabledIds: [...enabledSet],
                eligiblePromos: eligibleByRow[n.rowId],
                deductPromoStock: (eligibleByRow[n.rowId] || []).some(
                  (promotion) =>
                    promotion.deductPromoStock === true &&
                    enabledSet.has(promotion.promotionId),
                ),
              });
              allGifts
                .filter((g) => g.triggerRowId === n.rowId)
                .forEach((g) => merged.push(g));
            }
            // Gift không gắn được trigger vẫn append cuối (tránh mất)
            allGifts
              .filter((g) => !merged.includes(g))
              .forEach((g) => merged.push(g));
            return {
              ...t,
              cartItems: merged,
              cumulativeGiftSelections: reconstructedSel,
              enabledCumulativePromoIds: [...reconstructedEnabledCum],
            };
          }),
        );

        // Lưu tiến độ tích lũy (từ discovery — không phụ thuộc opt-in) để render
        // khối "Khuyến mãi của đơn hàng".
        setPromoProgressByTab((prev) => ({
          ...prev,
          [tabId]: discoveryRes.progress || [],
        }));
      } catch (e) {
        // Lỗi đánh giá KM không nên chặn bán hàng
        console.error("Promotion evaluate error:", e);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab?.id,
    selectedBranch?.id,
    activeTab?.selectedCustomer?.id,
    activeTab?.soldById,
    // theo dõi dòng thường + lựa chọn quà
    JSON.stringify(
      (activeTab?.cartItems || []).map((it) => ({
        r: it.rowId,
        p: it.product?.id,
        q: it.quantity,
        pr: it.price,
        d: it.discount,
        c: it.conditionType || "normal",
        g: it.isPromoGift ? it.product?.id : undefined,
        dis: it.promoEnabledIds,
      })),
    ),
    // phân bổ quà cộng dồn + opt-in cấp tab (đổi → sinh lại dòng quà / áp CT)
    JSON.stringify(activeTab?.cumulativeGiftSelections || {}),
    JSON.stringify(activeTab?.enabledCumulativePromoIds || []),
  ]);

  /**
   * Hiển thị popup xác nhận nếu còn sản phẩm lệch giá so với giá bán gần nhất.
   * Trả về true nếu được phép tiếp tục submit (không lệch giá, hoặc user chọn
   * "Vẫn tạo"). Không chặn người dùng khi chưa lấy được giá gần nhất.
   */
  const confirmPriceMismatch = async (
    documentLabel: "đơn hàng" | "hóa đơn",
  ): Promise<boolean> => {
    // Chưa lấy được giá gần nhất → không chặn người dùng.
    if (isLoadingLatestPrices) return true;

    const mismatched = (activeTab?.cartItems || [])
      .map((item) => ({ item, warning: priceWarnings[item.rowId] }))
      .filter(
        (entry): entry is { item: CartItem; warning: PriceWarning } =>
          !!entry.warning,
      );

    if (mismatched.length === 0) return true;

    const directions = new Set(mismatched.map((m) => m.warning.direction));
    const directionLabel =
      directions.size === 1
        ? directions.has("lower")
          ? "thấp hơn"
          : "cao hơn"
        : null;

    const headline = directionLabel
      ? `Giá bán hiện tại đang ${directionLabel} giá bán gần nhất của khách hàng.`
      : "Có sản phẩm có giá bán hiện tại khác với giá bán gần nhất của khách hàng.";

    const listItems = mismatched
      .map(
        (m) =>
          `<li style="margin-bottom:2px">${m.item.product?.name ?? ""}: giá gần nhất <strong>${formatCurrency(
            m.warning.latestPrice,
          )} VNĐ</strong></li>`,
      )
      .join("");

    const result = await Swal.fire({
      icon: "warning",
      title: "Cảnh báo lệch giá",
      html: `
        <p>${headline}</p>
        <ul style="text-align:left;margin-top:8px;padding-left:18px;font-size:14px">${listItems}</ul>
        <p style="margin-top:8px">Bạn vẫn muốn tạo ${documentLabel} này chứ?</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Vẫn tạo",
      cancelButtonText: "Huỷ / Xem lại",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
    });

    return result.isConfirmed;
  };

  const [mobilePrintData, setMobilePrintData] = useState<{
    templateFor: string;
    entityId: number;
    entityType?: string;
    followUpDelivery?: boolean;
  } | null>(null);

  const handlePostCreate = (
    templateFor: string,
    entityId: number,
    targetUrl: string,
    options?: { shouldRedirect?: boolean },
  ) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    // Nếu là hóa đơn, sau khi in hóa đơn sẽ tự động in phiếu giao hàng
    const followUpDelivery = templateFor === "invoice";

    if (options?.shouldRedirect) {
      // Đến từ trang danh sách (edit hoặc tạo hóa đơn từ đơn hàng) → redirect về trang gốc + in
      if (isMobile) {
        setMobilePrintData({ templateFor, entityId, followUpDelivery });
      } else {
        queuePrintAfterRedirect(templateFor, entityId, { followUpDelivery });
        router.push(targetUrl);
      }
    } else {
      // Tạo mới từ trang /ban-hang → ở yên, in trực tiếp
      if (isMobile) {
        setMobilePrintData({ templateFor, entityId, followUpDelivery });
      } else {
        printEntity(templateFor, entityId).then(() => {
          if (followUpDelivery) {
            printDeliverySlip("invoice", entityId);
          }
        });
      }
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
      paymentNoteType: "cash" | "transfer" | null;
      paymentNoteAmount: number | null;
      deliveryInfo: DeliveryInfo;
      selectedAddressId: number | null;
      consignStatus?: string;
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
      tab.paymentNoteType !== initialData.paymentNoteType ||
      tab.paymentNoteAmount !== initialData.paymentNoteAmount ||
      tab.selectedPriceBookId !== initialData.selectedPriceBookId ||
      tab.selectedPriceBookName !== initialData.selectedPriceBookName ||
      tab.selectedAddressId !== initialData.selectedAddressId ||
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
        paymentNoteType: tab.paymentNoteType,
        paymentNoteAmount: tab.paymentNoteAmount,
        selectedPriceBookId: tab.selectedPriceBookId,
        selectedPriceBookName: tab.selectedPriceBookName,
        selectedAddressId: tab.selectedAddressId ?? null,
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
              paymentNoteType: editState.paymentNoteType ?? null,
              paymentNoteAmount:
                editState.paymentNoteAmount == null
                  ? null
                  : Number(editState.paymentNoteAmount),
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
              selectedAddressId: editState.selectedAddressId ?? null,
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
              paymentNoteType: editTab.paymentNoteType,
              paymentNoteAmount: editTab.paymentNoteAmount,
              deliveryInfo: editTab.deliveryInfo,
              selectedAddressId: editTab.selectedAddressId ?? null,
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
    priceBookName: string | null,
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
      }),
    );

    updateActiveTab({
      selectedPriceBookId: priceBookId,
      selectedPriceBookName: priceBookName,
      cartItems: updatedCartItems,
    });
  };

  const { data: existingOrder, isLoading: isLoadingOrder } = useOrder(
    orderId ? Number(orderId) : 0,
  );

  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoice(
    invoiceId ? Number(invoiceId) : 0,
  );

  const { data: existingConsignment, isLoading: isLoadingConsignment } =
    useConsignment(consignmentId ? Number(consignmentId) : 0);

  // Copy: fetch nguồn để copy nội dung sang tab mới
  const { data: copySourceOrder } = useOrder(
    copyOrderId ? Number(copyOrderId) : 0,
  );
  const { data: copySourceInvoice } = useInvoice(
    copyInvoiceId ? Number(copyInvoiceId) : 0,
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
      (tab, index, self) => self.findIndex((t) => t.id === tab.id) === index,
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
              : tab,
          ),
        );
      }
    }
  }, [isInitialized, user?.id]);

  useEffect(() => {
    if (!isInitialized || orderId || invoiceId || consignmentId) return;

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
                  (t.cartItems.length > 0 || t.selectedCustomer),
              ),
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
            : tabType === "consignment"
              ? `Ký gửi ${newTabNumber}`
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
        } để xem/sửa đơn này`,
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
      (inv: any) => inv.status !== 2 && inv.status !== 5,
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

      const remainingCartItems: CartItem[] = mapDocumentLinesToCartItems(
        existingOrder.items || [],
      )
        .map((item) => {
          const invoiced = invoicedQuantities[item.product?.id] || 0;
          const remaining = Number(item.quantity) - invoiced;
          if (remaining <= 0) return null;
          return { ...item, quantity: remaining };
        })
        .filter(Boolean) as CartItem[];

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
        paymentNoteType: getLatestPaymentNote(existingOrder.paymentNotes).type,
        paymentNoteAmount: getLatestPaymentNote(existingOrder.paymentNotes)
          .amount,
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
      : mapDocumentLinesToCartItems(existingOrder.items);

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
      paymentNoteType: restoredState
        ? restoredState.paymentNoteType
        : getLatestPaymentNote(existingOrder.paymentNotes).type,
      paymentNoteAmount: restoredState
        ? restoredState.paymentNoteAmount
        : getLatestPaymentNote(existingOrder.paymentNotes).amount,
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
      selectedAddressId:
        restoredState?.selectedAddressId != null
          ? restoredState.selectedAddressId
          : (findAddressFromDelivery(
              existingOrder.customer?.addresses,
              existingOrder.delivery,
            )?.id ?? null),
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
      paymentNoteType: editTab.paymentNoteType,
      paymentNoteAmount: editTab.paymentNoteAmount,
      deliveryInfo: editTab.deliveryInfo,
      selectedAddressId: editTab.selectedAddressId ?? null,
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
        } để xem/sửa hóa đơn này`,
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
      : mapDocumentLinesToCartItems(existingInvoice.details);

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
      paymentNoteType: restoredState
        ? restoredState.paymentNoteType
        : getLatestPaymentNote(existingInvoice.paymentNotes).type,
      paymentNoteAmount: restoredState
        ? restoredState.paymentNoteAmount
        : getLatestPaymentNote(existingInvoice.paymentNotes).amount,
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
      selectedAddressId:
        restoredState?.selectedAddressId != null
          ? restoredState.selectedAddressId
          : (findAddressFromDelivery(
              existingInvoice.customer?.addresses,
              existingInvoice.delivery,
            )?.id ?? null),
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
      paymentNoteType: editTab.paymentNoteType,
      paymentNoteAmount: editTab.paymentNoteAmount,
      deliveryInfo: editTab.deliveryInfo,
      selectedAddressId: editTab.selectedAddressId ?? null,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex((t) => t.id === editTabId);

      if (existingEditIndex >= 0) {
        const updatedTabs = [...prevTabs];
        updatedTabs[existingEditIndex] = editTab;
        return updatedTabs;
      } else {
        const nonEditTabs = prevTabs.filter(
          (t) => !t.isEditMode || t.id !== editTabId,
        );
        return [...nonEditTabs, editTab];
      }
    });

    setActiveTabId(editTabId);
  }, [existingInvoice?.id, invoiceId, selectedBranch?.id]);

  // ── EDIT: mở phiếu ký gửi để sửa (từ URL param ?consignmentId=X) ──
  useEffect(() => {
    if (!existingConsignment || !consignmentId) return;

    // Guard: chặn mở ký gửi nếu chi nhánh đang chọn lệch với chi nhánh phiếu ký gửi
    if (
      selectedBranch &&
      existingConsignment.branchId &&
      existingConsignment.branchId !== selectedBranch.id
    ) {
      toast.error(
        `Vui lòng đổi chi nhánh sang ${
          existingConsignment.branch?.name || "chi nhánh của phiếu ký gửi"
        } để xem/sửa phiếu ký gửi này`,
      );
      router.replace("/don-hang/ky-gui");
      return;
    }

    const editTabId = `edit-consignment-${consignmentId}`;
    const existingTab = tabs.find((t) => t.id === editTabId);

    if (existingTab) {
      if (existingTab.cartItems.length > 0) {
        setActiveTabId(editTabId);
        return;
      }
    }

    const key = getEditStorageKey(Number(consignmentId), "consignment");
    const savedEditState = localStorage.getItem(key);

    let restoredState = null;
    if (savedEditState) {
      try {
        restoredState = JSON.parse(savedEditState);
        const lastModified = new Date(restoredState.lastModified);
        const consignmentUpdated = new Date(existingConsignment.updatedAt);

        if (lastModified > consignmentUpdated) {
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
      : mapDocumentLinesToCartItems(existingConsignment.items);

    const editTab: Tab = {
      id: editTabId,
      type: "consignment",
      label: `Sửa KG #${existingConsignment.code}`,
      code: existingConsignment.code,
      cartItems,
      selectedCustomer: restoredState
        ? restoredState.selectedCustomer
        : existingConsignment.customer || null,
      selectedPriceBookId: restoredState
        ? restoredState.selectedPriceBookId
        : existingConsignment.priceBookId || null,
      selectedPriceBookName: restoredState
        ? restoredState.selectedPriceBookName
        : existingConsignment.priceBookName || null,
      orderNote: restoredState
        ? restoredState.orderNote
        : existingConsignment.description || "",
      discount: restoredState
        ? restoredState.discount
        : Number(existingConsignment.discount) || 0,
      discountRatio: restoredState
        ? restoredState.discountRatio
        : Number(existingConsignment.discountRatio) || 0,
      useCOD: false,
      paymentAmount: 0,
      paymentMethods: [],
      paymentNoteType: null,
      paymentNoteAmount: null,
      soldById: existingConsignment.soldById ?? null,
      deliveryInfo: restoredState
        ? restoredState.deliveryInfo
        : existingConsignment.delivery
          ? {
              receiver: existingConsignment.delivery.receiver || "",
              contactNumber: existingConsignment.delivery.contactNumber || "",
              detailAddress: existingConsignment.delivery.address || "",
              locationName: existingConsignment.delivery.locationName || "",
              wardName: existingConsignment.delivery.wardName || "",
              weight: Number(existingConsignment.delivery.weight) || 0,
              weightUnit: existingConsignment.delivery?.weightUnit || "g",
              length: Number(existingConsignment.delivery.length) || 10,
              width: Number(existingConsignment.delivery.width) || 10,
              height: Number(existingConsignment.delivery.height) || 10,
              noteForDriver: existingConsignment.delivery.noteForDriver || "",
            }
          : {
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
      documentId: existingConsignment.id,
      selectedAddressId:
        restoredState?.selectedAddressId != null
          ? restoredState.selectedAddressId
          : (findAddressFromDelivery(
              (existingConsignment.customer as any)?.addresses,
              existingConsignment.delivery,
            )?.id ?? null),
      isEditMode: true,
      consignStatus: existingConsignment.consignStatus || "pending",
    };

    const editKey = getEditStorageKey(existingConsignment.id, "consignment");
    initialEditDataRef.current[editKey] = {
      cartItems: editTab.cartItems,
      selectedCustomer: editTab.selectedCustomer,
      selectedPriceBookId: editTab.selectedPriceBookId,
      selectedPriceBookName: editTab.selectedPriceBookName,
      orderNote: editTab.orderNote,
      discount: editTab.discount,
      discountRatio: editTab.discountRatio,
      paymentAmount: editTab.paymentAmount,
      paymentNoteType: editTab.paymentNoteType,
      paymentNoteAmount: editTab.paymentNoteAmount,
      deliveryInfo: editTab.deliveryInfo,
      selectedAddressId: editTab.selectedAddressId ?? null,
      consignStatus: editTab.consignStatus,
    };

    setTabs((prevTabs) => {
      const existingEditIndex = prevTabs.findIndex((t) => t.id === editTabId);

      if (existingEditIndex >= 0) {
        const updatedTabs = [...prevTabs];
        updatedTabs[existingEditIndex] = editTab;
        return updatedTabs;
      } else {
        const nonEditTabs = prevTabs.filter(
          (t) => !t.isEditMode || t.id !== editTabId,
        );
        return [...nonEditTabs, editTab];
      }
    });

    setActiveTabId(editTabId);
  }, [existingConsignment?.id, consignmentId, selectedBranch?.id]);

  // ── COPY: copy đơn hàng → tab mới Copy_<code>, type=order, fromPage="dat-hang" ──
  useEffect(() => {
    if (!copySourceOrder || !copyOrderId) return;
    if (!isInitialized) return;
    if (!canCreateOrder) {
      toast.error("Bạn không có quyền tạo đơn hàng");
      router.replace("/ban-hang", { scroll: false });
      return;
    }

    const cartItems: CartItem[] = (copySourceOrder.items || []).map(
      (item: any) => ({
        rowId: `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
        product: item.product,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount) || 0,
        note: item.note || "",
        conditionType: item.conditionType || "normal",
        soldExpiryDate: item.soldExpiryDate
          ? String(item.soldExpiryDate).slice(0, 10)
          : undefined,
      }),
    );

    const newTabId = `tab-copy-order-${copySourceOrder.id}-${Date.now()}`;
    const copyTab: Tab = {
      id: newTabId,
      type: "order",
      label: `Copy_${copySourceOrder.code}`,
      code: copySourceOrder.code,
      cartItems,
      selectedCustomer: copySourceOrder.customer || null,
      selectedPriceBookId: copySourceOrder.priceBookId || null,
      selectedPriceBookName: copySourceOrder.priceBookName || null,
      orderNote: copySourceOrder.description || "",
      discount: Number(copySourceOrder.discount) || 0,
      discountRatio: Number(copySourceOrder.discountRatio) || 0,
      useCOD: false,
      paymentAmount: 0,
      paymentMethods: [],
      paymentNoteType: null,
      paymentNoteAmount: null,
      soldById: copySourceOrder.soldById ?? null,
      deliveryInfo: {
        receiver: copySourceOrder.delivery?.receiver || "",
        contactNumber: copySourceOrder.delivery?.contactNumber || "",
        detailAddress: copySourceOrder.delivery?.address || "",
        locationName: copySourceOrder.delivery?.locationName || "",
        wardName: copySourceOrder.delivery?.wardName || "",
        weight: Number(copySourceOrder.delivery?.weight) || 0,
        weightUnit: copySourceOrder.delivery?.weightUnit || "g",
        length: Number(copySourceOrder.delivery?.length) || 10,
        width: Number(copySourceOrder.delivery?.width) || 10,
        height: Number(copySourceOrder.delivery?.height) || 10,
        noteForDriver: copySourceOrder.delivery?.noteForDriver || "",
      },
      // KHÔNG set documentId / isEditMode để dùng flow create
      fromPage: "dat-hang", // copy từ trang đặt hàng → sau khi tạo redirect về /don-hang/dat-hang
    };

    setTabs((prev) => [...prev, copyTab]);
    setActiveTabId(newTabId);
    fromPageRef.current = "dat-hang";
    router.replace("/ban-hang", { scroll: false });
  }, [copySourceOrder?.id, copyOrderId, isInitialized, canCreateOrder]);

  // ── COPY: copy hóa đơn → tab mới Copy_<code>, type=invoice, fromPage="hoa-don" ──
  useEffect(() => {
    if (!copySourceInvoice || !copyInvoiceId) return;
    if (!isInitialized) return;
    if (!canCreateInvoice) {
      toast.error("Bạn không có quyền tạo hóa đơn");
      router.replace("/ban-hang", { scroll: false });
      return;
    }

    const cartItems: CartItem[] = (copySourceInvoice.details || []).map(
      (item: any) => ({
        rowId: `${item.product?.id}_${item.conditionType || "normal"}_${Date.now()}_${Math.random()}`,
        product: item.product,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount) || 0,
        note: item.note || "",
        conditionType: item.conditionType || "normal",
        soldExpiryDate: item.soldExpiryDate
          ? String(item.soldExpiryDate).slice(0, 10)
          : undefined,
      }),
    );

    const newTabId = `tab-copy-invoice-${copySourceInvoice.id}-${Date.now()}`;
    const copyTab: Tab = {
      id: newTabId,
      type: "invoice",
      label: `Copy_${copySourceInvoice.code}`,
      code: copySourceInvoice.code,
      cartItems,
      selectedCustomer: copySourceInvoice.customer || null,
      selectedPriceBookId: copySourceInvoice.priceBookId || null,
      selectedPriceBookName: copySourceInvoice.priceBookName || null,
      orderNote: copySourceInvoice.description || "",
      discount: Number(copySourceInvoice.discount) || 0,
      discountRatio: Number(copySourceInvoice.discountRatio) || 0,
      useCOD: copySourceInvoice.usingCod || false,
      paymentAmount: 0,
      paymentMethods: [],
      paymentNoteType: null,
      paymentNoteAmount: null,
      soldById: copySourceInvoice.soldById ?? null,
      deliveryInfo: copySourceInvoice.delivery
        ? {
            receiver: copySourceInvoice.delivery.receiver || "",
            contactNumber: copySourceInvoice.delivery.contactNumber || "",
            detailAddress: copySourceInvoice.delivery.address || "",
            locationName: copySourceInvoice.delivery.locationName || "",
            wardName: copySourceInvoice.delivery.wardName || "",
            weight: Number(copySourceInvoice.delivery.weight) || 0,
            weightUnit: copySourceInvoice.delivery?.weightUnit || "g",
            length: Number(copySourceInvoice.delivery.length) || 10,
            width: Number(copySourceInvoice.delivery.width) || 10,
            height: Number(copySourceInvoice.delivery.height) || 10,
            noteForDriver: copySourceInvoice.delivery.noteForDriver || "",
          }
        : {
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
      fromPage: "hoa-don", // copy từ trang hóa đơn → sau khi tạo redirect về /don-hang/hoa-don
    };

    setTabs((prev) => [...prev, copyTab]);
    setActiveTabId(newTabId);
    fromPageRef.current = "hoa-don";
    router.replace("/ban-hang", { scroll: false });
  }, [copySourceInvoice?.id, copyInvoiceId, isInitialized, canCreateInvoice]);

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab,
      ),
    );
  };

  /**
   * Bật/tắt 1 KM ở cấp giỏ.
   * - Cộng dồn: gắn/gỡ promotionId trên MỌI dòng thường có productId thuộc
   *   matchedProductIds (không đụng dòng ngoài CT / CT khác).
   * - Thường: chỉ bật/tắt đúng 1 dòng (theo rowId) như hành vi cũ.
   */
  const togglePromotionCumulative = (
    promotionId: number,
    enabled: boolean,
    _matchedProductIds: number[],
  ) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const cur = new Set(tab.enabledCumulativePromoIds || []);
        const disabled = new Set(tab.disabledCumulativePromoIds || []);
        if (enabled) {
          cur.add(promotionId);
          // Người dùng bấm Áp dụng lại → bỏ tombstone để effect được phép sinh quà.
          disabled.delete(promotionId);
        } else {
          cur.delete(promotionId);
          // Đánh dấu explicit opt-out, tránh hydrate từ dòng quà cũ bật lại CT.
          disabled.add(promotionId);
        }
        // Tắt CT → xoá luôn phân bổ quà cộng dồn của CT đó.
        const nextSel = { ...(tab.cumulativeGiftSelections || {}) };
        if (!enabled) delete nextSel[promotionId];
        return {
          ...tab,
          enabledCumulativePromoIds: [...cur],
          disabledCumulativePromoIds: [...disabled],
          cumulativeGiftSelections: nextSel,
        };
      }),
    );
  };

  /** Lưu phân bổ quà cộng dồn cho 1 CT (thay đổi → effect tự sinh lại dòng quà). */
  const setCumulativeGiftSelection = (
    promotionId: number,
    selections: CumulativeGiftSelection[],
  ) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              cumulativeGiftSelections: {
                ...(tab.cumulativeGiftSelections || {}),
                [promotionId]: selections,
              },
            }
          : tab,
      ),
    );
  };

  /**
   * Kiểm tra (bằng dữ liệu TƯƠI từ server, bỏ qua cache) xem đơn hàng đã ra
   * hóa đơn (chưa hủy) hay chưa. Dùng để chặn race condition: kho ra hóa đơn
   * xong, sale lưu/chuyển đơn dựa trên cache cũ làm trạng thái bị kéo ngược.
   *
   * Trả về true nếu được phép tiếp tục:
   * - Không có hóa đơn chưa hủy → true.
   * - Có hóa đơn chưa hủy → false (đã toast cảnh báo).
   * - Lỗi mạng/không đọc được → true (chặn mềm, tránh kẹt thao tác).
   */
  const assertOrderNotInvoiced = async (orderId: number): Promise<boolean> => {
    try {
      const fresh = await ordersApi.getOrder(orderId);
      const hasActiveInvoice = (fresh.invoices || []).some(
        (inv: any) => inv.status !== INVOICE_STATUS.CANCELLED,
      );
      if (hasActiveInvoice) {
        toast.error(
          "Đơn hàng đã ra hóa đơn, không thể lưu thay đổi. Vui lòng tải lại để xem trạng thái mới nhất.",
        );
        return false;
      }
      return true;
    } catch (error) {
      // Lỗi mạng → không chặn cứng (BE vẫn là tuyến phòng thủ cuối).
      console.error("assertOrderNotInvoiced error:", error);
      return true;
    }
  };

  const handleConvertToInvoice = async () => {
    if (!activeTab.documentId || activeTab.type !== "order") {
      toast.error("Không tìm thấy thông tin đơn hàng");
      return;
    }

    const unchosenGift = findUnchosenGift(activeTab.cartItems);
    if (unchosenGift) {
      toast.error(
        unchosenGift.cumulative
          ? `Vui lòng phân bổ đủ số suất quà cho khuyến mãi "${unchosenGift.promotionName}"`
          : `Vui lòng chọn sản phẩm tặng cho khuyến mãi "${unchosenGift.promotionName}"`,
      );
      return;
    }

    if (!(await assertOrderNotInvoiced(activeTab.documentId))) return;

    try {
      if (!(await assertPrepaidOrderCanBeInvoiced(activeTab.documentId))) {
        return;
      }
    } catch (error) {
      // Không khóa thao tác chỉ vì check sớm lỗi mạng; endpoint POS kiểm tra
      // lại bằng dữ liệu DB mới nhất trước khi tạo hóa đơn.
      console.error("prepaid order eligibility check error:", error);
    }

    const order = existingOrder;
    if (!order) return;

    const invoicedQuantities: Record<number, number> = {};
    (order.invoices || []).forEach((inv: any) => {
      if (inv.status !== 2 && inv.status !== 5) {
        (inv.details || []).forEach((d: any) => {
          invoicedQuantities[d.productId] =
            (invoicedQuantities[d.productId] || 0) + Number(d.quantity);
        });
      }
    });

    // Giữ nguyên giỏ đang hiển thị để không làm mất lựa chọn quà vừa đổi khi
    // chuyển trực tiếp từ tab sửa đơn sang hóa đơn. Chỉ fallback về dữ liệu API
    // khi tab chưa có giỏ (ví dụ mở luồng chuyển đổi từ danh sách đơn hàng).
    const sourceCartItems = activeTab.cartItems.length
      ? activeTab.cartItems
      : mapDocumentLinesToCartItems(order.items || []);
    const remainingCartItems: CartItem[] = sourceCartItems
      .map((item) => {
        const invoiced = invoicedQuantities[Number(item.product?.id)] || 0;
        const remaining = Number(item.quantity) - invoiced;
        return { ...item, quantity: remaining };
      })
      .filter((item: CartItem) => item.quantity > 0);

    if (remainingCartItems.length === 0) {
      toast.error("Tất cả sản phẩm trong đơn hàng đã được xuất hóa đơn");
      return;
    }

    const usedDiscount = (order.invoices || [])
      .filter((inv: any) => inv.status !== 2 && inv.status !== 5)
      .reduce((sum: number, inv: any) => sum + Number(inv.discount || 0), 0);
    // Ưu tiên giảm giá đang chỉnh trên tab ĐH. `order` là snapshot từ API, có
    // thể đã cũ khi user sửa giảm giá rồi chuyển thẳng sang tạo HĐ mà chưa Lưu.
    const sourceDiscount = Number(activeTab.discount) || 0;
    const sourceDiscountRatio = Number(activeTab.discountRatio) || 0;
    const remainingDiscount = sourceDiscount - usedDiscount;
    // Đơn giảm theo %: giữ nguyên % khi chuyển HĐ, còn tiền phải quy đổi theo
    // tổng dòng hàng còn xuất. Đơn giảm theo tiền: giữ cơ chế giảm giá còn lại.
    const remainingSubtotal = remainingCartItems.reduce(
      (sum, item) =>
        sum +
        (Number(item.price) - Number(item.discount || 0)) *
          Number(item.quantity),
      0,
    );
    const invoiceDiscount =
      sourceDiscountRatio > 0
        ? (remainingSubtotal * sourceDiscountRatio) / 100
        : remainingDiscount > 0
          ? remainingDiscount
          : 0;

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
              discount: invoiceDiscount,
              discountRatio: sourceDiscountRatio,
              paymentAmount: 0,
            }
          : tab,
      ),
    );

    toast.success("Chuyển sang giao diện tạo hóa đơn");
  };

  const handlePayment = async () => {
    if (activeTab.type !== "consignment" && !validatePaymentNoteSelection())
      return;

    if (isSubmittingRef.current) return;

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

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const proceed = await confirmPriceMismatch("hóa đơn");
      if (!proceed) return;

       // Chặn race: đơn đã Hoàn thành/Hủy (đóng) thì không thể xuất thêm hóa đơn.
       // Không chặn theo "có hóa đơn" vì luồng "Ra 1 phần HĐ" hợp lệ có HĐ trước đó.
       try {
         const fresh = await ordersApi.getOrder(activeTab.sourceOrderId);
         if (
           fresh.status === ORDER_STATUS.COMPLETED ||
           fresh.status === ORDER_STATUS.CANCELLED
         ) {
           toast.error(
             "Đơn hàng đã kết thúc, không thể xuất thêm hóa đơn. Vui lòng tải lại để xem trạng thái mới nhất.",
           );
           return;
         }
       } catch (error) {
         console.error("handlePayment status check error:", error);
         // Lỗi mạng → chặn mềm, để BE xử lý tuyến cuối.
       }


      // Phát hiện có mã xuất thiếu so với số lượng đặt (gộp theo productId, khớp với backend).
      const sourceOrder = activeTab.sourceOrder;
      let hasShortfall = false;
      if (sourceOrder) {
        const orderedQty: Record<number, number> = {};
        (sourceOrder.items || []).forEach((item: any) => {
          const pid = Number(item.product?.id ?? item.productId);
          if (!pid) return;
          orderedQty[pid] = (orderedQty[pid] || 0) + Number(item.quantity || 0);
        });

        const invoicedQty: Record<number, number> = {};
        (sourceOrder.invoices || []).forEach((inv: any) => {
          if (inv.status !== 2 && inv.status !== 5) {
            (inv.details || []).forEach((d: any) => {
              const pid = Number(d.productId);
              if (!pid) return;
              invoicedQty[pid] =
                (invoicedQty[pid] || 0) + Number(d.quantity || 0);
            });
          }
        });

        activeTab.cartItems.forEach((item) => {
          const pid = Number(item.product.id);
          if (!pid) return;
          invoicedQty[pid] =
            (invoicedQty[pid] || 0) + Number(item.quantity || 0);
        });

        hasShortfall = Object.keys(orderedQty).some(
          (pid) => (invoicedQty[Number(pid)] || 0) < orderedQty[Number(pid)],
        );
      }

      // Dòng bị thiếu HẲN so với đơn hàng (theo phương án chặt: phân biệt dòng
      // thường / quà / mua kèm + promotionId + conditionType).
      const missingLines = findMissingOrderLines(
        sourceOrder,
        activeTab.cartItems,
      );

      let forceComplete = false;
      if (hasShortfall) {
        // A1: vừa thiếu SL vừa (có thể) thiếu dòng hẳn → gộp danh sách dòng
        // thiếu vào chính modal chọn kết thúc / giữ 1 phần (không bung 2 popup).
        const missingBlock =
          missingLines.length > 0
            ? `<p style="margin-top:8px;color:#b91c1c;font-weight:600">Các dòng bị thiếu hẳn so với đơn hàng:</p>${buildMissingLinesHtml(
                missingLines,
              )}`
            : "";
        const choice = await Swal.fire({
          icon: "question",
          title: "Đơn hàng chưa xuất đủ số lượng",
          html: `
            <p>Có ít nhất một sản phẩm xuất thiếu so với số lượng đặt.</p>
            ${missingBlock}
            <p style="margin-top:8px">Bạn có muốn <strong>kết thúc đơn hàng</strong> (hoàn thành) hay giữ trạng thái <strong>Ra 1 phần HĐ</strong>?</p>
          `,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Kết thúc đơn hàng",
          denyButtonText: "Giữ Ra 1 phần HĐ",
          cancelButtonText: "Hủy",
          confirmButtonColor: "#2563eb",
          denyButtonColor: "#0d9488",
          cancelButtonColor: "#6b7280",
        });

        // Bấm "Hủy", X, ESC hoặc click ra ngoài → hủy tạo hóa đơn, giữ nguyên tab để chỉnh sửa.
        if (!choice.isConfirmed && !choice.isDenied) return;

        forceComplete = choice.isConfirmed;
      } else if (missingLines.length > 0) {
        // A3: SL các mã đều đủ nhưng vẫn rớt hẳn một dòng (ví dụ dòng quà cùng
        // sản phẩm với dòng thường). Chỉ cảnh báo dòng thiếu, không chặn.
        const choice = await Swal.fire({
          icon: "warning",
          title: "Hóa đơn thiếu dòng so với đơn hàng",
          html: `
            <p>Hóa đơn đang tạo bị thiếu các dòng sau so với đơn hàng:</p>
            ${buildMissingLinesHtml(missingLines)}
            <p style="margin-top:8px">Bạn vẫn muốn tạo hóa đơn này chứ?</p>
          `,
          showCancelButton: true,
          confirmButtonText: "Vẫn tạo hóa đơn",
          cancelButtonText: "Ở lại điều chỉnh",
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#6b7280",
        });
        if (!choice.isConfirmed) return;
      }

      const actualPayment = activeTab.paymentAmount || 0;

      try {
        const payments =
          activeTab.paymentMethods && activeTab.paymentMethods.length > 0
            ? activeTab.paymentMethods
            : actualPayment > 0
              ? [{ method: "cash", amount: actualPayment }]
              : [];

        const result = await createPosInvoiceFromOrder.mutateAsync({
          orderId: activeTab.sourceOrderId,
          additionalPayment: actualPayment,
          payments: payments,
          forceComplete,
          soldById: activeTab.soldById ?? undefined,
          // Giảm giá cấp HĐ user đang thấy trên màn tạo hóa đơn. Bắt buộc gửi
          // (kể cả 0) — nếu không BE sẽ tự kế thừa "giảm giá còn lại" của đơn
          // gốc và bỏ qua số user vừa chỉnh.
          discountAmount: Number(activeTab.discount) || 0,
          discountRatio: Number(activeTab.discountRatio) || 0,
          // Gửi lựa chọn KM để BE re-validate + sinh lại dòng quà (xử lý cả
          // KM cộng dồn rewardSelections). Đặc biệt quan trọng khi đơn gốc
          // tạo trước tính năng KM và user áp KM lúc xuất HĐ.
          skipPromotions: false,
          appliedPromotions: buildAppliedPromotions(
            activeTab.cartItems,
            activeTab.cumulativeGiftSelections,
            activeTab.enabledCumulativePromoIds,
          ),
          items: activeTab.cartItems.map((item) => {
            const isGift = item.isPromoGift && item.promoLineType === "gift";
            const isDiscountedBuy =
              item.isPromoGift && item.promoLineType === "discounted_buy";
            const price = isGift ? 0 : Number(item.price);
            const quantity = Number(item.quantity);
            const discount = item.isPromoGift ? 0 : Number(item.discount) || 0;
            const normalPromoId =
              !isGift && !isDiscountedBuy
                ? (item.promoEnabledIds?.[0] ?? item.promotionId)
                : undefined;
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
              soldExpiryDate: item.soldExpiryDate || null,
              ...(isGift
                ? {
                    lineType: "gift",
                    isGift: true,
                    promotionId: item.promotionId,
                    triggerProductId: item.triggerProductId,
                  }
                : {}),
              ...(isDiscountedBuy
                ? {
                    lineType: "discounted_buy",
                    promotionId: item.promotionId,
                    triggerProductId: item.triggerProductId,
                  }
                : {}),
              ...(!isGift && !isDiscountedBuy
                ? {
                    enabledPromotionIds: item.promoEnabledIds || [],
                    ...(normalPromoId != null
                      ? { promotionId: Number(normalPromoId) }
                      : {}),
                  }
                : {}),
            };
          }),
        });

        handleCloseTab(activeTabId);
        toast.success("Tạo hóa đơn thành công");
        if (result?.id) {
          await paymentNotesApi.createInvoice(result.id, {
            paymentType: activeTab.paymentNoteType!,
            ...(activeTab.paymentNoteType === "cash"
              ? { amount: activeTab.paymentNoteAmount ?? 0 }
              : {}),
          });
          handlePostCreate("invoice", result.id, "/don-hang/dat-hang", {
            shouldRedirect: true,
          });
        }
      } catch (error: any) {
        toast.error(error.message || "Không thể tạo hóa đơn");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

    // Dọn URL param nếu tab đang đóng chính là tab được mở từ ?orderId / ?invoiceId.
    // Tránh việc reload lại dựng lại tab đã đóng từ param còn sót trên URL.
    if (closingTab.documentId) {
      const docIdStr = String(closingTab.documentId);
      const matchesOrderParam =
        closingTab.type === "order" && orderId === docIdStr;
      const matchesInvoiceParam =
        closingTab.type === "invoice" && invoiceId === docIdStr;
      if (matchesOrderParam || matchesInvoiceParam) {
        router.replace("/ban-hang", { scroll: false });
      }
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

    // Tab Copy: giữ nguyên data + fromPage, đổi type và label thành "Đơn hàng N" / "Hóa đơn N"
    if (activeTab.fromPage) {
      updateActiveTab({
        type: newType,
        label:
          newType === "order"
            ? `Đơn hàng ${newTabNumber}`
            : `Hóa đơn ${newTabNumber}`,
      });
      toast.success(
        `Đã chuyển sang ${newType === "order" ? "đơn hàng" : "hóa đơn"}`,
      );
      return;
    }

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
        } mới. Tab cũ được giữ lại.`,
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
        `Đã chuyển sang tab ${newType === "order" ? "đơn hàng" : "hóa đơn"}`,
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
      // Ưu tiên trọng lượng vận chuyển (shippingWeight); nếu SP chưa khai báo thì
      // fallback về khối lượng tịnh (weight).
      const hasShipping =
        item.product.shippingWeight != null &&
        Number(item.product.shippingWeight) > 0;
      const rawWeight = hasShipping
        ? Number(item.product.shippingWeight)
        : Number(item.product.weight) || 0;
      const unit = hasShipping
        ? item.product.shippingWeightUnit
        : item.product.weightUnit;
      const weightInGrams = unit === "kg" ? rawWeight * 1000 : rawWeight;
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
          : tab,
      ),
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
    quantity: number = 1,
    soldExpiryDate?: string,
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
            `Sản phẩm "${product.name}" không có trong bảng giá đang chọn, dùng giá gốc ${productPrice.toLocaleString()}`,
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
                  rowId: `${product.id}_${conditionType}_${soldExpiryDate || ""}_${Date.now()}`,
                  product,
                  quantity,
                  price: productPrice,
                  discount: 0,
                  conditionType,
                  soldExpiryDate,
                },
                ...tab.cartItems,
              ],
            }
          : tab,
      ),
    );

    // Auto-switch to "items" tab on mobile after adding product
    setMobilePosView("items");
  };

  const updateCartItem = (rowId: string, updates: Partial<CartItem>) => {
    updateActiveTab({
      cartItems: activeTab.cartItems.map((item) =>
        item.rowId === rowId ? { ...item, ...updates } : item,
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
      soldExpiryDate: item.soldExpiryDate,
      note: "",
    };
    const newCartItems = [...activeTab.cartItems];
    newCartItems.splice(index + 1, 0, newItem);
    updateActiveTab({ cartItems: newCartItems });
  };

  const handleSaveOrder = async () => {
    if (isSubmittingRef.current) return;

    if (!validatePaymentNoteSelection()) return;

    if (!selectedBranch) {
      toast.error(
        `Vui lòng chọn chi nhánh trước khi lưu ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error(
        `Vui lòng chọn khách hàng trước khi lưu ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error(
        `Vui lòng thêm sản phẩm vào ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    const unchosenGiftSave = findUnchosenGift(activeTab.cartItems);
    if (unchosenGiftSave) {
      toast.error(
        unchosenGiftSave.cumulative
          ? `Vui lòng phân bổ đủ số suất quà cho khuyến mãi "${unchosenGiftSave.promotionName}"`
          : `Vui lòng chọn sản phẩm tặng cho khuyến mãi "${unchosenGiftSave.promotionName}"`,
      );
      return;
    }

    if (!activeTab.documentId) {
      toast.error(
        `Không tìm thấy thông tin ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (activeTab.type === "order") {
      if (!existingOrder) {
        toast.error("Không tìm thấy thông tin đơn hàng");
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        const proceed = await confirmPriceMismatch("đơn hàng");
        if (!proceed) return;

        // Chặn race: nếu đơn đã ra hóa đơn (kho xử lý trong lúc sale đang sửa),
        // không cho lưu để tránh kéo ngược trạng thái đơn từ cache cũ.
        if (!(await assertOrderNotInvoiced(activeTab.documentId))) return;

        // Ghi log phương thức thanh toán (append-only) sau khi lưu đơn thành công.
        const savePaymentNote = async (
          kind: "order" | "invoice",
          id: number,
        ) => {
          const payload = {
            paymentType: activeTab.paymentNoteType!,
            ...(activeTab.paymentNoteType === "cash"
              ? { amount: activeTab.paymentNoteAmount ?? 0 }
              : {}),
          } as { paymentType: "cash" | "transfer"; amount?: number };
          if (kind === "order") await paymentNotesApi.createOrder(id, payload);
          else await paymentNotesApi.createInvoice(id, payload);
        };

        const actualPayment = activeTab.paymentAmount || 0;

        const orderData = {
          customerId: activeTab.selectedCustomer.id,
          branchId: selectedBranch?.id,
          soldById: activeTab.soldById ?? user?.id,
          priceBookId: activeTab.selectedPriceBookId ?? 0,
          orderDate: existingOrder.orderDate,
          orderStatus: existingOrder.orderStatus,
          description: activeTab.orderNote,
          paidAmount: actualPayment,
          discountAmount: Number(activeTab.discount) || 0,
          discountRatio: Number(activeTab.discountRatio) || 0,
          items: activeTab.cartItems.map((item) => {
            const isGift = item.isPromoGift && item.promoLineType === "gift";
            const isDiscountedBuy =
              item.isPromoGift && item.promoLineType === "discounted_buy";
            return {
              productId: Number(item.product.id),
              quantity: Number(item.quantity),
              unitPrice: isGift ? 0 : Number(item.price),
              discount: item.isPromoGift ? 0 : Number(item.discount) || 0,
              discountRatio: 0,
              note: item.note || "",
              conditionType: item.conditionType || "normal",
              soldExpiryDate: item.soldExpiryDate || null,
              ...(isGift
                ? {
                    lineType: "gift",
                    isGift: true,
                    promotionId: item.promotionId,
                    triggerProductId: item.triggerProductId,
                  }
                : {}),
              ...(isDiscountedBuy
                ? {
                    lineType: "discounted_buy",
                    promotionId: item.promotionId,
                    triggerProductId: item.triggerProductId,
                  }
                : {}),
              ...(!isGift && !isDiscountedBuy
                ? { enabledPromotionIds: item.promoEnabledIds || [] }
                : {}),
            };
          }),
          skipPromotions: false,
          appliedPromotions: buildAppliedPromotions(
            activeTab.cartItems,
            activeTab.cumulativeGiftSelections,
            activeTab.enabledCumulativePromoIds,
          ),
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
              });
            }
          }

          await updateOrder.mutateAsync({
            id: activeTab.documentId,
            data: orderData,
          });
          await savePaymentNote("order", activeTab.documentId);

          const key = getEditStorageKey(activeTab.documentId, "order");
          localStorage.removeItem(key);

          setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

          // QUEUE PRINT
          toast.success("Lưu đơn hàng thành công");
          handlePostCreate(
            "order",
            activeTab.documentId,
            "/don-hang/dat-hang",
            {
              shouldRedirect: true,
            },
          );
        } catch (error: any) {
          console.error("Save order error:", error);
          toast.error(error.message || "Không thể lưu đơn hàng");
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const validatePaymentNoteSelection = (): boolean => {
    if (!activeTab.paymentNoteType) {
      toast.error(
        "Vui lòng chọn phương thức thanh toán: chuyển khoản hoặc tiền mặt",
      );
      return false;
    }
    if (activeTab.paymentNoteType === "cash") {
      if (activeTab.paymentNoteAmount == null) {
        toast.error("Vui lòng nhập số tiền mặt");
        return false;
      }
      if (activeTab.paymentNoteAmount < 0) {
        toast.error("Số tiền mặt không hợp lệ");
        return false;
      }
    }
    return true;
  };

  const handleSaveInvoice = async () => {
    if (!validatePaymentNoteSelection()) return;

    if (isSubmittingRef.current) return;

    if (!selectedBranch) {
      toast.error(
        `Vui lòng chọn chi nhánh trước khi lưu ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error(
        `Vui lòng chọn khách hàng trước khi lưu ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error(
        `Vui lòng thêm sản phẩm vào ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    const unchosenGiftInv = findUnchosenGift(activeTab.cartItems);
    if (unchosenGiftInv) {
      toast.error(
        unchosenGiftInv.cumulative
          ? `Vui lòng phân bổ đủ số suất quà cho khuyến mãi "${unchosenGiftInv.promotionName}"`
          : `Vui lòng chọn sản phẩm tặng cho khuyến mãi "${unchosenGiftInv.promotionName}"`,
      );
      return;
    }

    if (!activeTab.documentId) {
      toast.error(
        `Không tìm thấy thông tin ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (!existingInvoice) {
      toast.error("Không tìm thấy thông tin hóa đơn");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const proceed = await confirmPriceMismatch("hóa đơn");
      if (!proceed) return;

      // Cảnh báo dòng thiếu hẳn so với ĐƠN HÀNG gốc (nếu HĐ thuộc một đơn).
      // HĐ bán lẻ (orderId null) → không có mốc đơn để so → bỏ qua.
      if (existingInvoice.orderId) {
        try {
          const sourceOrder = await ordersApi.getOrder(
            Number(existingInvoice.orderId),
          );
          // Loại chính HĐ đang sửa khỏi phần "đã xuất": phần đóng góp của nó
          // được thay bằng giỏ hiện tại (activeTab.cartItems) để phát hiện dòng
          // vừa bị xóa khi tạo HĐ ".xx".
          const missingLines = findMissingOrderLines(
            sourceOrder,
            activeTab.cartItems,
            activeTab.documentId,
          );
          if (missingLines.length > 0) {
            const choice = await Swal.fire({
              icon: "warning",
              title: "Hóa đơn thiếu dòng so với đơn hàng",
              html: `
                <p>Hóa đơn này đang thiếu hẳn các dòng sau so với đơn hàng gốc:</p>
                ${buildMissingLinesHtml(missingLines)}
                <p style="margin-top:8px">Bạn vẫn muốn tạo hóa đơn này chứ?</p>
              `,
              showCancelButton: true,
              confirmButtonText: "Vẫn tạo hóa đơn",
              cancelButtonText: "Ở lại điều chỉnh",
              confirmButtonColor: "#2563eb",
              cancelButtonColor: "#6b7280",
            });
            if (!choice.isConfirmed) return;
          }
        } catch (error) {
          // Lỗi fetch đơn gốc không nên chặn lưu HĐ.
          console.error("handleSaveInvoice missing-lines check error:", error);
        }
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
        // Gửi lựa chọn KM để BE re-validate + sinh lại dòng quà khi sửa HĐ
        // (xử lý cả reissue .xx lẫn in-place). Trước đây 2 luồng invoice
        // (tạo từ đơn + sửa) bị thiếu appliedPromotions nên dòng quà bị drop.
        skipPromotions: false,
        appliedPromotions: buildAppliedPromotions(
          activeTab.cartItems,
          activeTab.cumulativeGiftSelections,
          activeTab.enabledCumulativePromoIds,
        ),
        items: activeTab.cartItems.map((item) => {
          const isGift = item.isPromoGift && item.promoLineType === "gift";
          const isDiscountedBuy =
            item.isPromoGift && item.promoLineType === "discounted_buy";
          const price = isGift ? 0 : Number(item.price);
          const quantity = Number(item.quantity);
          const discount = item.isPromoGift ? 0 : Number(item.discount) || 0;
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
            soldExpiryDate: item.soldExpiryDate || null,
            ...(isGift
              ? {
                  lineType: "gift",
                  isGift: true,
                  promotionId: item.promotionId,
                  triggerProductId: item.triggerProductId,
                }
              : {}),
            ...(isDiscountedBuy
              ? {
                  lineType: "discounted_buy",
                  promotionId: item.promotionId,
                  triggerProductId: item.triggerProductId,
                }
              : {}),
            ...(!isGift && !isDiscountedBuy
              ? { enabledPromotionIds: item.promoEnabledIds || [] }
              : {}),
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
            });
          }
        }

        const updatedInvoice = await updateInvoice.mutateAsync({
          id: activeTab.documentId,
          data: invoiceData,
        });
        await paymentNotesApi.createInvoice(activeTab.documentId, {
          paymentType: activeTab.paymentNoteType!,
          ...(activeTab.paymentNoteType === "cash"
            ? { amount: activeTab.paymentNoteAmount ?? 0 }
            : {}),
        });

        const key = getEditStorageKey(activeTab.documentId, "invoice");
        localStorage.removeItem(key);

        setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

        toast.success("Lưu hóa đơn thành công");
        handlePostCreate(
          "invoice",
          updatedInvoice?.id ?? activeTab.documentId,
          "/don-hang/hoa-don",
          { shouldRedirect: true },
        );
      } catch (error: any) {
        console.error("Save invoice error:", error);
        toast.error(error.message || "Không thể lưu hóa đơn");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSaveConsignment = async () => {
    if (isSubmittingRef.current) return;

    if (!selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh trước khi lưu phiếu ký gửi");
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error("Vui lòng chọn khách hàng trước khi lưu phiếu ký gửi");
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    if (!activeTab.documentId) {
      toast.error("Không tìm thấy ID phiếu ký gửi");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const consignmentData: any = {
        customerId: activeTab.selectedCustomer.id,
        branchId: selectedBranch?.id,
        soldById: activeTab.soldById ?? user?.id,
        discountAmount: Number(activeTab.discount) || 0,
        discountRatio: Number(activeTab.discountRatio) || 0,
        priceBookId: activeTab.selectedPriceBookId ?? 0,
        consignStatus: activeTab.consignStatus || "pending",
        description: activeTab.orderNote,
        items: activeTab.cartItems
          .filter((item) => !item.isPromoGift)
          .map((item) => ({
            productId: item.product?.id,
            quantity: Number(item.quantity),
            unitPrice: Number(item.price),
            discount: Number(item.discount) || 0,
            note: item.note,
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

      await updateConsignment.mutateAsync({
        id: activeTab.documentId,
        data: consignmentData,
      });

      const key = getEditStorageKey(activeTab.documentId, "consignment");
      localStorage.removeItem(key);

      setTabs((prevTabs) => prevTabs.filter((t) => t.id !== activeTabId));

      toast.success("Lưu phiếu ký gửi thành công");

      router.replace("/don-hang/ky-gui", { scroll: false });
    } catch (error: any) {
      console.error("Update consignment error:", error);
      toast.error(error.message || "Không thể lưu phiếu ký gửi");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCreateDocument = async () => {
    if (activeTab.type !== "consignment" && !validatePaymentNoteSelection())
      return;

    if (isSubmittingRef.current) return;

    if (!selectedBranch) {
      toast.error(
        `Vui lòng chọn chi nhánh trước khi tạo ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (!activeTab.selectedCustomer) {
      toast.error(
        `Vui lòng chọn khách hàng trước khi tạo ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    if (activeTab.cartItems.length === 0) {
      toast.error(
        `Vui lòng thêm sản phẩm vào ${
          activeTab.type === "order" ? "đơn hàng" : "hóa đơn"
        }`,
      );
      return;
    }

    // Chặn nếu còn dòng quà KM chưa chọn sản phẩm tặng / chưa phân bổ đủ suất
    const unchosenGift = findUnchosenGift(activeTab.cartItems);
    if (unchosenGift) {
      toast.error(
        unchosenGift.cumulative
          ? `Vui lòng phân bổ đủ số suất quà cho khuyến mãi "${unchosenGift.promotionName}"`
          : `Vui lòng chọn sản phẩm tặng cho khuyến mãi "${unchosenGift.promotionName}"`,
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const proceed = await confirmPriceMismatch(
      activeTab.type === "order" ? "đơn hàng" : "hóa đơn",
    );
    if (!proceed) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
      documentData.items = activeTab.cartItems.map((item) => {
        const isGift = item.isPromoGift && item.promoLineType === "gift";
        const isDiscountedBuy =
          item.isPromoGift && item.promoLineType === "discounted_buy";
        return {
          productId: Number(item.product.id),
          quantity: Number(item.quantity),
          unitPrice: isGift ? 0 : Number(item.price),
          discount: item.isPromoGift ? 0 : Number(item.discount) || 0,
          discountRatio: 0,
          note: item.note || "",
          conditionType: item.conditionType || "normal",
          soldExpiryDate: item.soldExpiryDate || null,
          ...(isGift
            ? {
                lineType: "gift",
                isGift: true,
                promotionId: item.promotionId,
                triggerProductId: item.triggerProductId,
              }
            : {}),
          ...(isDiscountedBuy
            ? {
                lineType: "discounted_buy",
                promotionId: item.promotionId,
                triggerProductId: item.triggerProductId,
              }
            : {}),
          ...(!isGift && !isDiscountedBuy
            ? {
                enabledPromotionIds: item.promoEnabledIds || [],
                ...(item.promoEnabledIds?.[0] != null
                  ? { promotionId: Number(item.promoEnabledIds[0]) }
                  : {}),
              }
            : {}),
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
      // Gửi lựa chọn KM để BE re-validate (dòng quà do KM sinh có promotionId)
      const orderAppliedPromotions = buildAppliedPromotions(
        activeTab.cartItems,
        activeTab.cumulativeGiftSelections,
        activeTab.enabledCumulativePromoIds,
      );
      documentData.skipPromotions = false;
      documentData.appliedPromotions = orderAppliedPromotions;
    } else if (activeTab.type === "consignment") {
      // Phiếu ký gửi (B1): tạo ở Phiếu tạm; không khuyến mãi, không thanh toán.
      documentData.consignDate = new Date().toISOString();
      documentData.consignStatus = activeTab.consignStatus || "pending";
      documentData.description = activeTab.orderNote;
      // Ký gửi không quản lý loại tồn (bục rách / cận date) → không gửi
      // conditionType & soldExpiryDate. BE ConsignmentItemDto không có
      // soldExpiryDate (ValidationPipe forbidNonWhitelisted sẽ reject), còn
      // conditionType tuy được DTO nhận nhưng service không lưu (model
      // ConsignmentItem không có cột này).
      documentData.items = activeTab.cartItems.map((item) => ({
        productId: Number(item.product.id),
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        discount: Number(item.discount) || 0,
        note: item.note || "",
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
      if (actualPayment > 0) {
        documentData.payments =
          activeTab.paymentMethods && activeTab.paymentMethods.length > 0
            ? activeTab.paymentMethods.map((p) => ({
                method: p.method,
                amount: p.amount,
                accountId: p.accountId,
              }))
            : [{ method: "cash", amount: actualPayment }];
      }
      documentData.items = activeTab.cartItems.map((item) => {
        const isGift = item.isPromoGift && item.promoLineType === "gift";
        const isDiscountedBuy =
          item.isPromoGift && item.promoLineType === "discounted_buy";
        const price = isGift ? 0 : Number(item.price);
        const quantity = Number(item.quantity);
        const discount = item.isPromoGift ? 0 : Number(item.discount) || 0;
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
          soldExpiryDate: item.soldExpiryDate || null,
          ...(isGift
            ? {
                lineType: "gift",
                isGift: true,
                promotionId: item.promotionId,
                triggerProductId: item.triggerProductId,
              }
            : {}),
          ...(isDiscountedBuy
            ? {
                lineType: "discounted_buy",
                promotionId: item.promotionId,
                triggerProductId: item.triggerProductId,
              }
            : {}),
          ...(!isGift && !isDiscountedBuy
            ? {
                enabledPromotionIds: item.promoEnabledIds || [],
                ...(item.promoEnabledIds?.[0] != null
                  ? { promotionId: Number(item.promoEnabledIds[0]) }
                  : {}),
              }
            : {}),
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
      // Gửi lựa chọn KM để BE re-validate (dòng quà do KM sinh có promotionId)
      const appliedPromotions = buildAppliedPromotions(
        activeTab.cartItems,
        activeTab.cumulativeGiftSelections,
        activeTab.enabledCumulativePromoIds,
      );
      documentData.skipPromotions = false;
      documentData.appliedPromotions = appliedPromotions;
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
                accountId: payment.accountId,
              });
            }
          }

          docId = result?.order?.id;
          if (docId)
            await paymentNotesApi.createOrder(docId, {
              paymentType: activeTab.paymentNoteType!,
              ...(activeTab.paymentNoteType === "cash"
                ? { amount: activeTab.paymentNoteAmount ?? 0 }
                : {}),
            });
        } else if (activeTab.type === "consignment") {
          const result = await createConsignment.mutateAsync(documentData);
          docId = (result as any)?.id;
        } else {
          const result = await createPosInvoice.mutateAsync(documentData);

          docId = result?.id;
          if (docId)
            await paymentNotesApi.createInvoice(docId, {
              paymentType: activeTab.paymentNoteType!,
              ...(activeTab.paymentNoteType === "cash"
                ? { amount: activeTab.paymentNoteAmount ?? 0 }
                : {}),
            });
        }

        handleCloseTab(activeTabId);

        if (docId) {
          // Xác định trang redirect:
          // - Copy tab: dùng activeTab.fromPage (giữ nguyên dù đã "Chuyển" loại tab)
          // - Tạo mới từ trang danh sách: dùng fromPageRef.current
          // - Tạo trực tiếp từ /ban-hang: không redirect
          const tabFromPage = activeTab.fromPage || fromPageRef.current;
          const targetUrl =
            tabFromPage === "dat-hang"
              ? "/don-hang/dat-hang"
              : tabFromPage === "hoa-don"
                ? "/don-hang/hoa-don"
                : tabFromPage === "ky-gui"
                  ? "/don-hang/ky-gui"
                  : activeTab.type === "order"
                    ? "/don-hang/dat-hang"
                    : activeTab.type === "consignment"
                      ? "/don-hang/ky-gui"
                      : "/don-hang/hoa-don";

          handlePostCreate(
            activeTab.type === "order"
              ? "order"
              : activeTab.type === "consignment"
                ? "consignment"
                : "invoice",
            docId,
            targetUrl,
            { shouldRedirect: !!tabFromPage },
          );
        }
      } catch (error: any) {
        console.error("Create document error:", error);
        toast.error(
          error.message ||
            `Không thể tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"}`,
        );
      }
    } catch (error: any) {
      console.error("Create document error:", error);
      toast.error(
        error.message ||
          `Không thể tạo ${activeTab.type === "order" ? "đơn hàng" : "hóa đơn"}`,
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
      <div className="h-full flex items-center justify-center bg-brand-dark">
        <div className="text-white text-lg">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-dark">
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
          }`}
        >
          <span className="text-white font-medium text-sm">{tab.label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCloseTab(tab.id);
            }}
            className="hover:bg-white/20 p-1 rounded"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAddTab}
        className="px-2 lg:px-3 py-1 lg:py-2 rounded text-white hover:bg-white/20 font-medium flex-shrink-0"
      >
        <Plus className="w-5 h-5" />
      </button>
      {canCreateOrder && canCreateInvoice && (
        <button
          onClick={handleToggleType}
          className="px-2 lg:px-3 py-1 lg:py-2 rounded text-white hover:bg-white/20 font-medium flex-shrink-0"
        >
          <ArrowLeftRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-brand-dark">
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
        {activeTab.type !== "invoice" ? (
          <>
            {/* Items panel */}
            <div
              className={`${
                mobilePosView === "items" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[60%] min-h-0 flex-1 lg:flex-none`}
            >
              <OrderItemsList
                cartItems={activeTab.cartItems}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                onDuplicateItem={duplicateCartItem}
                orderNote={activeTab.orderNote}
                onOrderNoteChange={(orderNote) =>
                  updateActiveTab({ orderNote })
                }
                selectedCustomerId={activeTab.selectedCustomer?.id}
                canEditPrice={canEditPrice}
                canEditDiscount={canEditDiscount}
                canViewInventory={canViewInventory}
                priceWarnings={priceWarnings}
                documentType={activeTab.type}
                promoProgress={promoProgressByTab[activeTab.id]}
                cumulativeGiftSelections={activeTab.cumulativeGiftSelections}
                enabledCumulativePromoIds={activeTab.enabledCumulativePromoIds}
                disabledCumulativePromoIds={
                  activeTab.disabledCumulativePromoIds
                }
                onTogglePromotion={togglePromotionCumulative}
                onSetGiftSelection={setCumulativeGiftSelection}
                className="w-full flex-1 bg-white flex flex-col min-h-0"
              />
              {/* Mobile action buttons */}
              <div className="lg:hidden flex-shrink-0 px-3 py-2 border-t bg-white">
                {activeTab.isEditMode ? (
                  <div className="flex gap-4">
                    {canCreateInvoice && (
                      <LoadingButton
                        onClick={handleConvertToInvoice}
                        disabled={activeTab.cartItems.length === 0}
                        className="w-full bg-brand text-white py-2 rounded-lg hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                      >
                        TẠO HÓA ĐƠN
                      </LoadingButton>
                    )}
                    <LoadingButton
                      onClick={() => handleSaveOrder()}
                      loading={isSubmitting}
                      disabled={activeTab.cartItems.length === 0}
                      className="w-full bg-orange-400 text-white py-2 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                    >
                      LƯU
                    </LoadingButton>
                  </div>
                ) : (
                  <LoadingButton
                    onClick={() => handleCreateDocument()}
                    loading={isSubmitting}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-brand text-white py-2 rounded-lg hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    Tạo đơn hàng
                  </LoadingButton>
                )}
              </div>
            </div>

            {/* Cart panel */}
            <div
              className={`${
                mobilePosView === "cart" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[40%] min-h-0 border-l flex-1 lg:flex-none`}
            >
              <OrderCart
                key={activeTab.id}
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
                paymentNoteType={activeTab.paymentNoteType}
                onPaymentNoteTypeChange={(paymentNoteType) =>
                  updateActiveTab({ paymentNoteType })
                }
                paymentNoteAmount={activeTab.paymentNoteAmount}
                onPaymentNoteAmountChange={(paymentNoteAmount) =>
                  updateActiveTab({ paymentNoteAmount })
                }
                onPaymentMethodsChange={(paymentMethods) =>
                  updateActiveTab({ paymentMethods })
                }
                onCreateOrder={handleCreateDocument}
                onSaveOrder={
                  activeTab.type === "consignment"
                    ? handleSaveConsignment
                    : handleSaveOrder
                }
                onCreateInvoice={handleConvertToInvoice}
                discount={activeTab.discount}
                discountRatio={activeTab.discountRatio}
                onDiscountChange={(discount) => updateActiveTab({ discount })}
                onDiscountRatioChange={(discountRatio) =>
                  updateActiveTab({ discountRatio })
                }
                onDeliveryInfoChange={(deliveryInfo) =>
                  updateActiveTab({ deliveryInfo })
                }
                deliveryInfo={activeTab.deliveryInfo}
                isEditMode={!!activeTab.isEditMode}
                existingOrder={activeTab.sourceOrder || existingOrder}
                documentType={activeTab.type}
                consignStatus={activeTab.consignStatus}
                onConsignStatusChange={(consignStatus) =>
                  updateActiveTab({ consignStatus })
                }
                onSelectAddress={handleSelectAddress}
                selectedAddressId={activeTab.selectedAddressId}
                soldById={activeTab.soldById}
                onSellerChange={(soldById) => updateActiveTab({ soldById })}
                canEditSeller={canEditSeller}
                canViewPayment={canViewPayment}
                canEditPayment={canEditPayment}
                canCreateInvoice={canCreateInvoice}
                isSubmitting={isSubmitting}
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
              } lg:flex flex-col w-full lg:w-[60%] min-h-0 flex-1 lg:flex-none`}
            >
              <InvoiceItemsList
                cartItems={activeTab.cartItems}
                onUpdateItem={updateCartItem}
                onRemoveItem={removeFromCart}
                onDuplicateItem={duplicateCartItem}
                orderNote={activeTab.orderNote}
                onOrderNoteChange={(orderNote) =>
                  updateActiveTab({ orderNote })
                }
                selectedCustomerId={activeTab.selectedCustomer?.id}
                canEditPrice={canEditPrice}
                canEditDiscount={canEditDiscount}
                canViewInventory={canViewInventory}
                priceWarnings={priceWarnings}
                promoProgress={promoProgressByTab[activeTab.id]}
                cumulativeGiftSelections={activeTab.cumulativeGiftSelections}
                enabledCumulativePromoIds={activeTab.enabledCumulativePromoIds}
                disabledCumulativePromoIds={
                  activeTab.disabledCumulativePromoIds
                }
                onTogglePromotion={togglePromotionCumulative}
                onSetGiftSelection={setCumulativeGiftSelection}
                className="w-full flex-1 bg-white flex flex-col min-h-0"
              />
              {/* Mobile action buttons */}
              <div className="lg:hidden flex-shrink-0 px-3 py-2 border-t bg-white">
                {activeTab.sourceOrderId ? (
                  <LoadingButton
                    onClick={handlePayment}
                    loading={isSubmitting}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    THANH TOÁN
                  </LoadingButton>
                ) : activeTab.documentId ? (
                  <LoadingButton
                    onClick={() => handleSaveInvoice()}
                    loading={isSubmitting}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-orange-400 text-white py-2 rounded-lg hover:bg-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    LƯU
                  </LoadingButton>
                ) : (
                  <LoadingButton
                    onClick={() => handleCreateDocument()}
                    loading={isSubmitting}
                    disabled={activeTab.cartItems.length === 0}
                    className="w-full bg-brand text-white py-2 rounded-lg hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    Tạo hóa đơn
                  </LoadingButton>
                )}
              </div>
            </div>

            {/* Invoice cart panel */}
            <div
              className={`${
                mobilePosView === "cart" ? "flex" : "hidden"
              } lg:flex flex-col w-full lg:w-[40%] min-h-0 border-l flex-1 lg:flex-none`}
            >
              <InvoiceCart
                key={activeTab.id}
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
                paymentNoteType={activeTab.paymentNoteType}
                onPaymentNoteTypeChange={(paymentNoteType) =>
                  updateActiveTab({ paymentNoteType })
                }
                paymentNoteAmount={activeTab.paymentNoteAmount}
                onPaymentNoteAmountChange={(paymentNoteAmount) =>
                  updateActiveTab({ paymentNoteAmount })
                }
                onPaymentMethodsChange={(paymentMethods) =>
                  updateActiveTab({ paymentMethods })
                }
                onCreateOrder={handleCreateDocument}
                onSaveOrder={handleSaveInvoice}
                onPayment={handlePayment}
                discount={activeTab.discount}
                discountRatio={activeTab.discountRatio}
                onDiscountChange={(discount) => updateActiveTab({ discount })}
                onDiscountRatioChange={(discountRatio) =>
                  updateActiveTab({ discountRatio })
                }
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
                isSubmitting={isSubmitting}
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
              ? "text-brand border-t-2 border-brand"
              : "text-gray-500"
          }`}
        >
          <List className="w-5 h-5" />
          <span className="text-xs font-medium">Hàng hóa</span>
        </button>

        <button
          onClick={() => setMobilePosView("cart")}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
            mobilePosView === "cart"
              ? "text-brand border-t-2 border-brand"
              : "text-gray-500"
          }`}
        >
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
