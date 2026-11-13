/**
 * API báo giá. Giai đoạn 1 chạy hoàn toàn trên dữ liệu mẫu trong bộ nhớ
 * (mất khi tải lại trang) — không gọi backend, không ghi DB.
 * Giai đoạn 2: thay phần thân mỗi hàm bằng apiClient, giữ nguyên chữ ký.
 */
import type {
  Quote,
  QuoteFilters,
  QuoteListItem,
  QuoteListResponse,
  QuotePayload,
  QuoteStatus,
} from "@/lib/types/quote";
import { MOCK_LIBRARY, MOCK_QUOTES } from "./quotes.mock";

const store: Quote[] = [...MOCK_QUOTES, ...MOCK_LIBRARY].map((q) => structuredClone(q));
const delay = () => new Promise((r) => setTimeout(r, 150));
const clone = <T,>(v: T): T => structuredClone(v);

/** Người tạo giả lập cho bản ghi tạo mới ở giai đoạn 1. */
const MOCK_ME = { id: 2, name: "Sale A" };

function nextCode(isLibrary: boolean) {
  const prefix = isLibrary ? "TV" : "BG";
  const max = store
    .filter((q) => q.code.startsWith(prefix))
    .reduce((m, q) => Math.max(m, Number(q.code.slice(2)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(isLibrary ? 4 : 6, "0")}`;
}

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

const toListItem = (q: Quote): QuoteListItem => ({
  ...omit(q, ["items", "intro", "closing", "note"]),
  itemCount: q.items.length,
});

/** Phần sửa được của một báo giá (bỏ các trường backend quản lý). */
export const toPayload = (q: Quote): QuotePayload =>
  omit(q, ["id", "code", "createdBy", "createdAt", "updatedAt", "sentAt"]);

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export const quotesApi = {
  async getAll(filters: QuoteFilters): Promise<QuoteListResponse> {
    await delay();
    const q = filters.search ? norm(filters.search.trim()) : "";
    const rows = store
      .filter((x) => x.isLibrary === (filters.tab === "library"))
      .filter((x) => !filters.status?.length || filters.status.includes(x.status))
      .filter((x) => !filters.template?.length || filters.template.includes(x.template))
      .filter((x) => !filters.createdById?.length || filters.createdById.includes(x.createdBy.id))
      .filter((x) => !filters.region?.length || filters.region.includes(x.region))
      .filter((x) => !filters.category?.length || (x.category != null && filters.category.includes(x.category)))
      .filter((x) => !filters.fromDate || x.createdAt >= filters.fromDate)
      .filter((x) => !filters.toDate || x.createdAt <= filters.toDate)
      .filter(
        (x) =>
          !q ||
          norm(`${x.code} ${x.title} ${x.customer?.name ?? ""} ${x.customer?.code ?? ""}`).includes(q)
      )
      .sort((a, b) => (filters.tab === "library" ? a.id - b.id : b.createdAt.localeCompare(a.createdAt)));
    const page = filters.page ?? 1;
    const size = filters.pageSize ?? 20;
    return {
      data: rows.slice((page - 1) * size, page * size).map(toListItem),
      total: rows.length,
    };
  },

  async getOne(id: number): Promise<Quote> {
    await delay();
    const found = store.find((q) => q.id === id);
    if (!found) throw new Error("Không tìm thấy báo giá");
    return clone(found);
  },

  async create(payload: QuotePayload): Promise<Quote> {
    await delay();
    const now = new Date().toISOString();
    const quote: Quote = {
      ...clone(payload),
      id: Math.max(0, ...store.filter((q) => q.id < 1000).map((q) => q.id)) + 1,
      code: nextCode(payload.isLibrary),
      createdBy: MOCK_ME,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    };
    store.unshift(quote);
    return clone(quote);
  },

  async update(id: number, payload: QuotePayload): Promise<Quote> {
    await delay();
    const i = store.findIndex((q) => q.id === id);
    if (i < 0) throw new Error("Không tìm thấy báo giá");
    store[i] = { ...store[i], ...clone(payload), updatedAt: new Date().toISOString() };
    return clone(store[i]);
  },

  async setStatus(id: number, status: QuoteStatus): Promise<Quote> {
    await delay();
    const q = store.find((x) => x.id === id);
    if (!q) throw new Error("Không tìm thấy báo giá");
    q.status = status;
    if (status === "sent") q.sentAt = new Date().toISOString();
    return clone(q);
  },

  async remove(id: number): Promise<void> {
    await delay();
    const i = store.findIndex((q) => q.id === id && !q.isLibrary);
    if (i < 0) throw new Error("Không tìm thấy báo giá");
    if (store[i].status !== "draft") throw new Error("Chỉ xoá được báo giá Nháp");
    store.splice(i, 1);
  },

  /** Nhân bản (cũng dùng cho "Dùng mẫu này": bản mới là báo giá Nháp, không gắn khách). */
  async duplicate(id: number): Promise<Quote> {
    const src = await quotesApi.getOne(id);
    const rest = toPayload(src);
    const today = new Date().toISOString().slice(0, 10);
    return quotesApi.create({
      ...rest,
      isLibrary: false,
      status: "draft",
      appliedFrom: today,
      sourceLibraryId: src.isLibrary ? src.id : src.sourceLibraryId,
      items: rest.items.map((it, i) => ({ ...it, id: `n${Date.now()}-${i}` })),
    });
  },
};

/** Danh sách mẫu thư viện theo ngành hàng (cho nút "Thêm cả nhóm hàng"). */
export function libraryFor(
  category: NonNullable<Quote["category"]>,
  region: Quote["region"],
  template: Quote["template"]
): Quote | null {
  const lib = store
    .filter((q) => q.isLibrary && q.category === category)
    // Ưu tiên cùng miền, rồi "Toàn quốc"; trong cùng miền ưu tiên cùng mẫu.
    .sort(
      (a, b) =>
        Number(b.region === region) - Number(a.region === region) ||
        Number(b.region === "ALL") - Number(a.region === "ALL") ||
        Number(b.template === template) - Number(a.template === template)
    );
  return lib[0] ? clone(lib[0]) : null;
}
