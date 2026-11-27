import { isDomestic, isManufactured } from "@/lib/new-product-price/constants";
import type {
  NppOemCustomer,
  NppStage,
  NppTicketDetail,
  NppUpdateInput,
} from "@/lib/types/new-product-price";
import { NPP_SECTIONS, type NppFieldDef } from "./fields";

/** Giá trị đang nhập trong modal, theo key trường. */
export type NppDraft = Record<string, unknown>;

const COGS_KEYS = ["cogsHn", "cogsSg", "cogsDt"];

/** Bước kế tiếp khi "Hoàn tất" (Hàng sản xuất bỏ qua CEO). */
export function nextStageOf(t: NppTicketDetail): NppStage | null {
  switch (t.stage) {
    case "PROPOSAL":
      return "PURCHASING";
    case "PURCHASING":
      return "ACCOUNTING";
    case "ACCOUNTING":
      return "SALES";
    case "SALES":
      return isManufactured(t.parentName) ? "DATA" : "CEO";
    default:
      return null;
  }
}

/** ISO → YYYY-MM-DD theo giờ máy (DatePickerInput). */
export function toDateInput(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isBlank = (v: unknown) =>
  v === null ||
  v === undefined ||
  (typeof v === "number" && Number.isNaN(v)) ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

/** Giá trị ban đầu của các trường được sửa. */
export function initDraft(
  ticket: NppTicketDetail,
  fields: NppFieldDef[],
): NppDraft {
  const raw = ticket as unknown as Record<string, unknown>;
  const draft: NppDraft = {};
  for (const f of fields) {
    if (f.type === "computed") continue;
    draft[f.key] =
      f.type === "customers" ? (ticket.oemCustomers ?? []) : raw[f.key];
  }
  return draft;
}

/** Chỉ gửi trường đã đổi; hàng nội địa không gửi tỉ giá (backend tự đặt = 1). */
export function buildPatch(
  ticket: NppTicketDetail,
  fields: NppFieldDef[],
  draft: NppDraft,
): NppUpdateInput {
  const raw = ticket as unknown as Record<string, unknown>;
  const origin = "middleName" in draft ? draft.middleName : raw.middleName;
  const domestic = isDomestic(origin as string | null);
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "computed" || !(f.key in draft)) continue;
    const next = draft[f.key];
    if (f.key === "exchangeRate" && domestic) continue;
    if (f.type === "customers") {
      const ids = (list: NppOemCustomer[] | null | undefined) =>
        (list ?? []).map((c) => c.customerId).join(",");
      const list = (next as NppOemCustomer[]) ?? [];
      if (ids(list) !== ids(ticket.oemCustomers)) {
        body.oemCustomers = list.map((c) => ({ customerId: c.customerId }));
      }
      continue;
    }
    const norm = (v: unknown) =>
      f.type === "date"
        ? toDateInput(v) || null
        : isBlank(v)
          ? null
          : typeof v === "string"
            ? v.trim()
            : v;
    if (norm(next) !== norm(raw[f.key])) body[f.key] = norm(next);
  }
  return body as NppUpdateInput;
}

/** Trường bắt buộc của bước còn trống (theo giá trị đang nhập). */
export function missingFields(
  stage: NppStage,
  get: (key: string) => unknown,
): string[] {
  const sec = NPP_SECTIONS.find((s) => s.stage === stage);
  if (!sec) return [];
  const domestic = isDomestic(get("middleName") as string | null);
  return sec.fields
    .filter((f) => f.required)
    .filter((f) => !(f.key === "exchangeRate" && domestic))
    .filter((f) => isBlank(get(f.key)))
    .map((f) => f.label);
}

/**
 * Chặn chuyển bước vì Kế toán trưởng (giống completeBlockReason ở backend).
 * Sửa giá vốn sau khi KTT đã quyết định → backend bỏ trạng thái gửi KTT.
 */
export function kttBlock(
  ticket: NppTicketDetail,
  patch: NppUpdateInput = {},
): string | null {
  if (ticket.stage !== "ACCOUNTING" || !ticket.sendToChiefAccountant)
    return null;
  const cogsChanged = COGS_KEYS.some((k) => k in patch);
  if (ticket.chiefAccountantDecision === "APPROVED") return null;
  if (ticket.chiefAccountantDecision === "REJECTED") {
    return cogsChanged
      ? null
      : "Kế toán trưởng đã từ chối giá vốn — sửa lại và gửi duyệt lại";
  }
  return "Đang chờ Kế toán trưởng duyệt giá vốn";
}
