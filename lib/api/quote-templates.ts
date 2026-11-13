/**
 * API mẫu báo giá (Cài đặt › Mẫu báo giá). Giai đoạn 1: dữ liệu trong bộ nhớ,
 * mất khi tải lại trang — không gọi backend. Giai đoạn 2 giữ nguyên chữ ký hàm.
 *
 * Quyền (giai đoạn 2): quote_templates:view / create / update cấp cho vai trò
 * "Trưởng Bộ Phận Sale" và "Sale". Không có xoá — chỉ Ngừng sử dụng / Dùng lại.
 */
import type {
  QuoteTemplate,
  QuoteTemplateConfig,
  QuoteTemplatePayload,
} from "@/lib/types/quote";
import { defaultTiers } from "@/lib/quotes/pricing";

const delay = () => new Promise((r) => setTimeout(r, 120));
const clone = <T,>(v: T): T => structuredClone(v);
const SYSTEM = { id: 1, name: "Phòng kinh doanh" };
const MOCK_ME = { id: 2, name: "Sale A" };

const intro = (who: string) =>
  `Lời đầu tiên, Công ty TNHH XNK Hi Sweetie Việt Nam xin trân trọng cảm ơn ${who} đã quan tâm tới sản phẩm của Công ty chúng tôi. Chúng tôi xin trân trọng gửi tới ${who.toLowerCase()} báo giá và chính sách của các sản phẩm LerMao như sau:`;

const CLOSING =
  "Chúng tôi cam kết tiếp tục duy trì chất lượng sản phẩm ổn định, tối ưu giải pháp nguyên liệu và đồng hành cùng Quý Khách hàng trong hoạt động kinh doanh lâu dài.\nKính chúc Quý Khách hàng sức khỏe, kinh doanh thuận lợi và thành công.";

const defs = (g: QuoteTemplate) =>
  defaultTiers(g).map(({ key, label, minQty, maxQty, unit }) => ({ key, label, minQty, maxQty, unit }));

/** 3 mẫu hệ thống — nội dung theo file "Bảng báo giá tổng hợp 01.09.26". */
const store: QuoteTemplateConfig[] = [
  {
    id: 1,
    name: "Khách lẻ",
    group: "retail",
    isDefault: true,
    isActive: true,
    layout: "classic",
    tiers: defs("retail"),
    titlePattern: "BẢNG BÁO GIÁ LẺ {MIEN} LERMAO",
    greeting: "Quý khách hàng",
    intro: intro("Quý khách hàng"),
    note: "",
    closing: CLOSING,
    showMargin: false,
    updatedAt: "2026-09-01T02:00:00.000Z",
    updatedBy: SYSTEM,
  },
  {
    id: 2,
    name: "Khách chuỗi",
    group: "chain",
    isDefault: true,
    isActive: true,
    layout: "classic",
    tiers: defs("chain"),
    titlePattern: "BẢNG BÁO GIÁ CHUỖI {MIEN} LERMAO",
    greeting: "Quý chuỗi",
    intro: intro("Quý chuỗi"),
    note: "",
    closing: CLOSING,
    showMargin: false,
    updatedAt: "2026-09-01T02:00:00.000Z",
    updatedBy: SYSTEM,
  },
  {
    id: 3,
    name: "Đại lý",
    group: "agency",
    isDefault: true,
    isActive: true,
    layout: "classic",
    tiers: defs("agency"),
    titlePattern: "BẢNG BÁO GIÁ ĐẠI LÝ {MIEN} LERMAO",
    greeting: "Quý Đại lý",
    intro: intro("Quý đại lý"),
    note: "",
    closing: CLOSING,
    showMargin: true,
    updatedAt: "2026-09-01T02:00:00.000Z",
    updatedBy: SYSTEM,
  },
];

const find = (id: number) => {
  const t = store.find((x) => x.id === id);
  if (!t) throw new Error("Không tìm thấy mẫu báo giá");
  return t;
};

export const quoteTemplatesApi = {
  async getAll(): Promise<QuoteTemplateConfig[]> {
    await delay();
    return clone(store);
  },

  async create(payload: QuoteTemplatePayload): Promise<QuoteTemplateConfig> {
    await delay();
    const t: QuoteTemplateConfig = {
      ...clone(payload),
      id: Math.max(0, ...store.map((x) => x.id)) + 1,
      // Mẫu đầu tiên của nhóm thành mặc định.
      isDefault: !store.some((x) => x.group === payload.group),
      isActive: true,
      updatedAt: new Date().toISOString(),
      updatedBy: MOCK_ME,
    };
    store.push(t);
    return clone(t);
  },

  async update(id: number, payload: QuoteTemplatePayload): Promise<QuoteTemplateConfig> {
    await delay();
    const t = find(id);
    if (payload.group !== t.group && t.isDefault)
      throw new Error("Mẫu mặc định không đổi nhóm khách được — đặt mẫu khác làm mặc định trước");
    Object.assign(t, clone(payload), { updatedAt: new Date().toISOString(), updatedBy: MOCK_ME });
    return clone(t);
  },

  /** Đặt làm mẫu mặc định của nhóm khách (mẫu chọn sẵn khi tạo báo giá). */
  async setDefault(id: number): Promise<QuoteTemplateConfig> {
    await delay();
    const t = find(id);
    if (!t.isActive) throw new Error("Mẫu đang ngừng sử dụng — dùng lại trước khi đặt mặc định");
    for (const x of store) if (x.group === t.group) x.isDefault = x.id === id;
    return clone(t);
  },

  /** Ngừng sử dụng / dùng lại. Mẫu mặc định không ngừng được. */
  async setActive(id: number, isActive: boolean): Promise<QuoteTemplateConfig> {
    await delay();
    const t = find(id);
    if (!isActive && t.isDefault)
      throw new Error("Không ngừng sử dụng được mẫu mặc định — đặt mẫu khác làm mặc định trước");
    Object.assign(t, { isActive, updatedAt: new Date().toISOString(), updatedBy: MOCK_ME });
    return clone(t);
  },
};
