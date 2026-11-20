"use client";

import "./price-list.css";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ReducedMotionConfig,
  blur,
  scale,
  shift,
  useMotionTokens,
  useShouldReduceMotion,
} from "@animate-ui/react/utils/motion";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import { Drawer } from "@animate-ui/react/primitives/radix-ui/drawer";
import { Dialog } from "@animate-ui/react/primitives/radix-ui/dialog";
import {
  PRICE_GROUPS,
  PRICE_TAG_LABEL,
  REGION_PARAM,
  type PriceGroupKey,
  type PriceRegionKey,
  type PriceTag,
  type PublicPriceData,
  type PublicPriceProduct,
} from "@/lib/public-price/types";

const LOGO = "/brands/price/lermao-mascot.png";
const REGION_STORAGE_KEY = "price-region";
/** Khung chứa ≥ 1024px: bố cục desktop, chi tiết mở dạng hộp thoại thay cho drawer. */
const DESKTOP_MIN = 1024;

/* ---------- Icon (nét 2px, theo mockup) ---------- */
const UI = {
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM9.5 10a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  chat: "M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5",
  search: "M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0zM20 20l-4.2-4.2",
  x: "M6 6l12 12M18 6 6 18",
  gift: "M5 9h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM12 9v12M3 13h18M12 9c-3 0-5-1-5-3s3-3 5 0c2-3 5-2 5 0s-2 3-5 3",
} as const;
const TAG_ICON: Record<PriceTag, string> = {
  new: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  hot: "M12 21c-4 0-6-2.8-6-6 0-3 2-4.5 3-7 1 1.5 2 2 3 2 0-3 1-5 2-6 3 3 4 6.5 4 9.5 0 3.5-2 7.5-6 7.5z",
  sale: "M19 5 5 19M4.5 7a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0zM14.5 17a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0z",
};
/** Minh hoạ nhóm (khung 48): lá trà · chai syrup · ly trân châu · bông tuyết */
const GROUP_ICON: Record<PriceGroupKey, string> = {
  tea: "M8 38C8 18 20 8 40 8c0 20-10 32-30 32M8 40 28 20",
  jam: "M19 6h10v6l4 6v22a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V18l4-6zM15 26h18M24 30c-2 3-3 4-3 6a3 3 0 0 0 6 0c0-2-1-3-3-6z",
  top: "M10 14h28l-3 26a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3zM8 14h32M16 34a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM25 35a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM21 28a3 3 0 1 0 6 0a3 3 0 1 0-6 0zM26 14l5-8",
  froz: "M24 6v36M8.4 15l31.2 18M8.4 33 39.6 15M19 9l5 4 5-4M19 39l5-4 5 4",
};

function Ui({ d, className = "pp-i" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
/** Icon nhóm dạng ảnh (thay cho nét vẽ) */
const GROUP_IMG: Partial<Record<PriceGroupKey, string>> = { jam: "/brands/price/icon-jam.webp" };

function Ill({ group, className }: { group: PriceGroupKey; className?: string }) {
  const img = GROUP_IMG[group];
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`${className ?? ""} pp-ill-img`} src={img} alt="" aria-hidden="true" width={128} height={128} />;
  }
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={GROUP_ICON[group]} />
    </svg>
  );
}

/* ---------- Tiện ích ---------- */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
const telHref = (tel: string) => `tel:${tel.replace(/[^\d+]/g, "")}`;
const ddmmyyyy = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const ymdToDmy = (s: string) => s.split("-").reverse().join("/");

/** Logo badge cho các thương hiệu chính; thương hiệu khác hiện chữ. */
function brandLogo(name: string): { src: string; w: number; h: number } | null {
  const n = norm(name);
  if (n.includes("lermao")) return { src: "/brands/price/lermao.png", w: 110, h: 105 };
  if (n.includes("phuong hoang")) return { src: "/brands/price/tra-phuong-hoang.png", w: 140, h: 150 };
  if (n.includes("amo")) return { src: "/brands/price/amo-pastel.png", w: 200, h: 86 };
  if (n.includes("natufruit")) return { src: "/brands/price/natufruite.png", w: 130, h: 122 };
  return null;
}

export interface PriceListViewProps {
  data: PublicPriceData;
  /** Khu vực lúc mở (từ ?region= trên URL) */
  initialRegion?: PriceRegionKey;
  /** Trang thật: nhớ khu vực vào máy và đưa lên URL. Khung xem trước trong POS: tắt. */
  syncUrl?: boolean;
  /** Khung cuộn chứa trang (khung xem trước); mặc định là cửa sổ */
  scrollRoot?: HTMLElement | null;
  /** Nơi gắn drawer/hộp thoại chi tiết (khung xem trước); mặc định body */
  portalContainer?: HTMLElement | null;
  /** Khu vực do bên ngoài điều khiển (POS xem trước theo Bắc/Nam) */
  region?: PriceRegionKey;
  /** Dòng phụ thay cho ngày cập nhật, vd "Bản xem trước" */
  updatedLabel?: string;
}

export function PriceListView(props: PriceListViewProps) {
  return (
    <ReducedMotionConfig>
      <PriceList {...props} />
    </ReducedMotionConfig>
  );
}

function PriceList({ data, initialRegion, syncUrl = false, scrollRoot = null, portalContainer = null, region: regionProp, updatedLabel }: PriceListViewProps) {
  const uid = useId();
  const reduce = useShouldReduceMotion();
  const { spring, transition } = useMotionTokens();

  const regions = data.regions.length ? data.regions : [{ key: "N" as const, name: "Miền Bắc", listName: "", hotline: "" }];
  const groups = data.groups.length ? data.groups : PRICE_GROUPS.map(({ key, name }) => ({ key, name }));
  // Mặc định Miền Nam (khi URL không ghi ?region= và máy chưa nhớ lựa chọn)
  const pickRegion = (k?: PriceRegionKey | null) =>
    k && regions.some((r) => r.key === k) ? k : regions.some((r) => r.key === "S") ? "S" : regions[0].key;

  const [regionState, setRegionState] = useState<PriceRegionKey>(() => pickRegion(initialRegion));
  const region = regionProp ? pickRegion(regionProp) : regionState;
  const R = regions.find((r) => r.key === region) ?? regions[0];
  const [group, setGroup] = useState<PriceGroupKey>(groups[0].key);
  const [brand, setBrand] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [compact, setCompact] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Nhớ khu vực: URL không ghi thì lấy lựa chọn lần trước trên máy này.
  useEffect(() => {
    if (!syncUrl || regionProp) return;
    try {
      if (new URLSearchParams(window.location.search).get("region")) return;
      const saved = window.localStorage.getItem(REGION_STORAGE_KEY) as PriceRegionKey | null;
      if (saved && saved !== regionState && regions.some((r) => r.key === saved)) setRegionState(saved);
    } catch {
      /* localStorage bị chặn: dùng mặc định */
    }
    // chỉ chạy lúc mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRegion = (k: PriceRegionKey) => {
    setRegionState(k);
    if (!syncUrl) return;
    try {
      window.localStorage.setItem(REGION_STORAGE_KEY, k);
      const url = new URL(window.location.href);
      url.searchParams.set("region", REGION_PARAM[k]);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* bỏ qua */
    }
  };

  // Header lớn cuộn khuất → hiện thanh thu gọn (mobile).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 56),
      { root: scrollRoot, rootMargin: "-56px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scrollRoot]);

  // Bố cục theo bề rộng khung chứa (trang thật hay khung xem trước 375px).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setDesktop(e.contentRect.width >= DESKTOP_MIN));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const brandName = useCallback((id: number | null) => data.brands.find((b) => b.id === id)?.name ?? "", [data.brands]);
  const qn = norm(dq.trim());
  const matchQ = useCallback(
    (p: PublicPriceProduct) => !qn || norm(`${p.name} ${brandName(p.brandId)} ${p.spec} ${p.code}`).includes(qn),
    [qn, brandName]
  );
  const match = useCallback((p: PublicPriceProduct) => (brand == null || p.brandId === brand) && matchQ(p), [brand, matchQ]);
  const counts = useMemo(() => {
    const c = {} as Record<PriceGroupKey, number>;
    for (const g of groups) c[g.key] = data.products.filter((p) => p.group === g.key && match(p)).length;
    return c;
  }, [data.products, groups, match]);
  const items = useMemo(() => data.products.filter((p) => p.group === group && match(p)), [data.products, group, match]);
  const filtering = !!qn || brand != null;
  const others = groups.filter((g) => g.key !== group && counts[g.key] > 0).sort((a, b) => counts[b.key] - counts[a.key]);
  const brandCount = (id: number | null) => data.products.filter((p) => p.group === group && (id == null || p.brandId === id) && matchQ(p)).length;

  const current = data.products.find((p) => p.id === sheetId) ?? null;
  const lastSheet = useRef<PublicPriceProduct | null>(null);
  if (current) lastSheet.current = current;
  const sheet = current ?? lastSheet.current;

  const groupName = groups.find((g) => g.key === group)?.name ?? "";
  const updated = updatedLabel ?? (data.publishedAt ? `cập nhật ${ddmmyyyy(data.publishedAt)}` : "");
  const validity = data.validFrom || data.validTo
    ? `Hiệu lực${data.validFrom ? ` từ ${ymdToDmy(data.validFrom)}` : ""}${data.validTo ? ` đến ${ymdToDmy(data.validTo)}` : ""}. `
    : "";
  const clearAll = () => {
    setQ("");
    setBrand(null);
  };

  /* ---------- Thành phần ---------- */
  const regionSwitch = (variant: "big" | "small") => (
    <div className={`pp-rg${variant === "small" ? " small" : ""}`} role="group" aria-label="Chọn khu vực">
      {regions.map((r) => {
        const on = r.key === region;
        return (
          <motion.button
            key={r.key}
            type="button"
            className="pp-rg-b"
            aria-pressed={on}
            onClick={() => changeRegion(r.key)}
            initial={{ transform: "scale(1)" }}
            whileTap={{ transform: `scale(${reduce ? 1 : scale.press})` }}
            transition={spring.press}>
            {on && <motion.span layoutId={`${uid}-rg-${variant}`} className="pp-rg-thumb" transition={spring.thumb} />}
            <Ui d={UI.pin} />
            <span>
              <b>{r.name}</b>
            </span>
          </motion.button>
        );
      })}
    </div>
  );

  const subtitle = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={region}
        className="pp-t2"
        initial={{ opacity: 0, filter: blur.surface, y: reduce ? 0 : shift.handoff }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: transition.reveal }}
        exit={{ opacity: 0, filter: blur.surface, y: reduce ? 0 : -shift.handoff, transition: transition.swap }}>
        {updated}
      </motion.span>
    </AnimatePresence>
  );

  const ctaButtons = (
    <>
      {R.hotline && (
        <a className="pp-bt call" href={telHref(R.hotline)}>
          <Ui d={UI.phone} />
          <span>
            <b>Gọi hotline</b>
            <small>{R.hotline}</small>
          </span>
        </a>
      )}
      {data.zaloUrl && (
        <a className="pp-bt zalo" href={data.zaloUrl} target="_blank" rel="noopener noreferrer">
          <Ui d={UI.chat} />
          <span>
            <b>Chat Zalo</b>
            <small>Zalo OA</small>
          </span>
        </a>
      )}
    </>
  );

  const chip = (id: number | null) => {
    const on = brand === id;
    const n = brandCount(id);
    const logo = id != null ? brandLogo(brandName(id)) : null;
    return (
      <motion.button
        key={id ?? "all"}
        type="button"
        className={`pp-chip${id == null ? " all" : ""}${n === 0 && qn ? " zero" : ""}`}
        aria-pressed={on}
        aria-label={id == null ? "Tất cả thương hiệu" : brandName(id)}
        onClick={() => setBrand(id)}
        initial={{ transform: "scale(1)" }}
        whileTap={{ transform: `scale(${reduce ? 1 : scale.press})` }}
        transition={spring.press}>
        {id == null ? "Tất cả" : logo ? <img src={logo.src} width={logo.w} height={logo.h} alt="" /> : <span className="pp-wm">{brandName(id)}</span>}
        {(qn || desktop) && <em>{n}</em>}
      </motion.button>
    );
  };

  const emptyState = () => {
    const anim = {
      initial: { opacity: 0, filter: blur.surface, y: reduce ? 0 : 12 },
      animate: { opacity: 1, filter: "blur(0px)", y: 0, transition: { default: spring.pop, opacity: transition.reveal, filter: transition.reveal } },
    };
    if (filtering && others.length) {
      const b = others[0];
      return (
        <motion.div key="es-other" className="pp-es" {...anim}>
          <img src={LOGO} alt="" />
          <h3>Chưa có kết quả trong {groupName}</h3>
          <p>
            Nhưng có <b>{counts[b.key]} sản phẩm</b> khớp ở nhóm <b>{b.name}</b>
            {others.length > 1 ? ` và ${others.length - 1} nhóm khác` : ""}.
          </p>
          <div className="pp-es-btns">
            <button type="button" className="pp-btn pp-btn-p" onClick={() => setGroup(b.key)}>
              Xem {b.name}
            </button>
            <button type="button" className="pp-btn pp-btn-s" onClick={clearAll}>
              Xoá bộ lọc
            </button>
          </div>
        </motion.div>
      );
    }
    if (filtering) {
      return (
        <motion.div key="es-none" className="pp-es" {...anim}>
          <img src={LOGO} alt="" />
          <h3>Ối! Chưa thấy {qn ? `“${dq.trim()}”` : "sản phẩm nào"} trong bảng giá</h3>
          <p>LerMao lục khắp kho rồi mà chưa thấy. Thử từ khoá ngắn hơn nhé, hoặc nhắn Zalo để được tư vấn.</p>
          <div className="pp-sug" aria-label="Gợi ý tìm kiếm">
            {["Syrup", "Trân châu", "Matcha", "Mứt"].map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="pp-es-btns">
            <button type="button" className="pp-btn pp-btn-p" onClick={clearAll}>
              Xoá tìm kiếm
            </button>
            {data.zaloUrl && (
              <a className="pp-btn pp-btn-s" href={data.zaloUrl} target="_blank" rel="noopener noreferrer">
                <Ui d={UI.chat} />
                Hỏi giá qua Zalo
              </a>
            )}
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div key="es-empty" className="pp-es" {...anim}>
        <img src={LOGO} alt="" />
        <h3>Nhóm này chưa có sản phẩm</h3>
        <p>Hàng mới sắp về. Hãy cùng LerMao khám phá các nhóm khác, hoặc nhắn Zalo để được báo sớm nhé!</p>
        <div className="pp-es-btns">
          {others[0] && (
            <button type="button" className="pp-btn pp-btn-p" onClick={() => setGroup(others[0].key)}>
              Xem nhóm {others[0].name}
            </button>
          )}
          {data.zaloUrl && (
            <a className="pp-btn pp-btn-s" href={data.zaloUrl} target="_blank" rel="noopener noreferrer">
              <Ui d={UI.chat} />
              Nhắn Zalo hỏi hàng
            </a>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`pp${syncUrl ? " pp-page" : ""}`} ref={rootRef}>
      {/* Thanh thu gọn khi đã cuộn (mobile) */}
      <div className="pp-mini" aria-hidden={!compact} inert={!compact}>
        <motion.div
          className="pp-mini-in"
          initial={false}
          animate={
            reduce
              ? { opacity: compact ? 1 : 0, transform: "translateY(0%)" }
              : { opacity: 1, transform: compact ? "translateY(0%)" : "translateY(-110%)", transition: compact ? transition.sheet : transition.dismiss }
          }>
          <img className="pp-logo" src={LOGO} alt="" width={220} height={210} />
          {regionSwitch("small")}
        </motion.div>
      </div>

      <header ref={headerRef} className="pp-hdr">
        <svg className="pp-deco" viewBox="0 0 375 140" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
          <g fill="#FFFFFF" opacity=".22">
            <path d="M318 14c24 2 40 18 42 42-26-1-42-16-42-42z" />
            <path d="M290 74c18-18 38-20 52-12-8 18-30 26-52 12z" />
            <path d="M212 46c8 10 12 16 12 24a12 12 0 0 1-24 0c0-8 4-14 12-24z" />
            <circle cx="236" cy="18" r="10" />
            <circle cx="262" cy="34" r="6" />
            <circle cx="170" cy="22" r="7" />
          </g>
        </svg>
        <div className="pp-wrap pp-hdr-in">
          <div className="pp-brandrow">
            <img className="pp-logo" src={LOGO} alt="Gấu LerMao" width={220} height={210} />
            <div>
              <h1 className="pp-t1">Bảng giá nguyên liệu</h1>
              {subtitle}
            </div>
          </div>
          {regionSwitch("big")}
          <div className="pp-acts">{ctaButtons}</div>
        </div>
        <svg className="pp-wave" viewBox="0 0 375 20" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 20V9c40 9 80 9 125 0s90-9 125 0 85 9 125 0v11z" />
        </svg>
      </header>

      <AnimatePresence initial={false}>
        {bannerOpen && data.banner.enabled && data.banner.text && (
          <motion.div
            key="banner"
            className="pp-wrap pp-bn-wrap"
            exit={{ height: 0, opacity: 0, filter: blur.disclosure, transition: transition.disclosure }}>
            <div className="pp-bn">
              <svg className="pp-bn-deco" viewBox="0 0 70 56" aria-hidden="true">
                <g fill="#00B7E9" opacity=".6">
                  <path d="M8 40c2-18 14-28 34-28 0 18-10 30-30 30z" />
                  <circle cx="52" cy="38" r="9" />
                  <circle cx="58" cy="16" r="5" />
                </g>
              </svg>
              <span className="pp-bn-ic">
                <Ui d={UI.gift} />
              </span>
              <div className="pp-bn-body">
                {data.banner.tag && <span className="pp-tag-sale">{data.banner.tag}</span>}
                <p>{data.banner.text}</p>
              </div>
              <button type="button" className="pp-bn-x" onClick={() => setBannerOpen(false)} aria-label="Ẩn thông báo">
                <Ui d={UI.x} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pp-wrap pp-body">
        <aside className="pp-side" aria-label="Lọc thương hiệu">
          <h3>
            Thương hiệu
            {brand != null && (
              <button type="button" className="pp-lnk" onClick={() => setBrand(null)}>
                Xoá lọc
              </button>
            )}
          </h3>
          <div className="pp-bg" role="group" aria-label="Lọc thương hiệu">
            {[null, ...data.brands.map((b) => b.id)].map(chip)}
          </div>
          {R.hotline && (
            <div className="pp-help">
              <img src={LOGO} alt="" />
              <b>Cần báo giá số lượng lớn?</b>
              <span>Nhắn Zalo OA hoặc gọi hotline {R.hotline} để được tư vấn.</span>
            </div>
          )}
        </aside>

        <main className="pp-main">
          <div className="pp-sr-box">
            <span className="pp-sr-ic">
              <Ui d={UI.search} />
            </span>
            <label className="pp-sr" htmlFor={`${uid}-q`}>
              Tìm sản phẩm
            </label>
            <input id={`${uid}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm, thương hiệu…" autoComplete="off" />
            {q && (
              <button type="button" className="pp-sr-clear" onClick={() => setQ("")} aria-label="Xoá tìm kiếm">
                <Ui d={UI.x} />
              </button>
            )}
          </div>

          <div className="pp-stk">
            <div className="pp-tabs" role="group" aria-label="Nhóm sản phẩm" style={{ ["--pp-cols" as string]: groups.length }}>
              {groups.map((g) => {
                const on = g.key === group;
                const def = PRICE_GROUPS.find((x) => x.key === g.key);
                return (
                  <motion.button
                    key={g.key}
                    type="button"
                    className={`pp-tab ppg-${g.key}`}
                    aria-pressed={on}
                    onClick={() => setGroup(g.key)}
                    initial={{ transform: "scale(1)" }}
                    whileTap={{ transform: `scale(${reduce ? 1 : scale.press})` }}
                    transition={spring.press}>
                    {on && <motion.span layoutId={`${uid}-tab-bg`} className="pp-tab-bg" transition={spring.selection} />}
                    <motion.span
                      style={{ display: "inline-flex" }}
                      initial={false}
                      animate={{ opacity: on ? 1 : 0.6, transform: on && !reduce ? "translateY(-1px) scale(1.08)" : "translateY(0px) scale(1)" }}
                      transition={spring.pop}>
                      <Ill group={g.key} className="pp-tab-ic" />
                    </motion.span>
                    <span className="pp-tab-label-2">
                      {def?.lines[0] ?? g.name}
                      {def?.lines[1] && (
                        <>
                          <br />
                          {def.lines[1]}
                        </>
                      )}
                    </span>
                    <span className="pp-tab-label-1">{g.name}</span>
                    {(filtering || desktop) && <i className={`pp-cn${counts[g.key] ? "" : " zero"}`}>{counts[g.key]}</i>}
                    {on && <motion.span layoutId={`${uid}-tab-ind`} className="pp-ind" transition={spring.selection} />}
                  </motion.button>
                );
              })}
            </div>
            <div className="pp-chips" role="group" aria-label="Lọc thương hiệu">
              {[null, ...data.brands.map((b) => b.id)].map(chip)}
            </div>
          </div>

          <section className={`pp-list ppg-${group}`} aria-live="polite">
            <div className="pp-sh">
              <span className="pp-sh-ic">
                <Ill group={group} className="pp-i" />
              </span>
              <h2>{groupName}</h2>
              <span className="pp-sh-ct">{items.length} sản phẩm</span>
            </div>
            {items.length > 0 ? (
              <div className="pp-grid" style={{ position: "relative" }}>
                {/* initial={false}: lần vẽ đầu (HTML từ server) hiện thẻ ngay; đổi nhóm/lọc/tìm thì thẻ mới mới chạy hiệu ứng vào */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((p, i) => (
                    <ProductCard key={`${p.id}`} product={p} region={region} index={i} brand={brandName(p.brandId)} onOpen={() => setSheetId(p.id)} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              emptyState()
            )}
          </section>
          <div className="pp-note">
            {validity}Giá tham khảo theo bảng giá đang áp dụng. Liên hệ hotline hoặc Zalo để chốt đơn và nhận báo giá chính thức.
          </div>
        </main>
      </div>

      {(R.hotline || data.zaloUrl) && (
        <div className="pp-cta">
          <div className="pp-cta-in">{ctaButtons}</div>
        </div>
      )}

      {/* Chi tiết: drawer kéo để đóng (mobile), hộp thoại giữa màn hình (desktop) */}
      <Drawer.Root open={sheetId != null && !desktop} onOpenChange={(o) => !o && setSheetId(null)} container={portalContainer}>
        <Drawer.Portal container={portalContainer}>
          <Drawer.Overlay className="pp-portal pp-overlay" />
          <Drawer.Content className={`pp-portal pp-drawer ppg-${sheet?.group ?? "tea"}`} aria-describedby={undefined}>
            <Drawer.Handle className="pp-drawer-handle" />
            {sheet && <SheetBody product={sheet} region={region} regionName={R.name} hotline={R.hotline} brand={brandName(sheet.brandId)} TitleTag={Drawer.Title} />}
            <div className="pp-sheet-cta">
              <div className="pp-cta-in">{ctaButtons}</div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <Dialog.Root open={sheetId != null && desktop} onOpenChange={(o) => !o && setSheetId(null)}>
        <Dialog.Portal container={portalContainer}>
          <Dialog.Overlay className="pp-portal pp-overlay" />
          <Dialog.Content className={`pp-portal pp-dialog ppg-${sheet?.group ?? "tea"}`} aria-describedby={undefined}>
            <Dialog.Close className="pp-sheet-x" aria-label="Đóng">
              <Ui d={UI.x} />
            </Dialog.Close>
            {sheet && <SheetBody product={sheet} region={region} regionName={R.name} hotline={R.hotline} brand={brandName(sheet.brandId)} TitleTag={Dialog.Title} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/* ---------- Giá: số lăn khi đổi khu vực ---------- */
function Price({ value, unit, className }: { value: number; unit: string; className: string }) {
  return (
    <span className={className}>
      <SlidingNumber number={value} thousandSeparator="." initiallyStable />
      <span>đ</span>
      <small>/{unit.toLowerCase()}</small>
    </span>
  );
}

function Photo({ product, alt }: { product: PublicPriceProduct; alt: string }) {
  const [ok, setOk] = useState(true);
  const src = ok ? product.image : null;
  return (
    <div className={`pp-ph${src ? " photo" : ""}`}>
      {src ? (
        // Ảnh sản phẩm từ server POS (nhiều host), không qua next/image
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pp-ph-img" src={src} alt={alt} loading="lazy" onError={() => setOk(false)} />
      ) : (
        <Ill group={product.group} className="pp-ph-ill" />
      )}
      {product.size && <span className="pp-sz">{product.size}</span>}
      {product.tag && (
        <span className={`pp-tg ${product.tag}`}>
          <Ui d={TAG_ICON[product.tag]} />
          {PRICE_TAG_LABEL[product.tag]}
        </span>
      )}
    </div>
  );
}

function ProductCard({ product: p, region, index, brand, onOpen }: { product: PublicPriceProduct; region: PriceRegionKey; index: number; brand: string; onOpen: () => void }) {
  const reduce = useShouldReduceMotion();
  const { spring, transition } = useMotionTokens();
  const price = p.price[region];
  const delay = Math.min(index, 7) * 0.04;
  return (
    <motion.div
      className="pp-cell"
      layout="position"
      initial={{ opacity: 0, y: reduce ? 0 : 12, filter: blur.surface }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { default: { ...spring.pop, delay }, opacity: { ...transition.reveal, delay }, filter: { ...transition.reveal, delay } } }}
      exit={{ opacity: 0, filter: blur.icon, transition: transition.fade }}
      transition={{ layout: spring.reflow }}>
      <div className="pp-card-lift">
        <motion.button
          type="button"
          className={`pp-card ppg-${p.group}`}
          onClick={onOpen}
          aria-label={`${p.name}, ${brand}, ${price == null ? "Liên hệ" : `${price.toLocaleString("vi-VN")} đồng`}`}
          initial={{ transform: "scale(1)" }}
          whileTap={{ transform: `scale(${reduce ? 1 : scale.choice})` }}
          transition={spring.press}>
          <Photo product={p} alt="" />
          <span className="pp-cb">
            {brand && <span className="pp-br">{brand}</span>}
            <span className="pp-nm">{p.name}</span>
            {p.spec && <span className="pp-mt">Quy cách: {p.spec}</span>}
            {p.unit && <span className="pp-mt">Đơn vị tính: {p.unit}</span>}
            {price != null ? (
              <Price value={price} unit={p.unit || "sp"} className="pp-pr" />
            ) : (
              <span className="pp-contact">
                <Ui d={UI.phone} />
                Liên hệ
              </span>
            )}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function SheetBody({
  product: p,
  region,
  regionName,
  hotline,
  brand,
  TitleTag,
}: {
  product: PublicPriceProduct;
  region: PriceRegionKey;
  regionName: string;
  hotline: string;
  brand: string;
  TitleTag: React.ElementType;
}) {
  const price = p.price[region];
  const groupName = PRICE_GROUPS.find((g) => g.key === p.group)?.name ?? "";
  return (
    <div className="pp-sheet-scroll">
      <div className="pp-shi">
        <Photo product={{ ...p, tag: null, size: p.size }} alt={p.name} />
      </div>
      <div className="pp-sb">
        <div className="pp-tags">
          {p.tag && (
            <span className={`pp-tg ${p.tag}`}>
              <Ui d={TAG_ICON[p.tag]} />
              {PRICE_TAG_LABEL[p.tag]}
            </span>
          )}
          <span className="pp-gtag">
            <Ill group={p.group} />
            {groupName}
          </span>
        </div>
        <TitleTag asChild>
          <h3>{p.name}</h3>
        </TitleTag>
        {brand && <div className="pp-by">{brand}</div>}
        {price != null ? (
          <div className="pp-pbox">
            <div className="pp-pl">
              Giá {regionName}
            </div>
            <Price value={price} unit={p.unit || "sp"} className="pp-pv" />
          </div>
        ) : (
          <div className="pp-pbox contact">
            <div className="pp-pv2">
              <Ui d={UI.phone} />
              Liên hệ
            </div>
            <p>Sản phẩm này báo giá theo số lượng và khu vực.{hotline ? ` Gọi hotline ${hotline} hoặc chat Zalo để nhận giá nhé!` : " Nhắn Zalo để nhận giá nhé!"}</p>
          </div>
        )}
        <dl className="pp-spec">
          <div>
            <dt>Quy cách</dt>
            <dd>{p.spec || "—"}</dd>
          </div>
          <div>
            <dt>Đơn vị tính</dt>
            <dd>{p.unit || "—"}</dd>
          </div>
          <div>
            <dt>Thương hiệu</dt>
            <dd>{brand || "—"}</dd>
          </div>
          <div>
            <dt>Mã sản phẩm</dt>
            <dd>{p.code}</dd>
          </div>
        </dl>
        {p.desc && <p className="pp-ds">{p.desc}</p>}
      </div>
    </div>
  );
}
