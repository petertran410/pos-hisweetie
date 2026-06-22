export type PromotionType =
  | "INVOICE_DISCOUNT"
  | "PRODUCT_DISCOUNT"
  | "BUY_X_GET_Y"
  | "BUY_N_GET_M_SAME"
  | "BUY_X_BUY_Y_PRICE"
  | "GIFT_BY_INVOICE"
  | "CATEGORY_DISCOUNT";

export type RewardType =
  | "discount_percent"
  | "discount_amount"
  | "gift"
  | "discounted_buy";

export type PromotionStatus =
  | "draft"
  | "running"
  | "paused"
  | "stopped"
  | "expired";

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  INVOICE_DISCOUNT: "Giảm giá hóa đơn",
  PRODUCT_DISCOUNT: "Giảm giá hàng hóa",
  BUY_X_GET_Y: "Mua X tặng Y",
  BUY_N_GET_M_SAME: "Mua N tặng M cùng loại",
  BUY_X_BUY_Y_PRICE: "Mua X mua kèm Y giá KM",
  GIFT_BY_INVOICE: "Quà tặng theo hóa đơn",
  CATEGORY_DISCOUNT: "Giảm giá theo nhóm hàng",
};

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Nháp",
  running: "Đang chạy",
  paused: "Tạm dừng",
  stopped: "Đã ngừng",
  expired: "Hết hạn",
};

export interface PromotionProductRef {
  productId?: number | null;
  categoryName?: string | null;
}

export interface PromotionReward {
  id?: number;
  buyProductId?: number | null;
  buyCategoryName?: string | null;
  buyQuantity?: number;
  rewardType: RewardType;
  rewardProductId?: number | null;
  rewardQuantity?: number;
  rewardValue?: number;
  buyItems?: PromotionProductRef[];
  rewardItems?: PromotionProductRef[];
  buyProduct?: { id: number; name: string; code: string };
  rewardProduct?: { id: number; name: string; code: string };
}

export interface Promotion {
  id: number;
  code: string;
  name: string;
  type: PromotionType;
  description?: string;
  isActive: boolean;
  status: PromotionStatus;
  priority: number;
  stackable: boolean;
  startDate?: string | null;
  endDate?: string | null;
  applyTimeFrom?: string | null;
  applyTimeTo?: string | null;
  applyWeekdays: number[];
  forAllBranch: boolean;
  forAllCustomer: boolean;
  forAllUser: boolean;
  minOrderValue: number;
  minQuantity: number;
  maxDiscountAmount?: number | null;
  maxRewardQuantity?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  autoApply: boolean;
  rewards: PromotionReward[];
  branches?: { branchId: number }[];
  customers?: { customerId: number; customer?: { id: number; name: string; phone?: string } }[];
  customerGroups?: { customerGroupId: number }[];
  users?: { userId: number }[];
  products?: {
    role: string;
    productId?: number | null;
    categoryName?: string | null;
    product?: { id: number; name: string; code: string };
  }[];
  _count?: { logs: number };
  createdAt: string;
  updatedAt: string;
}

export interface PromotionLog {
  id: number;
  invoiceId?: number | null;
  orderId?: number | null;
  promotionId: number;
  promotionCode: string;
  promotionName: string;
  type: PromotionType;
  discountAmount: number;
  giftValue: number;
  status: "applied" | "reverted";
  createdAt: string;
  invoice?: { id: number; code: string } | null;
  order?: { id: number; code: string } | null;
}

export interface PromotionUsageDoc {
  id: number;
  code: string;
  date: string;
  status?: number;
  statusValue?: string | null;
}

export interface PromotionUsage {
  orders: PromotionUsageDoc[];
  invoices: PromotionUsageDoc[];
}

export interface PromotionStatsItem {
  productId: number;
  code: string;
  name: string;
  soldQty: number;
  promoQty: number;
}

export interface PromotionStats {
  items: PromotionStatsItem[];
  totals: { soldQty: number; promoQty: number };
  limits: {
    usageLimit: number | null;
    usageCount: number;
    usageRemaining: number | null;
    maxRewardQuantity: number | null;
    rewardIssued: number;
    rewardRemaining: number | null;
  };
}

export interface PromotionFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  branchId?: number;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  type: PromotionType;
  description?: string;
  isActive?: boolean;
  priority?: number;
  stackable?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  applyTimeFrom?: string | null;
  applyTimeTo?: string | null;
  applyWeekdays?: number[];
  forAllBranch?: boolean;
  forAllCustomer?: boolean;
  forAllUser?: boolean;
  minOrderValue?: number;
  minQuantity?: number;
  maxDiscountAmount?: number | null;
  maxRewardQuantity?: number | null;
  usageLimit?: number | null;
  autoApply?: boolean;
  branchIds?: number[];
  customerIds?: number[];
  customerGroupIds?: number[];
  userIds?: number[];
  rewards: PromotionReward[];
}

// ---- Evaluate (dùng ở POS) ----

export interface EvaluateItem {
  productId: number;
  quantity: number;
  price: number;
  discount?: number;
  // Opt-in per-line: promotionId mà thu ngân bật KM cho dòng này.
  enabledPromotionIds?: number[];
}

export interface PromoGiftLine {
  productId: number;
  productName?: string;
  productCode?: string;
  quantity: number;
  price: number;
  lineType: "gift";
  isGift: true;
  promotionId: number;
  availableStock: number;
  stockEnough: boolean;
}

export interface PromoDiscountedBuyLine {
  productId: number;
  productName?: string;
  productCode?: string;
  maxQuantity: number;
  promoPrice: number;
  lineType: "discounted_buy";
  promotionId: number;
  availableStock: number;
}

export interface PromoDiscountLine {
  productId: number;
  perUnitDiscount: number;
  quantity: number;
  promotionId: number;
}

export interface RewardOption {
  productId: number;
  productName?: string;
  productCode?: string;
  availableStock: number;
}

export interface EligiblePromotion {
  promotionId: number;
  code: string;
  name: string;
  type: PromotionType;
  autoApply: boolean;
  selected: boolean;
  scope: string;
  priority: number;
  stackable: boolean;
  discountAmount: number;
  giftLines: PromoGiftLine[];
  discountedBuyLines: PromoDiscountedBuyLine[];
  discountLines: PromoDiscountLine[];
  rewardQuantity?: number;
  rewardOptions?: RewardOption[];
  promoPrice?: number;
  requiresChoice?: boolean;
  matchedProductIds?: number[];
}

export interface EvaluateResult {
  subtotal: number;
  totalQuantity: number;
  eligiblePromotions: EligiblePromotion[];
  conflicts: { promotionIds: number[]; reason: string }[];
  estimatedDiscount: number;
  estimatedTotalAfter: number;
}

export interface AppliedPromotion {
  promotionId: number;
  giftProductId?: number;
  giftQuantity?: number;
  discountedBuyProductId?: number;
  discountedBuyQuantity?: number;
}
