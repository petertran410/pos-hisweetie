// Bảng giá sản phẩm mới — khớp backend src/new-product-price.

export type NppStage =
  | "PROPOSAL"
  | "PURCHASING"
  | "ACCOUNTING"
  | "SALES"
  | "CEO"
  | "DATA"
  | "DONE"
  | "ENDED";
export type NppStatus = "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type NppDecision = "APPROVED" | "REJECTED";
export type NppAction =
  | "COMPLETE"
  | "SEND_BACK"
  | "SEND_KTT"
  | "KTT_DECIDE"
  | "CEO_DECIDE"
  | "APPLY"
  | "END"
  | "COMMENT";
export type NppGroup =
  "PURCHASING" | "ACCOUNTING" | "CHIEF_ACCOUNTANT" | "SALES" | "CEO" | "DATA";
export type NppPriceTargetKey =
  | "HN_RETAIL"
  | "HN_WHOLESALE"
  | "SG_RETAIL"
  | "SG_WHOLESALE"
  | "DLCL"
  | "SHOPEE";
export type NppCostGroupKey = "HN" | "SG" | "DT";

export interface NppAttachment {
  url: string;
  originalName?: string | null;
  mimetype?: string | null;
  size?: number | null;
  isPrimary?: boolean;
  larkFileToken?: string;
}

export interface NppOemCustomer {
  customerId: number;
  code: string | null;
  name: string;
}

export interface NppTicket {
  id: number;
  code: string;
  sourceRecordId: string | null;
  importNotes: { field: string; value: string }[] | null;
  stage: NppStage;
  status: NppStatus;
  stageEnteredAt: string;

  productName: string;
  parentName: string | null;
  childName: string | null;
  middleName: string | null;
  tradeMarkId: number | null;
  tradeMarkName: string | null;
  unit: string | null;
  netWeightGram: number | null;
  description: string | null;
  uspUrl: string | null;
  usageUrl: string | null;
  rdUpdatedAt: string | null;
  costApproverId: number | null;
  costApproverName: string | null;

  /** Chữ tự do nhập từ Lark (cũ) — phiếu mới dùng supplierId / factoryId. */
  supplierFactory: string | null;
  supplierId: number | null;
  supplierName: string | null;
  factoryId: number | null;
  factoryName: string | null;
  moqCartons: number | null;
  deliveryTerms: string | null;
  importName: string | null;
  arrivalDate: string | null;
  launchDate: string | null;
  publicationInfo: string | null;
  estimatedPublicationCost: number | null;
  packingSpec: number | null;
  goodsPrice: number | null;
  exchangeRate: number | null;
  vatTax: number | null;
  importTax: number | null;
  overheadCost: number | null;
  costHn: number | null;
  costSg: number | null;

  misaCode: string | null;
  cogsHn: number | null;
  cogsSg: number | null;
  cogsDt: number | null;
  sendToChiefAccountant: boolean;
  chiefAccountantDecision: NppDecision | null;
  chiefAccountantByName: string | null;
  chiefAccountantAt: string | null;
  chiefAccountantNote: string | null;

  priceHnRetail: number | null;
  priceHnWholesale: number | null;
  priceSgRetail: number | null;
  priceSgWholesale: number | null;
  priceDlcl: number | null;
  priceShopee: number | null;
  priceOem: number | null;
  oemPriceBookId: number | null;
  oemPriceBookName: string | null;
  oemCustomers: NppOemCustomer[] | null;
  salesDecidedAt: string | null;

  ceoDecision: NppDecision | null;
  ceoByName: string | null;
  ceoAt: string | null;
  ceoNote: string | null;

  productId: number | null;
  productCode: string | null;
  appliedAt: string | null;
  appliedByName: string | null;

  note: string | null;
  images: NppAttachment[] | null;
  documents: NppAttachment[] | null;

  doneAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  createdById: number | null;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  leadtimeDays: number;
}

export interface NppAnalysisRow {
  key: string;
  label: string;
  price: number | null;
  priceExVat: number | null;
  cogs: number | null;
  profit: number | null;
  margin: number | null;
  basis: string;
}

export interface NppDelivery {
  userId: number;
  name: string;
  status: "SENT" | "NO_LARK" | "ERROR";
  error?: string;
}

/** Kết quả gửi vào chủ đề của phiếu trong nhóm Lark. */
export interface NppGroupDelivery {
  chatId: string;
  rootMessageId?: string | null;
  messageId?: string | null;
  /** true = lần này mới mở chủ đề (chuẩn chung lark-sync/lark-topic.ts). */
  created?: boolean;
  /** Tên cũ của `created` (phiếu test trước khi chuẩn hóa). */
  openedTopic?: boolean;
  mentioned?: string[];
  status: "SENT" | "ERROR";
  error?: string;
}

export interface NppEvent {
  id: number;
  ticketId: number;
  type: string;
  fromStage: NppStage | null;
  toStage: NppStage | null;
  content: string | null;
  data: Record<string, unknown> | null;
  actorId: number | null;
  actorName: string | null;
  createdAt: string;
}

export interface NppAccess {
  editableFields: string[];
  actions: NppAction[];
  isStageActor: boolean;
  completeBlockReason: string | null;
}

export interface NppTicketDetail extends NppTicket {
  goodsPriceVnd: number | null;
  analysis: NppAnalysisRow[];
  access: NppAccess;
  events: NppEvent[];
}

export interface NppFilters {
  stages?: string[];
  statuses?: string[];
  parentNames?: string[];
  tradeMarkIds?: number[];
  createdByIds?: number[];
  from?: string;
  to?: string;
  mine?: boolean;
}

export interface NppListParams extends NppFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface NppListResponse {
  data: NppTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NppSummary {
  stages: Record<NppStage, number>;
  total: number;
  mine: number;
}

export interface NppReference {
  categories: { parent: string[]; middle: string[]; child: string[] };
  trademarks: { id: number; name: string }[];
  units: string[];
  priceBooks: { id: number; name: string }[];
  branches: { id: number; name: string }[];
  costApprovers: { id: number; name: string }[];
  suppliers: { id: number; code: string | null; name: string }[];
  factories: {
    id: number;
    code: string | null;
    name: string;
    supplierId: number | null;
    currency: string | null;
  }[];
}

export type NppPriceTarget = "BASE_PRICE" | number | null;

export interface NppConfig {
  approvers: Record<NppGroup, number[]>;
  priceTargets: Record<NppPriceTargetKey, NppPriceTarget>;
  costBranches: Record<NppCostGroupKey, number[]>;
  /** Nhóm Lark dạng chủ đề nhận tin song song (mỗi phiếu 1 chủ đề). */
  larkChatId: string | null;
  remindersEnabled: boolean;
  defaults: {
    priceTargets: NppPriceTargetKey[];
    costBranches: NppCostGroupKey[];
  };
  updatedAt: string | null;
  updatedByName: string | null;
  members: { id: number; name: string; hasLark: boolean; isActive: boolean }[];
}

export interface NppConfigInput {
  approvers?: Partial<Record<NppGroup, number[]>>;
  priceTargets?: Partial<Record<NppPriceTargetKey, NppPriceTarget>>;
  costBranches?: Partial<Record<NppCostGroupKey, number[]>>;
  larkChatId?: string | null;
  remindersEnabled?: boolean;
}

export interface NppApplyIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface NppApplyPreview {
  ok: boolean;
  alreadyCreated: boolean;
  issues: NppApplyIssue[];
  plan: {
    product: {
      code: string | null;
      name: string;
      parentName: string | null;
      middleName: string | null;
      childName: string | null;
      tradeMarkName: string | null;
      unit: string | null;
      weight: number | null;
      basePrice: number | null;
      conversionValue: number | null;
      misaCode: string | null;
      misaName: string | null;
      misaUnit: string | null;
      imageCount: number;
      documentCount: number;
    };
    costs: {
      group: NppCostGroupKey;
      label: string;
      cost: number | null;
      branches: { id: number; name: string }[];
    }[];
    otherBranchesCost: number | null;
    prices: {
      key: string;
      label: string;
      price: number;
      priceBookId: number | null;
      priceBookName: string;
    }[];
    factory: {
      id: number;
      name: string;
      code: string | null;
      supplierName: string | null;
      role: "primary";
      referencePrice: number | null;
      currency: string;
      exchangeRate: number | null;
      moqValue: number | null;
      moqUnit: "CARTON" | null;
    } | null;
  };
}

/** Body PATCH: chỉ gửi trường đổi; null = xóa giá trị. */
export type NppUpdateInput = Partial<
  Omit<NppTicket, "oemCustomers"> & {
    oemCustomers: { customerId: number }[] | null;
  }
>;
