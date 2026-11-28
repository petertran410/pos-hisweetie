// Thay đổi giá sản phẩm — khớp backend src/price-change.
import type { NppAttachment, NppDelivery } from "@/lib/types/new-product-price";

export type PcStage =
  "PROPOSAL" | "CHIEF_ACCOUNTANT" | "CEO" | "DATA" | "DONE" | "ENDED";
export type PcStatus = "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type PcDecision = "APPROVED" | "REJECTED";
export type PcAction =
  | "EDIT"
  | "SUBMIT"
  | "KTT_DECIDE"
  | "CEO_DECIDE"
  | "APPLY"
  | "SEND_BACK"
  | "END"
  | "COMMENT";
export type PcGroup = "CHIEF_ACCOUNTANT" | "CEO" | "DATA";
export type PcDeliveryStatus = NppDelivery["status"];

export interface PcCostLine {
  branchId: number;
  branchName: string;
  oldCost: number | null;
  newCost: number | null;
}

export interface PcPriceLine {
  /** 0 = Bảng giá chung (giá bán chung của hàng hóa). */
  priceBookId: number;
  priceBookName: string;
  oldPrice: number | null;
  newPrice: number | null;
}

export interface PcItem {
  id: number;
  ticketId: number;
  sort: number;
  productId: number | null;
  productCode: string;
  productName: string;
  costs: PcCostLine[];
  prices: PcPriceLine[];
}

export interface PcNamed {
  id: number;
  name: string;
}

export interface PcTicket {
  id: number;
  code: string;
  stage: PcStage;
  status: PcStatus;
  stageEnteredAt: string;
  hasCost: boolean;
  hasSale: boolean;
  costBranches: PcNamed[];
  priceBooks: PcNamed[];
  kttDecision: PcDecision | null;
  kttByName: string | null;
  kttAt: string | null;
  kttNote: string | null;
  ceoDecision: PcDecision | null;
  ceoByName: string | null;
  ceoAt: string | null;
  ceoNote: string | null;
  appliedAt: string | null;
  appliedByName: string | null;
  note: string | null;
  documents: NppAttachment[] | null;
  doneAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  createdById: number | null;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PcListRow extends PcTicket {
  itemCount: number;
  previewItems: {
    productId: number | null;
    productCode: string;
    productName: string;
  }[];
}

export interface PcEvent {
  id: number;
  ticketId: number;
  type: string;
  fromStage: PcStage | null;
  toStage: PcStage | null;
  content: string | null;
  data: Record<string, unknown> | null;
  actorId: number | null;
  actorName: string | null;
  createdAt: string;
}

export interface PcSummaryCounts {
  productCount: number;
  costCells: number;
  priceCells: number;
  increases: number;
  decreases: number;
}

export interface PcTicketDetail extends PcTicket {
  items: PcItem[];
  summary: PcSummaryCounts;
  path: PcStage[];
  access: {
    actions: PcAction[];
    isStageActor: boolean;
    canEdit: boolean;
    submitBlockReason: string | null;
  };
  events: PcEvent[];
}

export interface PcFilters {
  stages?: string[];
  statuses?: string[];
  types?: string[];
  createdByIds?: number[];
  from?: string;
  to?: string;
  mine?: boolean;
}

export interface PcListParams extends PcFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PcListResponse {
  data: PcListRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PcSummary {
  stages: Record<PcStage, number>;
  total: number;
  mine: number;
}

export interface PcReference {
  branches: PcNamed[];
  /** Có mục id 0 = Bảng giá chung. */
  priceBooks: PcNamed[];
}

export interface PcCurrentValues {
  productId: number;
  code: string;
  name: string;
  unit: string | null;
  isActive: boolean;
  type: number;
  costs: Record<number, number | null>;
  prices: Record<number, number | null>;
}

export interface PcConfig {
  approvers: Record<PcGroup, number[]>;
  /** Nhóm Lark dạng topic (oc_…): mỗi phiếu 1 topic, mỗi bước tag người phụ trách. */
  larkChatId: string | null;
  /** Nhắc việc hằng ngày 17:00 (Kế toán trưởng, CEO, Phòng Dữ Liệu). */
  remindersEnabled: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  members: { id: number; name: string; hasLark: boolean; isActive: boolean }[];
}

export interface PcConfigInput {
  approvers?: Partial<Record<PcGroup, number[]>>;
  /** "" = tắt gửi nhóm. */
  larkChatId?: string;
  remindersEnabled?: boolean;
}

/** Body tạo / sửa phiếu: chỉ gửi giá mới, giá cũ do máy chủ chụp từ POS. */
export interface PcUpsertInput {
  costBranchIds?: number[];
  priceBookIds?: number[];
  items?: {
    productId: number;
    costs: { branchId: number; newCost: number | null }[];
    prices: { priceBookId: number; newPrice: number | null }[];
  }[];
  note?: string | null;
  documents?: NppAttachment[] | null;
  submit?: boolean;
}

export interface PcApplyCell {
  kind: "COST" | "PRICE";
  targetId: number;
  targetName: string;
  oldValue: number | null;
  currentValue: number | null;
  newValue: number;
  changedSinceProposal: boolean;
  createsRow: boolean;
}

export interface PcApplyPreview {
  ok: boolean;
  issues: {
    severity: "error" | "warning";
    message: string;
    productCode?: string;
  }[];
  rows: {
    itemId: number;
    productId: number | null;
    productCode: string;
    productName: string;
    cells: PcApplyCell[];
  }[];
  counts: { products: number; costCells: number; priceCells: number };
}
