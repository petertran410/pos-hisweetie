"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, GripVertical, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { publicPriceApi } from "@/lib/api/public-price";
import { productsApi } from "@/lib/api/products";
import { usePriceBooks } from "@/lib/hooks/usePriceBooks";
import { usePermission } from "@/lib/hooks/usePermissions";
import { confirmAction } from "@/lib/chat/confirm";
import {
  PRICE_GROUPS,
  PRICE_TAG_LABEL,
  PUBLIC_PRICE_URL,
  REGION_PARAM,
  type PriceCatalogEntry,
  type PriceGroupKey,
  type PriceItemConfig,
  type PricePageConfig,
  type PriceRegionKey,
  type PriceTag,
} from "@/lib/public-price/types";
import { formatVnd, guessGroup, isHttpsUrl, knownBrandLabel } from "@/lib/public-price/utils";
import { PriceListView } from "./PriceListView";

const KEY = ["public-price-page"];
const GROUP_DOT: Record<PriceGroupKey, string> = { tea: "#1D8A8A", jam: "#7B4F2E", top: "#4A4A4A", froz: "#0090C0" };

type CatalogMap = Record<number, Omit<PriceCatalogEntry, "price"> & { price?: PriceCatalogEntry["price"] }>;

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

  const addProduct = (p: { id: number; code: string; name: string; tradeMarkId?: number | null; tradeMark?: { id: number; name: string } | null; images?: { image: string; isPrimary?: boolean }[]; isActive?: boolean }) => {
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
      },
    }));
    const brands =
      tmId != null && !config.brands.some((b) => b.tradeMarkId === tmId)
        ? [...config.brands, { tradeMarkId: tmId, label: knownBrandLabel(p.tradeMark?.name ?? ""), visible: true }]
        : config.brands;
    set({
      brands,
      items: [...config.items, { productId: p.id, group: guessGroup(p.name), visible: true, tag: null, hidePrice: [], name: "", desc: "" }],
    });
  };

  const usedBrandIds = new Set(config.items.map((it) => catalog[it.productId]?.tradeMarkId).filter((x): x is number => x != null));
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
                        <span className="text-xs text-gray-600 shrink-0">{config.items.filter((it) => catalog[it.productId]?.tradeMarkId === b.tradeMarkId).length} SP</span>
                        <Switch on={b.visible} label={`Hiển thị ${b.label}`} disabled={!canEdit} onChange={(v) => set({ brands: config.brands.map((x) => (x.tradeMarkId === b.tradeMarkId ? { ...x, visible: v } : x)) })} />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </Card>
            </div>
          </div>

          {/* Sản phẩm */}
          <Card
            title={`Sản phẩm hiển thị · ${shown}/${config.items.length} đang hiện`}
            right={canEdit ? <ProductPicker onPick={addProduct} existing={new Set(config.items.map((it) => it.productId))} /> : null}>
            <div className="divide-y">
              {PRICE_GROUPS.map((g, gi) => {
                const groupItems = config.items.filter((it) => it.group === g.key);
                const hidden = config.hiddenGroups.includes(g.key);
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#f0fbfc]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: GROUP_DOT[g.key] }} />
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
                        onChange={(v) => set({ hiddenGroups: v ? config.hiddenGroups.filter((x) => x !== g.key) : [...config.hiddenGroups, g.key] })}
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

function ItemRow({
  item,
  entry,
  regionNames,
  canEdit,
  onChange,
  onRemove,
}: {
  item: PriceItemConfig;
  entry?: CatalogMap[number];
  regionNames: Record<PriceRegionKey, string>;
  canEdit: boolean;
  onChange: (patch: Partial<PriceItemConfig>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const [open, setOpen] = useState(false);
  const price = (k: PriceRegionKey) => (item.hidePrice.includes(k) ? "Liên hệ" : formatVnd(entry?.price?.[k]));
  const toggleHide = (k: PriceRegionKey, v: boolean) => onChange({ hidePrice: v ? [...item.hidePrice, k] : item.hidePrice.filter((x) => x !== k) });
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
        <span className={`w-10 h-10 rounded-md border bg-white overflow-hidden flex items-center justify-center shrink-0 ${item.visible ? "" : "opacity-50"}`}>
          {entry?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.image} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-gray-500">Chưa ảnh</span>
          )}
        </span>
        <span className={`flex-[1_1_220px] min-w-0 ${item.visible ? "" : "opacity-60"}`}>
          <span className="block font-medium truncate" title={entry?.fullName}>
            {item.name || entry?.fullName || `#${item.productId}`}
          </span>
          <span className="block text-xs text-gray-600">
            {entry?.code} · {entry?.tradeMarkName ?? "—"}
            {entry && !entry.isActive && <span className="ml-1 text-red-600">· ngừng kinh doanh</span>}
          </span>
        </span>
        <span className="w-24 text-right tabular-nums" title={`Giá ${regionNames.N}`}>
          <span className="block text-[11px] text-gray-500">{regionNames.N}</span>
          {price("N")}
        </span>
        <span className="w-24 text-right tabular-nums" title={`Giá ${regionNames.S}`}>
          <span className="block text-[11px] text-gray-500">{regionNames.S}</span>
          {price("S")}
        </span>
        <select aria-label="Nhóm" value={item.group} disabled={!canEdit} onChange={(e) => onChange({ group: e.target.value as PriceGroupKey })} className="h-8 border rounded-md px-1.5 bg-white">
          {PRICE_GROUPS.map((g) => (
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
        <button type="button" aria-label="Sửa tên, mô tả, ẩn giá" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100">
          {open ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Pencil className="w-4 h-4" />}
        </button>
        {canEdit && (
          <button type="button" aria-label="Bỏ khỏi bảng giá" onClick={onRemove} className="w-9 h-9 flex items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="grid gap-2 px-12 pb-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Tên hiển thị (để trống = tách từ tên POS)</span>
            <input value={item.name} disabled={!canEdit} onChange={(e) => onChange({ name: e.target.value })} className="h-9 border rounded-md px-2" />
          </label>
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
