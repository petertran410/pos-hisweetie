"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, GripVertical, Plus, Search, Trash2, Upload } from "lucide-react";
import { publicPriceApi } from "@/lib/api/public-price";
import { productsApi } from "@/lib/api/products";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { usePermission } from "@/lib/hooks/usePermissions";
import { confirmAction } from "@/lib/chat/confirm";
import {
  PRICE_GROUP_ICON_LABEL,
  PRICE_GROUP_MAX,
  PRICE_TAG_LABEL,
  PUBLIC_PRICE_URL,
  REGION_PARAM,
  type PriceCatalogEntry,
  type PriceGroupConfig,
  type PriceGroupIcon,
  type PriceGroupKey,
  type PriceItemConfig,
  type PricePageConfig,
  type PriceRegionKey,
  type PriceSpecInfo,
  type PriceTag,
} from "@/lib/public-price/types";
import { formatVnd, guessGroup, isHttpsUrl, knownBrandLabel } from "@/lib/public-price/utils";
import { PriceListView } from "./PriceListView";

const KEY = ["public-price-page"];
const GROUP_DOT: Record<PriceGroupIcon, string> = { tea: "#1D8A8A", jam: "#7B4F2E", top: "#4A4A4A", froz: "#0090C0", pow: "#A8681A" };
const GROUP_ICONS = Object.keys(PRICE_GROUP_ICON_LABEL) as PriceGroupIcon[];

/** Sản phẩm vừa thêm chưa có giá / thông số cho tới khi bản xem trước trả về */
type CatalogMap = Record<
  number,
  Omit<PriceCatalogEntry, "price" | "images" | "auto"> & Partial<Pick<PriceCatalogEntry, "price" | "images" | "auto">>
>;
type SpecKey = keyof PriceSpecInfo;
const SPEC_FIELDS: { key: SpecKey; label: string; max: number }[] = [
  { key: "size", label: "Khối lượng", max: 30 },
  { key: "spec", label: "Quy cách", max: 60 },
  { key: "unit", label: "Đơn vị tính", max: 20 },
];

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="w-11 h-9 flex items-center justify-center disabled:opacity-40">
      <span className={`relative block w-10 h-[22px] rounded-full transition-colors ${on ? "bg-brand" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-[left] ${on ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Tab "Bảng giá public" (Cài đặt › Mẫu báo giá): cấu hình price.hisweetievietnam.com, xem trước và xuất bản. */
export function PublicPriceSettings() {
  const qc = useQueryClient();
  const canEdit = usePermission("quote_templates", "update");
  const { data: admin, isLoading } = useQuery({ queryKey: KEY, queryFn: publicPriceApi.get });
  const { data: books } = usePriceBooks({ limit: 200, isActive: true });

  const [config, setConfig] = useState<PricePageConfig | null>(null);
  const [savedJson, setSavedJson] = useState("");
  /** Sản phẩm vừa thêm, trước khi bản xem trước trả thông tin về */
  const [added, setAdded] = useState<CatalogMap>({});
  const [previewRegion, setPreviewRegion] = useState<PriceRegionKey>("S");
  /** Nhóm vừa thêm: đặt con trỏ vào ô tên */
  const [focusGroup, setFocusGroup] = useState<PriceGroupKey | null>(null);

  // Nạp cấu hình từ server (lần đầu, sau khi lưu / xuất bản / hoàn tác).
  const [loaded, setLoaded] = useState<typeof admin>(undefined);
  if (admin && admin !== loaded) {
    setLoaded(admin);
    setConfig(admin.config);
    setSavedJson(JSON.stringify(admin.config));
  }

  const json = config ? JSON.stringify(config) : "";
  const localDirty = !!config && json !== savedJson;

  // Xem trước theo cấu hình đang sửa (chờ 400ms sau thay đổi cuối).
  const [previewJson, setPreviewJson] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setPreviewJson(json), 400);
    return () => clearTimeout(t);
  }, [json]);
  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: [...KEY, "preview", previewJson],
    queryFn: () => publicPriceApi.preview(JSON.parse(previewJson)),
    enabled: !!previewJson,
    placeholderData: (prev) => prev,
  });
  const catalog = useMemo<CatalogMap>(
    () => ({ ...added, ...Object.fromEntries((preview?.catalog ?? []).map((e) => [e.id, e])) }),
    [added, preview]
  );

  const onError = (e: Error) => toast.error(e.message || "Có lỗi xảy ra");
  const after = (msg: string) => (res: Awaited<ReturnType<typeof publicPriceApi.get>>) => {
    qc.setQueryData(KEY, res);
    toast.success(msg);
  };
  const save = useMutation({ mutationFn: (c: PricePageConfig) => publicPriceApi.save(c), onSuccess: after("Đã lưu nháp"), onError });
  const publish = useMutation({
    mutationFn: async (c: PricePageConfig) => {
      if (JSON.stringify(c) !== savedJson) await publicPriceApi.save(c);
      return publicPriceApi.publish();
    },
    onSuccess: after("Đã xuất bản bảng giá public"),
    onError,
  });
  const discard = useMutation({ mutationFn: publicPriceApi.discard, onSuccess: after("Đã hoàn tác về bản đang chạy"), onError });

  if (isLoading || !config || !admin) return <div className="p-6 text-sm text-gray-500">Đang tải cấu hình bảng giá…</div>;

  const set = (patch: Partial<PricePageConfig>) => setConfig((c) => (c ? { ...c, ...patch } : c));
  const setRegion = (key: PriceRegionKey, patch: Partial<PricePageConfig["regions"][number]>) =>
    set({ regions: config.regions.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const patchGroup = (key: PriceGroupKey, patch: Partial<PriceGroupConfig>) =>
    set({ groups: config.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) });
  const addGroup = () => {
    const key = `g${Date.now().toString(36)}`;
    set({ groups: [...config.groups, { key, name: "Nhóm mới", icon: "top", visible: true }] });
    setFocusGroup(key);
  };
  /** Xoá nhóm: sản phẩm trong nhóm chuyển sang nhóm đầu tiên còn lại. */
  const removeGroup = async (g: PriceGroupConfig) => {
    const target = config.groups.find((x) => x.key !== g.key);
    if (!target) return;
    const n = config.items.filter((it) => it.group === g.key).length;
    if (n && !(await confirmAction(`Xoá nhóm “${g.name}”? ${n} sản phẩm trong nhóm sẽ chuyển sang nhóm “${target.name}”.`, { danger: true, confirmText: "Xoá nhóm" }))) return;
    setConfig((c) =>
      c ? { ...c, groups: c.groups.filter((x) => x.key !== g.key), items: c.items.map((it) => (it.group === g.key ? { ...it, group: target.key } : it)) } : c
    );
  };
  const setItem = (productId: number, patch: Partial<PriceItemConfig>) =>
    set({ items: config.items.map((it) => (it.productId === productId ? { ...it, ...patch } : it)) });

  const dirty = localDirty || admin.dirty;
  const pendingPublish = publish.isPending || save.isPending || discard.isPending;
  const zaloInvalid = !!config.zaloUrl.trim() && !isHttpsUrl(config.zaloUrl);
  const shown = preview?.data.products.length ?? 0;

  const doPublish = async () => {
    if (!(await confirmAction(`Xuất bản ${shown} sản phẩm lên ${PUBLIC_PRICE_URL.replace(/^https?:\/\//, "")}? Giá được chốt theo bảng giá nguồn ngay lúc này.`, { confirmText: "Xuất bản" }))) return;
    publish.mutate(config);
  };
  const doDiscard = async () => {
    if (!(await confirmAction("Bỏ mọi thay đổi chưa xuất bản và quay về bản đang chạy?", { danger: true, confirmText: "Hoàn tác" }))) return;
    discard.mutate();
  };

  const addProduct = (p: { id: number; code: string; name: string; tradeMarkId?: number | null; tradeMark?: { id: number; name: string } | null; images?: { id?: number; image: string; isPrimary?: boolean }[]; isActive?: boolean }) => {
    if (config.items.some((it) => it.productId === p.id)) {
      toast.info("Sản phẩm đã có trong bảng giá");
      return;
    }
    const tmId = p.tradeMark?.id ?? p.tradeMarkId ?? null;
    setAdded((c) => ({
      ...c,
      [p.id]: {
        id: p.id,
        code: p.code,
        fullName: p.name,
        image: p.images?.find((i) => i.isPrimary)?.image ?? p.images?.[0]?.image ?? null,
        isActive: p.isActive ?? true,
        tradeMarkId: tmId,
        tradeMarkName: p.tradeMark?.name ?? null,
        images: (p.images ?? [])
          .filter((i): i is { id: number; image: string; isPrimary?: boolean } => i.id != null)
          .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary) || a.id - b.id)
          .map(({ id, image }) => ({ id, image })),
      },
    }));
    const brands =
      tmId != null && !config.brands.some((b) => b.tradeMarkId === tmId)
        ? [...config.brands, { tradeMarkId: tmId, label: knownBrandLabel(p.tradeMark?.name ?? ""), visible: true }]
        : config.brands;
    // Gợi ý theo tên: nhóm mặc định cùng mã → nhóm cùng kiểu biểu tượng → nhóm đầu
    const icon = guessGroup(p.name);
    const group = (config.groups.find((g) => g.key === icon) ?? config.groups.find((g) => g.icon === icon) ?? config.groups[0]).key;
    set({
      brands,
      items: [...config.items, { productId: p.id, group, visible: true, tag: null, hidePrice: [], name: "", desc: "", imageId: null, brandId: null, size: "", spec: "", unit: "" }],
    });
  };

  // Thương hiệu hiển thị: chọn riêng (nếu còn trong danh sách) hoặc thương hiệu của sản phẩm — giống backend
  const brandOfItem = (it: PriceItemConfig) =>
    it.brandId != null && config.brands.some((b) => b.tradeMarkId === it.brandId) ? it.brandId : (catalog[it.productId]?.tradeMarkId ?? null);
  const usedBrandIds = new Set(config.items.map(brandOfItem).filter((x): x is number => x != null));
  const brandRows = config.brands.filter((b) => usedBrandIds.has(b.tradeMarkId));
  const shownCount = (g: PriceGroupKey) => config.items.filter((it) => it.group === g && it.visible).length;

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Trạng thái xuất bản */}
      <section className={`bg-white border rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 ${dirty ? "border-amber-400" : ""}`}>
        <div className="flex items-start gap-3 flex-1 min-w-[280px]">
          <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${dirty ? "bg-amber-100 text-amber-800" : "bg-brand-soft text-brand-deep"}`}>
            {dirty ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </span>
          <div className="text-sm">
            <div className="font-semibold text-[15px]">
              {!admin.hasPublished ? "Chưa xuất bản lần nào" : dirty ? "Có thay đổi chưa xuất bản" : "Trang public đang khớp với cấu hình"}
            </div>
            <div className="text-gray-600">
              {admin.publishedAt
                ? `Xuất bản gần nhất: ${new Date(admin.publishedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })} · ${admin.publishedByName ?? ""}`
                : "Khách chưa xem được trang price.hisweetievietnam.com"}
              {localDirty && " · Đang sửa, chưa lưu nháp"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {admin.hasPublished && admin.dirty && !localDirty && canEdit && (
            <button type="button" onClick={doDiscard} disabled={pendingPublish} className="h-9 px-3 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              Hoàn tác
            </button>
          )}
          <a
            href={`${PUBLIC_PRICE_URL}/?region=${REGION_PARAM[previewRegion]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1.5">
            Mở trang public <ExternalLink className="w-4 h-4" />
          </a>
          {canEdit && (
            <>
              <button type="button" onClick={() => save.mutate(config)} disabled={!localDirty || pendingPublish || zaloInvalid} className="h-9 px-3 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                Lưu nháp
              </button>
              <button
                type="button"
                onClick={doPublish}
                disabled={!dirty || pendingPublish || zaloInvalid}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-brand text-brand-dark hover:bg-brand-bright flex items-center gap-1.5 disabled:opacity-50">
                <Upload className="w-4 h-4" /> {publish.isPending ? "Đang xuất bản…" : "Xuất bản"}
              </button>
            </>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-[999_1_640px] min-w-0 flex flex-col gap-4">
          {/* Khu vực */}
          <Card title="Khu vực & bảng giá nguồn" right={<span className="text-xs text-gray-600">Giá chốt theo bảng giá nguồn lúc bấm Xuất bản</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-gray-50 text-xs text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Khu vực</th>
                    <th className="px-2 py-2 font-medium">Tên bảng giá hiện cho khách</th>
                    <th className="px-2 py-2 font-medium">Bảng giá nguồn</th>
                    <th className="px-2 py-2 font-medium">Hotline</th>
                    <th className="px-4 py-2 font-medium text-center">Hiển thị</th>
                  </tr>
                </thead>
                <tbody>
                  {config.regions.map((r) => (
                    <tr key={r.key} className="border-t">
                      <td className="px-4 py-2 font-semibold whitespace-nowrap">
                        {r.name}
                        <div className="text-xs font-normal text-gray-600">?region={REGION_PARAM[r.key]}</div>
                      </td>
                      <td className="px-2 py-2">
                        <input aria-label={`Tên bảng giá ${r.name}`} value={r.listName} disabled={!canEdit} onChange={(e) => setRegion(r.key, { listName: e.target.value })} className="w-full h-9 border rounded-md px-2" />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          aria-label={`Bảng giá nguồn ${r.name}`}
                          value={r.priceBookId ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => setRegion(r.key, { priceBookId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full h-9 border rounded-md px-2 bg-white">
                          <option value="">Bảng giá chung (giá bán gốc)</option>
                          {books?.data.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input aria-label={`Hotline ${r.name}`} value={r.hotline} disabled={!canEdit} onChange={(e) => setRegion(r.key, { hotline: e.target.value })} placeholder="VD: 0973 123 230" className="w-full h-9 border rounded-md px-2" />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Switch on={r.enabled} label={`Hiển thị ${r.name}`} disabled={!canEdit} onChange={(v) => setRegion(r.key, { enabled: v })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t text-sm">
              <label htmlFor="ppc-zalo" className="font-medium w-40">Link Zalo OA (chung)</label>
              <input id="ppc-zalo" value={config.zaloUrl} disabled={!canEdit} onChange={(e) => set({ zaloUrl: e.target.value })} placeholder="https://zalo.me/…" aria-invalid={zaloInvalid} aria-describedby={zaloInvalid ? "ppc-zalo-err" : undefined} className={`flex-1 min-w-[220px] h-9 border rounded-md px-2 ${zaloInvalid ? "border-red-500" : ""}`} />
              {zaloInvalid && (
                <p id="ppc-zalo-err" className="w-full text-xs text-red-600">
                  Link phải bắt đầu bằng https:// (VD: https://zalo.me/…). Sửa link trước khi lưu nháp hoặc xuất bản.
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-wrap gap-4">
            {/* Banner */}
            <div className="flex-[2_1_420px]">
              <Card title="Banner & ngày hiệu lực" right={<Switch on={config.banner.enabled} label="Hiện banner" disabled={!canEdit} onChange={(v) => set({ banner: { ...config.banner, enabled: v } })} />}>
                <div className="p-4 grid gap-3 text-sm">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1 flex-[1_1_140px]">
                      <label htmlFor="ppc-bn-tag" className="text-xs font-medium text-gray-600">Nhãn đỏ</label>
                      <input id="ppc-bn-tag" value={config.banner.tag} disabled={!canEdit} onChange={(e) => set({ banner: { ...config.banner, tag: e.target.value } })} placeholder="Khuyến mãi tháng 11" className="h-9 border rounded-md px-2" />
                    </div>
                    <div className="flex flex-col gap-1 flex-[3_1_240px]">
                      <label htmlFor="ppc-bn-text" className="text-xs font-medium text-gray-600">Nội dung</label>
                      <input id="ppc-bn-text" value={config.banner.text} disabled={!canEdit} onChange={(e) => set({ banner: { ...config.banner, text: e.target.value } })} placeholder="Mua 10 túi Syrup LerMao tặng 1 túi cùng loại" className="h-9 border rounded-md px-2" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {/* [contain:paint]: Chrome + html zoom 0.85 làm phần vẽ ẩn của input date tràn ra, trang cuộn thêm khoảng trắng. Viền focus vẽ vào trong (ring-inset) để không bị cắt */}
                    <div className="flex flex-col gap-1 flex-[1_1_140px]">
                      <label htmlFor="ppc-from" className="text-xs font-medium text-gray-600">Hiệu lực từ</label>
                      <input id="ppc-from" type="date" value={config.validFrom} disabled={!canEdit} onChange={(e) => set({ validFrom: e.target.value })} className="h-9 border rounded-md px-2 [contain:paint] outline-none focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/40" />
                    </div>
                    <div className="flex flex-col gap-1 flex-[1_1_140px]">
                      <label htmlFor="ppc-to" className="text-xs font-medium text-gray-600">Đến ngày</label>
                      <input id="ppc-to" type="date" value={config.validTo} disabled={!canEdit} onChange={(e) => set({ validTo: e.target.value })} className="h-9 border rounded-md px-2 [contain:paint] outline-none focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/40" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            {/* Thương hiệu */}
            <div className="flex-[1_1_260px]">
              <Card title="Thương hiệu (badge lọc)">
                {brandRows.length === 0 ? (
                  <p className="p-4 text-sm text-gray-600">Thêm sản phẩm để có thương hiệu.</p>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={brandRows.map((b) => b.tradeMarkId)}
                    onReorder={(ids: number[]) => set({ brands: [...ids.map((id) => config.brands.find((b) => b.tradeMarkId === id)!), ...config.brands.filter((b) => !usedBrandIds.has(b.tradeMarkId))] })}
                    className="divide-y">
                    {brandRows.map((b) => (
                      <Reorder.Item key={b.tradeMarkId} value={b.tradeMarkId} dragListener={canEdit} className="flex items-center gap-2 px-3 min-h-11 bg-white">
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" aria-hidden="true" />
                        <input
                          aria-label="Tên thương hiệu hiển thị"
                          value={b.label}
                          disabled={!canEdit}
                          onChange={(e) => set({ brands: config.brands.map((x) => (x.tradeMarkId === b.tradeMarkId ? { ...x, label: e.target.value } : x)) })}
                          className="flex-1 min-w-0 h-8 border rounded-md px-2 text-sm"
                        />
                        <span className="text-xs text-gray-600 shrink-0">{config.items.filter((it) => brandOfItem(it) === b.tradeMarkId).length} SP</span>
                        <Switch on={b.visible} label={`Hiển thị ${b.label}`} disabled={!canEdit} onChange={(v) => set({ brands: config.brands.map((x) => (x.tradeMarkId === b.tradeMarkId ? { ...x, visible: v } : x)) })} />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </Card>
            </div>
          </div>

          {/* Nhóm sản phẩm */}
          <Card
            title={`Nhóm sản phẩm · ${config.groups.length}/${PRICE_GROUP_MAX}`}
            right={
              canEdit ? (
                <button
                  type="button"
                  onClick={addGroup}
                  disabled={config.groups.length >= PRICE_GROUP_MAX}
                  className="h-9 px-3 border rounded-lg text-sm flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Thêm nhóm
                </button>
              ) : null
            }>
            <Reorder.Group
              axis="y"
              values={config.groups.map((g) => g.key)}
              onReorder={(keys: PriceGroupKey[]) => set({ groups: keys.map((k) => config.groups.find((g) => g.key === k)!) })}
              className="divide-y">
              {config.groups.map((g, gi) => (
                <GroupRow
                  key={g.key}
                  index={gi}
                  group={g}
                  count={config.items.filter((it) => it.group === g.key).length}
                  canEdit={canEdit}
                  canRemove={config.groups.length > 1}
                  autoFocus={g.key === focusGroup}
                  onChange={(patch) => patchGroup(g.key, patch)}
                  onRemove={() => removeGroup(g)}
                />
              ))}
            </Reorder.Group>
            <p className="px-4 py-2 border-t text-xs text-gray-600">Kéo ⋮⋮ để đổi thứ tự tab trên trang public. Biểu tượng quyết định màu và hình minh hoạ của nhóm. Xoá nhóm thì sản phẩm trong nhóm chuyển sang nhóm đầu tiên còn lại.</p>
          </Card>

          {/* Sản phẩm */}
          <Card
            title={`Sản phẩm hiển thị · ${shown}/${config.items.length} đang hiện`}
            right={canEdit ? <ProductPicker onPick={addProduct} existing={new Set(config.items.map((it) => it.productId))} /> : null}>
            <div className="divide-y">
              {config.groups.map((g, gi) => {
                const groupItems = config.items.filter((it) => it.group === g.key);
                const hidden = !g.visible;
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#f0fbfc]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: GROUP_DOT[g.icon] }} />
                      <span className="font-bold text-sm text-brand-dark">
                        {gi + 1}. {g.name}
                      </span>
                      <span className="text-sm text-gray-600">
                        · {shownCount(g.key)}/{groupItems.length} hiện
                      </span>
                      <span className="ml-auto text-xs text-gray-600">{hidden ? "Nhóm đang ẩn" : ""}</span>
                      <Switch
                        on={!hidden}
                        label={`Hiển thị nhóm ${g.name}`}
                        disabled={!canEdit}
                        onChange={(v) => patchGroup(g.key, { visible: v })}
                      />
                    </div>
                    {groupItems.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">Chưa có sản phẩm. Trang public hiện “Nhóm này chưa có sản phẩm”.</p>
                    ) : (
                      <Reorder.Group
                        axis="y"
                        values={groupItems.map((it) => it.productId)}
                        onReorder={(ids: number[]) =>
                          set({ items: [...config.items.filter((it) => it.group !== g.key), ...ids.map((id) => config.items.find((it) => it.productId === id)!)] })
                        }
                        className="divide-y">
                        {groupItems.map((it) => (
                          <ItemRow
                            key={it.productId}
                            item={it}
                            entry={catalog[it.productId]}
                            groups={config.groups}
                            brands={config.brands}
                            regionNames={Object.fromEntries(config.regions.map((r) => [r.key, r.name])) as Record<PriceRegionKey, string>}
                            canEdit={canEdit}
                            onChange={(patch) => setItem(it.productId, patch)}
                            onRemove={() => set({ items: config.items.filter((x) => x.productId !== it.productId) })}
                          />
                        ))}
                      </Reorder.Group>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="px-4 py-2 border-t text-xs text-gray-600">Kéo biểu tượng ⋮⋮ để đổi thứ tự trong nhóm. Thứ tự này là thứ tự hiện trên trang public.</p>
          </Card>
        </div>

        {/* Xem trước */}
        <aside className="flex-[1_1_340px] max-w-[400px] lg:sticky lg:top-4 bg-white border rounded-lg p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold">Xem trước {previewLoading && <span className="text-xs font-normal text-gray-500">· đang cập nhật…</span>}</h2>
            <div role="group" aria-label="Khu vực xem trước" className="flex p-0.5 gap-0.5 bg-gray-100 rounded-md">
              {config.regions.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={previewRegion === r.key}
                  onClick={() => setPreviewRegion(r.key)}
                  className={`h-8 px-3 rounded text-sm ${previewRegion === r.key ? "bg-white font-semibold shadow-sm" : "text-gray-700"}`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <PreviewPhone>
            {(frame) =>
              preview ? (
                <PriceListView data={preview.data} region={previewRegion} scrollRoot={frame} portalContainer={frame} updatedLabel="bản xem trước" />
              ) : (
                <div className="p-6 text-sm text-gray-500">Đang dựng bản xem trước…</div>
              )
            }
          </PreviewPhone>
          <p className="text-xs text-gray-600">Bản xem trước dùng cấu hình đang sửa, kể cả phần chưa lưu. Khách chỉ thấy thay đổi sau khi bấm Xuất bản.</p>
        </aside>
      </div>
    </div>
  );
}

/** Khung điện thoại 375px thu nhỏ 0.8; là khung cuộn và nơi gắn drawer chi tiết. */
function PreviewPhone({ children }: { children: (frame: HTMLDivElement | null) => React.ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div className="self-center w-[312px] h-[650px] rounded-[28px] border-[6px] border-gray-900 overflow-hidden bg-white">
      <div className="w-[375px] h-[800px] origin-top-left scale-[0.8]">
        <div ref={setFrame} className="relative w-full h-full overflow-y-auto overflow-x-hidden [transform:translateZ(0)]">
          {children(frame)}
        </div>
      </div>
    </div>
  );
}

/** Một dòng nhóm: kéo đổi thứ tự, biểu tượng, tên, ẩn/hiện, xoá. */
function GroupRow({
  index,
  group: g,
  count,
  canEdit,
  canRemove,
  autoFocus,
  onChange,
  onRemove,
}: {
  index: number;
  group: PriceGroupConfig;
  count: number;
  canEdit: boolean;
  canRemove: boolean;
  autoFocus: boolean;
  onChange: (patch: Partial<PriceGroupConfig>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const empty = !g.name.trim();
  return (
    <Reorder.Item value={g.key} dragListener={false} dragControls={controls} className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-sm ${g.visible ? "bg-white" : "bg-gray-50"}`}>
      <button
        type="button"
        aria-label={`Kéo để đổi thứ tự nhóm ${g.name}`}
        disabled={!canEdit}
        onPointerDown={(e) => canEdit && controls.start(e)}
        className="w-6 h-9 flex items-center justify-center text-gray-400 cursor-grab touch-none disabled:cursor-default">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-5 text-gray-600 tabular-nums">{index + 1}.</span>
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: GROUP_DOT[g.icon] }} aria-hidden="true" />
      <select
        aria-label={`Biểu tượng nhóm ${g.name}`}
        value={g.icon}
        disabled={!canEdit}
        onChange={(e) => onChange({ icon: e.target.value as PriceGroupIcon })}
        className="h-9 border rounded-md px-1.5 bg-white">
        {GROUP_ICONS.map((ic) => (
          <option key={ic} value={ic}>
            {PRICE_GROUP_ICON_LABEL[ic]}
          </option>
        ))}
      </select>
      <input
        aria-label="Tên nhóm"
        value={g.name}
        maxLength={40}
        disabled={!canEdit}
        autoFocus={autoFocus}
        onFocus={(e) => autoFocus && g.name === "Nhóm mới" && e.currentTarget.select()}
        onChange={(e) => onChange({ name: e.target.value })}
        aria-invalid={empty}
        title={empty ? "Nhập tên nhóm" : undefined}
        className={`flex-[1_1_180px] min-w-0 h-9 border rounded-md px-2 ${empty ? "border-red-500" : ""}`}
      />
      <span className="w-12 text-right text-xs text-gray-600 shrink-0">{count} SP</span>
      <Switch on={g.visible} label={`Hiển thị nhóm ${g.name}`} disabled={!canEdit} onChange={(v) => onChange({ visible: v })} />
      {canEdit && (
        <button
          type="button"
          aria-label={`Xoá nhóm ${g.name}`}
          title={canRemove ? undefined : "Cần giữ ít nhất 1 nhóm"}
          disabled={!canRemove}
          onClick={onRemove}
          className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Reorder.Item>
  );
}

function ItemRow({
  item,
  entry,
  groups,
  brands,
  regionNames,
  canEdit,
  onChange,
  onRemove,
}: {
  item: PriceItemConfig;
  entry?: CatalogMap[number];
  groups: PriceGroupConfig[];
  brands: PricePageConfig["brands"];
  regionNames: Record<PriceRegionKey, string>;
  canEdit: boolean;
  onChange: (patch: Partial<PriceItemConfig>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const [open, setOpen] = useState(false);
  const price = (k: PriceRegionKey) => (item.hidePrice.includes(k) ? "Liên hệ" : formatVnd(entry?.price?.[k]));
  const toggleHide = (k: PriceRegionKey, v: boolean) => onChange({ hidePrice: v ? [...item.hidePrice, k] : item.hidePrice.filter((x) => x !== k) });
  const images = entry?.images ?? [];
  // Ảnh đã chọn (còn tồn tại) hoặc ảnh chính — giống cách backend chọn ảnh khi xuất bản
  const chosen = images.find((i) => i.id === item.imageId) ?? images[0];
  const thumb = chosen?.image ?? entry?.image ?? null;
  const ownBrand = brands.find((b) => b.tradeMarkId === entry?.tradeMarkId)?.label || entry?.tradeMarkName || "";
  const pickedBrand = brands.find((b) => b.tradeMarkId === item.brandId);
  return (
    <Reorder.Item value={item.productId} dragListener={false} dragControls={controls} className="bg-white text-sm">
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 ${item.visible ? "" : "bg-gray-50"}`}>
        <button
          type="button"
          aria-label="Kéo để sắp xếp"
          disabled={!canEdit}
          onPointerDown={(e) => canEdit && controls.start(e)}
          className="w-6 h-9 flex items-center justify-center text-gray-400 cursor-grab touch-none disabled:cursor-default">
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Chọn ảnh hiển thị trên trang public"
          title="Chọn ảnh hiển thị trên trang public"
          onClick={() => setOpen(true)}
          className={`w-10 h-10 rounded-md border bg-white overflow-hidden flex items-center justify-center shrink-0 hover:border-brand ${item.visible ? "" : "opacity-50"}`}>
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-gray-500">Chưa ảnh</span>
          )}
        </button>
        {/* Bấm tên để mở/đóng phần sửa (như nút bút chì) */}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex-[1_1_220px] min-w-0 text-left rounded hover:text-brand-dark ${item.visible ? "" : "opacity-60"}`}>
          <span className="block font-medium truncate" title={entry?.fullName}>
            {item.name || entry?.fullName || `#${item.productId}`}
          </span>
          <span className="block text-xs text-gray-600">
            {entry?.code} · {entry?.tradeMarkName ?? "—"}
            {pickedBrand && <span className="text-brand-dark"> → hiện {pickedBrand.label}</span>}
            {entry && !entry.isActive && <span className="ml-1 text-red-600">· ngừng kinh doanh</span>}
          </span>
        </button>
        <span className="w-24 text-right tabular-nums" title={`Giá ${regionNames.N}`}>
          <span className="block text-[11px] text-gray-500">{regionNames.N}</span>
          {price("N")}
        </span>
        <span className="w-24 text-right tabular-nums" title={`Giá ${regionNames.S}`}>
          <span className="block text-[11px] text-gray-500">{regionNames.S}</span>
          {price("S")}
        </span>
        <select aria-label="Nhóm" value={item.group} disabled={!canEdit} onChange={(e) => onChange({ group: e.target.value })} className="h-8 border rounded-md px-1.5 bg-white">
          {groups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.name}
            </option>
          ))}
        </select>
        <select aria-label="Nhãn" value={item.tag ?? ""} disabled={!canEdit} onChange={(e) => onChange({ tag: (e.target.value || null) as PriceTag | null })} className="h-8 border rounded-md px-1.5 bg-white">
          <option value="">Không nhãn</option>
          {(Object.keys(PRICE_TAG_LABEL) as PriceTag[]).map((t) => (
            <option key={t} value={t}>
              {PRICE_TAG_LABEL[t]}
            </option>
          ))}
        </select>
        <Switch on={item.visible} label="Hiển thị sản phẩm" disabled={!canEdit} onChange={(v) => onChange({ visible: v })} />
        {canEdit && (
          <button type="button" aria-label="Bỏ khỏi bảng giá" onClick={onRemove} className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="grid gap-2 px-12 pb-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span id={`ppc-img-${item.productId}`} className="text-xs font-medium text-gray-600">
              Ảnh hiển thị trên trang public
            </span>
            {images.length === 0 ? (
              <p className="text-sm text-gray-600">Sản phẩm chưa có ảnh. Thêm ảnh ở Hàng hóa › Danh sách sản phẩm.</p>
            ) : (
              <div role="radiogroup" aria-labelledby={`ppc-img-${item.productId}`} className="flex flex-wrap gap-2">
                {images.map((img, i) => {
                  const on = img.id === chosen?.id;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={i === 0 ? "Ảnh chính" : `Ảnh ${i + 1}`}
                      disabled={!canEdit}
                      // Chọn ảnh chính → lưu null: đổi ảnh chính trong Danh sách sản phẩm thì trang public theo luôn
                      onClick={() => onChange({ imageId: i === 0 ? null : img.id })}
                      className={`relative w-16 h-16 rounded-md border-2 bg-white overflow-hidden ${on ? "border-brand" : "border-gray-200 hover:border-gray-400"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.image} alt="" className="w-full h-full object-contain" loading="lazy" />
                      {i === 0 && <span className="absolute left-0 right-0 bottom-0 bg-black/60 text-white text-[10px] leading-4 text-center">Ảnh chính</span>}
                      {on && <CheckCircle2 className="absolute top-0.5 right-0.5 w-4 h-4 text-brand-dark bg-white rounded-full" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Tên hiển thị (để trống = tách từ tên POS)</span>
            <input value={item.name} disabled={!canEdit} placeholder={entry?.auto?.name} onChange={(e) => onChange({ name: e.target.value })} className="h-9 border rounded-md px-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Thương hiệu hiển thị</span>
            <select
              value={pickedBrand ? String(pickedBrand.tradeMarkId) : ""}
              disabled={!canEdit}
              onChange={(e) => onChange({ brandId: e.target.value ? Number(e.target.value) : null })}
              className="h-9 border rounded-md px-2 bg-white">
              <option value="">Theo sản phẩm{ownBrand ? ` (${ownBrand})` : ""}</option>
              {brands.map((b) => (
                <option key={b.tradeMarkId} value={b.tradeMarkId}>
                  {b.label || `#${b.tradeMarkId}`}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
            {SPEC_FIELDS.map((f) => {
              const auto = entry?.auto?.[f.key] ?? "";
              const id = `ppc-${f.key}-${item.productId}`;
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <label htmlFor={id} className="text-xs font-medium text-gray-600">
                    {f.label} (để trống = tự động)
                  </label>
                  <input
                    id={id}
                    value={item[f.key]}
                    maxLength={f.max}
                    disabled={!canEdit}
                    placeholder={auto || "Không hiển thị"}
                    onChange={(e) => onChange({ [f.key]: e.target.value })}
                    className="h-9 border rounded-md px-2"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Ẩn giá → hiện “Liên hệ”</span>
            <div className="flex gap-4 h-9 items-center">
              {(["N", "S"] as PriceRegionKey[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={item.hidePrice.includes(k)} disabled={!canEdit} onChange={(e) => toggleHide(k, e.target.checked)} className="w-4 h-4 accent-brand" />
                  {regionNames[k]}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-gray-600">Mô tả ngắn (hiện trong chi tiết sản phẩm)</span>
            <textarea rows={2} value={item.desc} disabled={!canEdit} onChange={(e) => onChange({ desc: e.target.value })} className="border rounded-md px-2 py-1.5 resize-y" />
          </label>
        </div>
      )}
    </Reorder.Item>
  );
}

/** Ô tìm sản phẩm POS để thêm vào bảng giá. */
function ProductPicker({
  onPick,
  existing,
}: {
  onPick: (p: Awaited<ReturnType<typeof productsApi.getProducts>>["data"][number]) => void;
  existing: Set<number>;
}) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const { data, isFetching } = useQuery({
    queryKey: ["public-price-pick", dq],
    queryFn: () => productsApi.getProducts({ search: dq, limit: 12, isActive: true }),
    enabled: dq.length >= 2,
  });
  const results = useMemo(() => data?.data ?? [], [data]);
  return (
    <div ref={boxRef} className="relative w-full sm:w-80">
      <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-2.5" aria-hidden="true" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Thêm sản phẩm: tìm tên hoặc mã…"
        aria-label="Thêm sản phẩm vào bảng giá"
        className="w-full h-9 border rounded-md pl-8 pr-2 text-sm"
      />
      {open && dq.length >= 2 && (
        <div className="absolute right-0 left-0 top-10 z-30 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isFetching && results.length === 0 && <div className="p-3 text-sm text-gray-500">Đang tìm…</div>}
          {!isFetching && results.length === 0 && <div className="p-3 text-sm text-gray-500">Không có sản phẩm khớp.</div>}
          {results.map((p) => {
            const added = existing.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={added}
                onClick={() => {
                  onPick(p);
                  setQ("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
                <Plus className="w-4 h-4 shrink-0 text-brand-deep" />
                <span className="min-w-0">
                  <span className="block truncate">{p.name}</span>
                  <span className="block text-xs text-gray-600">
                    {p.code}
                    {added ? " · đã có" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
