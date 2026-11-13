"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Save, UserPlus, X } from "lucide-react";
import { ProductSearchDropdown } from "@/components/pos/ProductSearchDropdown";
import { CustomerSearch } from "@/components/pos/CustomerSearch";
import { PriceBookDropdown } from "@/components/pos/PriceBookDropdown";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { usePriceBook } from "@/lib/hooks/usePriceBooks";
import { useQuote, useSaveQuote, useSetQuoteStatus } from "@/lib/hooks/useQuotes";
import { libraryFor, toPayload } from "@/lib/api/quotes";
import { applyTiers, fillFromPriceBook, renderTitle, tierColumns, tiersFrom } from "@/lib/quotes/pricing";
import { useQuoteTemplates } from "@/lib/hooks/useQuoteTemplates";
import type {
  Quote,
  QuoteCategory,
  QuoteCustomerRef,
  QuoteItem,
  QuotePayload,
  QuoteRegion,
  QuoteTemplateConfig,
} from "@/lib/types/quote";
import {
  QUOTE_CATEGORY_LABEL,
  QUOTE_REGION_LABEL,
  QUOTE_STATUS_COLOR,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_NEXT,
} from "@/lib/types/quote";
import { QuoteItemsList } from "./QuoteItemsList";
import { QuotePreviewModal } from "./QuotePreviewModal";

/** Khách / sản phẩm theo dạng các component POS (CustomerSearch, ProductSearchDropdown) trả về. */
type PosCustomer = { id: number; code?: string | null; name: string; contactNumber?: string | null };
type PosProduct = {
  id: number;
  code: string;
  name: string;
  unit?: string | null;
  basePrice?: number | string | null;
  images?: { image: string; isPrimary?: boolean }[];
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Báo giá trống; nội dung (tiêu đề, lời chào, khung giá…) điền từ mẫu mặc định khi tải xong mẫu. */
function emptyDraft(): QuotePayload {
  return {
    isLibrary: false,
    status: "draft",
    templateId: null,
    layout: "classic",
    region: "HN",
    category: null,
    customer: null,
    priceBook: null,
    title: "",
    greeting: "",
    intro: "",
    closing: "",
    note: "",
    showMargin: false,
    appliedFrom: today(),
    validUntil: plusDays(today(), 30),
    items: [],
    sourceLibraryId: null,
  };
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border p-0.5 bg-gray-50">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={`flex-1 px-2 py-1 text-sm rounded-md whitespace-nowrap ${
            value === k ? "bg-white shadow-sm font-medium text-brand" : "text-gray-600 hover:text-gray-900"
          }`}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-600">{label}</div>
      {children}
    </div>
  );
}

export function QuoteForm({ quoteId }: { quoteId?: number }) {
  const router = useRouter();
  const { data: existing, isLoading } = useQuote(quoteId ?? null);
  const save = useSaveQuote();
  const setStatus = useSetQuoteStatus();
  const [draft, setDraft] = useState<QuotePayload>(emptyDraft);
  const [loaded, setLoaded] = useState(!quoteId);
  const [autoTitle, setAutoTitle] = useState(!quoteId);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [preview, setPreview] = useState(false);
  const { data: templates = [], isLoading: templatesLoading } = useQuoteTemplates();
  const tpl = templates.find((t) => t.id === draft.templateId) ?? null;
  /** Mẫu chọn được (Cài đặt › Mẫu báo giá): đang sử dụng, cộng mẫu báo giá này đang dùng (kể cả đã ngừng). */
  const usable = templates.filter((t) => t.isActive || t.id === draft.templateId);
  const defaultTemplate =
    templates.find((t) => t.isDefault && t.isActive) ?? templates.find((t) => t.isActive) ?? null;

  // Nạp báo giá đang sửa một lần.
  useEffect(() => {
    if (!existing || loaded) return;
    setDraft(toPayload(existing));
    // Khách nhập tay (id null) không đưa vào ô tìm khách POS.
    setCustomer(existing.customer?.id != null ? (existing.customer as PosCustomer) : null);
    setLoaded(true);
  }, [existing, loaded]);

  const patch = (p: Partial<QuotePayload>) => setDraft((d) => ({ ...d, ...p }));

  // ── Bảng giá: tự điền lại giá các khung chưa sửa tay ─────────────────
  const priceBookId = draft.priceBook?.id ?? null;
  const { data: priceBook } = usePriceBook(priceBookId);
  const priceMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of priceBook?.priceBookDetails ?? []) if (d.isActive) m.set(d.productId, Number(d.price));
    return m;
  }, [priceBook]);
  const ready = !priceBookId || !!priceBook;
  const priceFor = (it: Pick<QuoteItem, "productId" | "basePrice">) =>
    it.productId == null ? null : (priceMap.get(it.productId) ?? it.basePrice);

  useEffect(() => {
    if (!loaded || !ready) return;
    setDraft((d) => ({ ...d, items: d.items.map((it) => fillFromPriceBook(it, priceFor(it) ?? it.priceBookPrice)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMap, priceBookId, ready, loaded]);

  // ── Áp mẫu báo giá (Cài đặt › Mẫu báo giá): khung giá + nội dung in ──
  const applyConfig = (cfg: QuoteTemplateConfig) =>
    setDraft((d) => {
      const prev = templates.find((t) => t.id === d.templateId);
      return {
        ...d,
        templateId: cfg.id,
        greeting: cfg.greeting,
        intro: cfg.intro,
        closing: cfg.closing,
        // Giữ chính sách Sale đã tự viết; chỉ thay khi trống hoặc còn là chữ của mẫu cũ.
        note: d.note.trim() && d.note !== prev?.note ? d.note : cfg.note,
        showMargin: cfg.showMargin,
        title: autoTitle ? renderTitle(cfg.titlePattern, d.region) : d.title,
        items: d.items.map((it) => applyTiers(it, cfg.tiers)),
      };
    });

  // Báo giá mới: áp mẫu mặc định khi tải xong danh sách mẫu.
  useEffect(() => {
    if (quoteId || draft.templateId != null || !templates.length) return;
    if (defaultTemplate) applyConfig(defaultTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, quoteId, draft.templateId]);

  const changeRegion = (region: QuoteRegion) =>
    setDraft((d) => ({
      ...d,
      region,
      title: autoTitle && tpl ? renderTitle(tpl.titlePattern, region) : d.title,
    }));
  /** Khung giá cho dòng mới: theo mẫu đang chọn. */
  const newTiers = () => tiersFrom(tpl?.tiers ?? []);

  // ── Thêm sản phẩm ────────────────────────────────────────────────
  const addProduct = (product: PosProduct) => {
    if (draft.items.some((it) => it.productId === product.id)) {
      toast.info("Sản phẩm đã có trong báo giá");
      return;
    }
    const spec = String(product.name).match(/\(([^)]*\/\s*thùng[^)]*)\)/i)?.[1] ?? "";
    const base = Number(product.basePrice) || null;
    const item: QuoteItem = {
      id: `n${Date.now()}`,
      productId: product.id,
      productCode: product.code,
      // Tên ngắn như file báo giá: bỏ "Gấu Lermao - " và "(12 Túi/Thùng)".
      productName: product.name
        .replace(/^gấu\s+lermao\s*[-–]\s*/i, "")
        .replace(/\s*\([^)]*\/\s*thùng[^)]*\)\s*$/i, "")
        .trim(),
      spec,
      unit: String(product.unit || "túi").toLowerCase(),
      imageUrl: product.images?.find((i) => i.isPrimary)?.image ?? product.images?.[0]?.image ?? null,
      basePrice: base,
      priceBookPrice: null,
      tiers: newTiers(),
    };
    patch({ items: [...draft.items, fillFromPriceBook(item, priceFor(item))] });
  };

  const addGroup = async (category: QuoteCategory) => {
    const lib = await libraryFor(category, draft.region, (tpl?.tiers ?? []).map((t) => t.key)).catch(() => null);
    if (!lib) return toast.error(`Thư viện chưa có mẫu ${QUOTE_CATEGORY_LABEL[category]}`);
    const have = new Set(draft.items.map((it) => it.productId ?? it.productName));
    const added = lib.items
      .filter((it) => !have.has(it.productId ?? it.productName))
      .map((it, i) => {
        const base = { ...it, id: `g${Date.now()}-${i}`, priceBookPrice: priceFor(it) ?? it.priceBookPrice };
        // Khung theo mẫu đang chọn: khung trùng khoá giữ giá trong file báo giá (sửa tay), còn lại điền theo bảng giá.
        return tpl ? applyTiers(base, tpl.tiers) : base;
      });
    setDraft((d) => ({ ...d, items: [...d.items, ...added] }));
    toast.success(`Đã thêm ${added.length} sản phẩm ${QUOTE_CATEGORY_LABEL[category]} (${lib.code})`);
  };

  // ── Lưu ────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!draft.items.length) return toast.error("Báo giá chưa có sản phẩm");
    if (draft.customer?.id === null && !draft.customer.name.trim())
      return toast.error("Nhập tên khách hàng (khách chưa có trong POS)");
    if (draft.validUntil && draft.validUntil < draft.appliedFrom)
      return toast.error("Ngày hiệu lực phải sau ngày áp dụng");
    const saved = await save.mutateAsync({ id: quoteId, payload: draft });
    toast.success(quoteId ? `Đã lưu ${saved.code}` : `Đã tạo báo giá ${saved.code}`);
    if (!quoteId) router.replace(`/khach-hang/bao-gia/${saved.id}`);
  };

  if ((quoteId && (isLoading || !loaded)) || templatesLoading || (!quoteId && draft.templateId == null && templates.length)) {
    return <div className="h-full flex items-center justify-center text-gray-400">Đang tải báo giá…</div>;
  }

  const status = draft.status;
  // Đã chốt (chấp nhận / từ chối / hết hạn): không sửa nội dung, chỉ nhân bản.
  const locked = !!existing && ["accepted", "rejected", "expired"].includes(existing.status);
  // Khách nhập tay: customer có id null.
  const guest = draft.customer?.id === null ? draft.customer : null;
  const setGuest = (p: Partial<QuoteCustomerRef>) =>
    setDraft((d) => (d.customer ? { ...d, customer: { ...d.customer, ...p } } : d));
  const selectPriceBook = (id: number | null, name: string | null) =>
    patch({ priceBook: id && id > 0 ? { id, name: name ?? "" } : null });
  const cartItems = draft.items.filter((it) => it.productId).map((it) => ({ product: { id: it.productId } }));
  const priceBookName = draft.priceBook?.name ?? "Bảng giá chung";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header: đóng + tìm sản phẩm (như tạo đơn) */}
      <div className="bg-white border-b px-3 lg:px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push("/khach-hang/bao-gia")}
          aria-label="Đóng"
          className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base lg:text-lg font-semibold shrink-0 whitespace-nowrap">
          {existing ? `Báo giá ${existing.code}` : "Tạo báo giá"}
        </h2>
        {existing && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUOTE_STATUS_COLOR[status]}`}>
            {QUOTE_STATUS_LABEL[status]}
          </span>
        )}
        <div className="flex-1 max-w-xl">
          <ProductSearchDropdown onAddProduct={addProduct} selectedPriceBookId={priceBookId} />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex flex-col w-full lg:w-[64%] min-h-0 flex-1 lg:flex-none">
          <QuoteItemsList
            items={draft.items}
            onChange={(items) => patch({ items })}
            onAddGroup={addGroup}
            priceBookName={priceBookName}
          />
        </div>

        {/* Cột phải: khách, bảng giá, mẫu, thời hạn, nội dung in */}
        <div className="w-full lg:w-[36%] bg-white border-l flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Row label="Khách hàng · Bảng giá nguồn">
              {guest ? (
                <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Khách chưa có trong POS</span>
                    <button
                      type="button"
                      onClick={() => patch({ customer: null })}
                      className="ml-auto text-xs text-brand hover:underline">
                      Chọn khách trong POS
                    </button>
                  </div>
                  <input
                    value={guest.name}
                    onChange={(e) => setGuest({ name: e.target.value })}
                    placeholder="Tên khách / đơn vị *"
                    aria-label="Tên khách hàng"
                    className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={guest.contactNumber ?? ""}
                      onChange={(e) => setGuest({ contactNumber: e.target.value })}
                      placeholder="Số điện thoại"
                      aria-label="Số điện thoại khách"
                      inputMode="tel"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
                    />
                    <PriceBookDropdown
                      selectedPriceBookId={priceBookId}
                      selectedPriceBookName={draft.priceBook?.name ?? null}
                      onSelectPriceBook={selectPriceBook}
                      cartItems={cartItems}
                    />
                  </div>
                  <input
                    value={guest.address ?? ""}
                    onChange={(e) => setGuest({ address: e.target.value })}
                    placeholder="Địa chỉ"
                    aria-label="Địa chỉ khách"
                    className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Chỉ in lên báo giá, không tạo khách mới trong POS.
                  </p>
                </div>
              ) : (
                <>
                  <CustomerSearch
                    selectedCustomer={customer}
                    onSelectCustomer={(c: PosCustomer | null) => {
                      setCustomer(c);
                      patch({
                        customer: c
                          ? { id: c.id, code: c.code ?? null, name: c.name, contactNumber: c.contactNumber }
                          : null,
                      });
                    }}
                    selectedPriceBookId={priceBookId}
                    selectedPriceBookName={draft.priceBook?.name ?? null}
                    onSelectPriceBook={selectPriceBook}
                    cartItems={cartItems}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] text-gray-500">
                      Để trống khách = báo giá chung. Đổi bảng giá → giá chưa sửa tay tự điền lại.
                    </p>
                    {!customer && (
                      <button
                        type="button"
                        onClick={() => patch({ customer: { id: null, code: null, name: "", contactNumber: "", address: "" } })}
                        className="shrink-0 text-xs text-brand hover:underline flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Khách chưa có trong POS
                      </button>
                    )}
                  </div>
                </>
              )}
            </Row>

            <Row label="Mẫu báo giá">
              <select
                value={draft.templateId ?? ""}
                aria-label="Mẫu báo giá"
                onChange={(e) => {
                  const cfg = templates.find((t) => t.id === Number(e.target.value));
                  if (cfg) applyConfig(cfg);
                }}
                className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white">
                {draft.templateId == null && <option value="">(Không theo mẫu)</option>}
                {usable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isActive ? "" : " (Ngừng sử dụng)"}
                  </option>
                ))}
              </select>
              <a
                href="/cai-dat/mau-bao-gia"
                target="_blank"
                rel="noopener"
                className="inline-block text-xs text-brand hover:underline">
                Quản lý mẫu báo giá
              </a>
            </Row>

            <Row label="Miền">
              <Segmented value={draft.region} options={QUOTE_REGION_LABEL} onChange={changeRegion} />
            </Row>

            <div className="grid grid-cols-2 gap-3">
              <Row label="Ngày áp dụng">
                <DatePickerInput value={draft.appliedFrom} onChange={(v) => patch({ appliedFrom: v || today() })} />
              </Row>
              <Row label="Hiệu lực đến">
                <DatePickerInput
                  value={draft.validUntil ?? ""}
                  onChange={(v) => patch({ validUntil: v || null })}
                  placeholder="Không thời hạn"
                  minDate={draft.appliedFrom}
                />
              </Row>
            </div>

            <Row label="Tiêu đề">
              <input
                value={draft.title}
                onChange={(e) => {
                  setAutoTitle(false);
                  patch({ title: e.target.value });
                }}
                className="w-full border rounded-lg px-3 py-1.5 text-sm font-medium"
              />
            </Row>
            <Row label="Kính gửi">
              <input
                value={draft.greeting}
                onChange={(e) => patch({ greeting: e.target.value })}
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
              />
            </Row>
            <Row label="Lời mở đầu">
              <textarea
                value={draft.intro}
                onChange={(e) => patch({ intro: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
              />
            </Row>
            <Row label="Chính sách / ghi chú (in dưới bảng giá)">
              <textarea
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                rows={3}
                placeholder="VD: Miễn phí giao hàng nội thành cho đơn từ 10 thùng…"
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
              />
            </Row>
            <Row label="Lời kết">
              <textarea
                value={draft.closing}
                onChange={(e) => patch({ closing: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-1.5 text-sm"
              />
            </Row>
            {tierColumns(draft.items).length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.showMargin}
                  onChange={(e) => patch({ showMargin: e.target.checked })}
                />
                In cột “Lợi nhuận” của đại lý (như sheet Excel đại lý)
              </label>
            )}

            {existing && QUOTE_STATUS_NEXT[status].length > 0 && (
              <Row label="Cập nhật trạng thái">
                <div className="flex flex-wrap gap-2">
                  {QUOTE_STATUS_NEXT[status].map((s) => (
                    <button
                      key={s}
                      onClick={async () => {
                        await setStatus.mutateAsync({ id: existing.id, status: s });
                        patch({ status: s });
                        toast.success(`Đã chuyển sang “${QUOTE_STATUS_LABEL[s]}”`);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium border ${QUOTE_STATUS_COLOR[s]}`}>
                      → {QUOTE_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </Row>
            )}
          </div>

          <div className="border-t p-3 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPreview(true)}
              disabled={!draft.items.length}
              className="flex-1 px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Eye className="w-4 h-4" /> Xem trước
            </button>
            <button
              onClick={submit}
              disabled={save.isPending || locked}
              title={locked ? "Báo giá đã chốt — nhân bản ở danh sách để tạo bản mới" : undefined}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-dark flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Save className="w-4 h-4" /> {save.isPending ? "Đang lưu…" : quoteId ? "Lưu" : "Tạo báo giá"}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <QuotePreviewModal
          quote={{ ...draft, id: existing?.id, code: existing?.code } as Quote}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
