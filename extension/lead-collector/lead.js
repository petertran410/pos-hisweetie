// Dữ liệu dùng chung, khớp POS (pos-hisweetie/lib/leads/constants.ts)

export const ENVS = {
  production: { label: "POS chính thức", pos: "https://pos.hisweetievietnam.com" },
  local: { label: "localhost (dev)", pos: "http://localhost:3050" },
};

export const SOURCES = {
  facebook: "Fanpage",
  tiktok: "Tiktok",
  shopee: "Shopee",
  zalo_oa: "Zalo OA",
  zalo_user: "Zalo User",
  website: "Website",
  direct: "Trực tiếp",
  other: "Khác",
};

// Nguồn lead → nền tảng kênh Smax
export const SOURCE_PLATFORMS = {
  facebook: ["facebook", "instagram"],
  tiktok: ["tiktok", "tiktokweb"],
  shopee: ["shopee"],
  zalo_oa: ["zalo"],
  zalo_user: ["zaloweb"],
  website: ["custom"],
};

export const CATEGORIES = {
  cafe: "Khách quán",
  chain: "Khách chuỗi",
  distributor: "Đại lý nguyên liệu",
  training: "Đào tạo/Set up",
};

export const leadCode = (id) => `LEAD${String(id).padStart(6, "0")}`;

const HOST_SOURCES = [
  [/(^|\.)shopee\.vn$/, "shopee"],
  [/(^|\.)(facebook|messenger|instagram)\.com$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/^oa\.zalo\.me$/, "zalo_oa"],
  [/(^|\.)zalo\.me$/, "zalo_user"],
];

/** Nguồn lead đoán theo trang đang mở. */
export function sourceFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    return HOST_SOURCES.find(([re]) => re.test(host))?.[1] ?? "";
  } catch {
    return "";
  }
}

export const isShopeeChat = (url) => /^https:\/\/banhang\.shopee\.vn\/(new-)?webchat/.test(url ?? "");

// ───────────── SĐT ─────────────

// SĐT VN viết số, cho phép cách bởi dấu cách / chấm / gạch: 0901 234 567, +84 901.234.567
const PHONE_RE = /(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/g;

// Khách hay viết SĐT bằng chữ để tránh bị chặn: "không ba 5 chín…" (gõ không dấu / sai chính tả vẫn nhận)
const DIGIT_WORDS = {
  khong: "0", ko: "0", hong: "0",
  mot: "1", mott: "1",
  hai: "2",
  ba: "3",
  bon: "4", tu: "4",
  nam: "5", lam: "5",
  sau: "6", sao: "6",
  bay: "7", bai: "7",
  tam: "8",
  chin: "9", chinh: "9",
};

const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
const toLocal = (digits) => (digits.startsWith("84") ? `0${digits.slice(2)}` : digits);

/** Các SĐT trong đoạn văn (số hoặc chữ), dạng 0xxxxxxxxx, theo thứ tự xuất hiện. */
export function extractPhones(text) {
  const found = [];
  for (const m of (text ?? "").matchAll(PHONE_RE)) found.push(toLocal(m[0].replace(/\D/g, "")));
  // Chuỗi liên tiếp các token là số/chữ số → ghép lại, lấy cụm 0xxxxxxxxx
  let run = "";
  const flush = () => {
    for (const m of run.matchAll(/(?:84|0)\d{9}/g)) found.push(toLocal(m[0]));
    run = "";
  };
  for (const tok of fold(text ?? "").split(/[^a-z0-9]+/)) {
    if (/^\d+$/.test(tok)) run += tok;
    else if (DIGIT_WORDS[tok]) run += DIGIT_WORDS[tok];
    else if (tok) flush();
  }
  flush();
  return [...new Set(found.filter((p) => /^0[1-9]\d{8}$/.test(p)))];
}

/**
 * Tách đoạn bôi đen thành tên + SĐT. Phần còn lại ngắn (≤ 5 từ), không chứa số → tên ("Chị Hoa 0901 234 567");
 * dài → cả đoạn đưa vào nhu cầu.
 */
export function parseSelection(text) {
  const raw = (text ?? "").trim();
  const phones = extractPhones(raw);
  const rest = raw.replace(PHONE_RE, " ").replace(/[\s:|,;–-]+/g, " ").trim();
  const isName = rest.length > 0 && rest.length <= 40 && rest.split(" ").length <= 5 && !/\d{3,}/.test(rest);
  return { name: isName ? rest : "", phones, need: !isName && rest ? raw.slice(0, 2000) : "", note: "" };
}

// ───────────── Hội thoại Shopee ─────────────

// Nhận ra shop đang mở webchat (tên tài khoản / mã shop) → kênh Shopee trên Smax: "Diệp Trà Chi Nhánh Miền Nam", "DIỆP TRÀ - ROYALTEA"
export const SHOPEE_SHOPS = [
  { account: "dieptra.tphcm", shopId: "397909811", pagePid: "sp397909811" },
  { account: "nguyenlieu.royaltea", shopId: "118504878", pagePid: "sp118504878" },
];

// Mã đơn Shopee: 6 số ngày (YYMMDD) + 8 ký tự, vd 241103ABCD1234
const ORDER_SN = /\b\d{6}[A-Z0-9]{8}\b/;
// Giờ / ngày chen giữa các tin: "11:36", "29 Thg 10", "Thứ 5", "Hôm qua", "03/11/2026"
const TIME_LINE = /^(\d{1,2}:\d{2}|hôm qua|hôm nay|ngày hôm qua|thứ \d|chủ nhật|\d{1,2} thg \d{1,2}( \d{4})?|\d{1,2}\/\d{1,2}(\/\d{2,4})?)$/i;
const PRICE = /\d[\d.,]*\s*(đ|₫)/i;

/**
 * Đọc hội thoại Shopee từ văn bản đang hiển thị (không phụ thuộc class của Shopee):
 * - account: tên tài khoản khách trên thanh tiêu đề hội thoại
 * - chatLines: các dòng trong cột hội thoại đang mở
 * - pageOrderLines: khối có mã đơn ở chỗ khác trên trang (khung thông tin bên phải), nếu có
 */
export function parseShopeeChat({ account, chatLines, pageOrderLines, selection, url }) {
  // Bỏ giờ/ngày để SĐT khách gửi nhiều tin ("0976" · "259" · "769") ghép liền nhau
  const lines = (chatLines ?? []).filter((l) => !TIME_LINE.test(l));
  const name = (account || "").trim();

  // SĐT: ưu tiên đoạn bôi đen; không có thì lấy trong hội thoại (mới nhất trước)
  const fromSel = extractPhones(selection);
  const fromChat = extractPhones(lines.join("\n")).reverse();
  const phones = [...new Set([...fromSel, ...fromChat])];

  // Nhu cầu: các thẻ sản phẩm trong hội thoại ("Sản phẩm" / "…trao đổi với bạn về sản phẩm này" → tên SP, giá), mới nhất trước
  const products = [];
  lines.forEach((l, i) => {
    if (!/^sản phẩm$|trao đổi với bạn về sản phẩm/i.test(l)) return;
    const after = lines.slice(i + 1, i + 6).filter((x) => !/^thu nhỏ$|^mời đặt hàng$|^< ?\d+ ngày$/i.test(x));
    const title = after.find((x) => !PRICE.test(x));
    const price = after.find((x) => PRICE.test(x));
    if (title) products.unshift(price ? `${title} (${price})` : title);
  });
  const need = [
    selection && !fromSel.length ? selection.trim() : "",
    products.length ? `Quan tâm: ${[...new Set(products)].join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Đơn hàng gần nhất: thẻ "Đơn hàng" / mã đơn cuối cùng trong hội thoại, không có thì lấy ở khung bên phải
  let orderBlock = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^đơn hàng$/i.test(lines[i]) || ORDER_SN.test(lines[i]) || /mã đơn hàng/i.test(lines[i])) {
      orderBlock = lines.slice(Math.max(0, i - (/^đơn hàng$/i.test(lines[i]) ? 0 : 2)), i + 7);
      break;
    }
  }
  if (!orderBlock.length && pageOrderLines?.length) orderBlock = pageOrderLines.filter((l) => !TIME_LINE.test(l));
  const note = [orderBlock.length ? `Đơn hàng gần nhất:\n${orderBlock.join("\n")}` : "", url ? `Hội thoại Shopee: ${url}` : ""]
    .filter(Boolean)
    .join("\n\n");

  return { name, phones, need, note };
}

/** Shop Shopee đang mở webchat (tìm tên tài khoản / mã shop trên trang); không chắc → null. */
export function shopeeShopFromHints(hints) {
  const found = SHOPEE_SHOPS.filter((s) => hints?.includes(s.account) || hints?.includes(s.shopId));
  return found.length === 1 ? found[0] : null;
}

/**
 * Chạy trong trang (chrome.scripting, mọi frame) — phải tự chứa, không dùng biến ngoài.
 * Tìm ô nhập tin của hội thoại đang mở, lấy cột hội thoại chứa nó + tên tài khoản khách trên thanh tiêu đề;
 * kèm khối có mã đơn ở chỗ khác trên trang và shop đang mở.
 */
export function readPage() {
  const visible = (el) => !!el.offsetParent && el.getBoundingClientRect().width > 150;
  const lines = (el) => el.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
  const selection = window.getSelection()?.toString() ?? "";
  const inputs = [...document.querySelectorAll("textarea, [contenteditable='true']")].filter(visible);
  const input =
    inputs.find((el) => /tin nhắn|message|nhập/i.test(el.getAttribute("placeholder") ?? el.getAttribute("data-placeholder") ?? el.getAttribute("aria-label") ?? "")) ??
    inputs.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  let chatLines = null;
  let root = null;
  if (input) {
    // Leo lên tới khi ra khỏi cột hội thoại (rộng hơn hẳn ô nhập) — cột phải đủ cao để chứa tin nhắn
    const w = input.getBoundingClientRect().width;
    root = input;
    while (root.parentElement && root.parentElement !== document.body && root.parentElement.getBoundingClientRect().width <= w * 1.4 + 60) {
      root = root.parentElement;
    }
    // Lấy phần cuối (tin mới nhất) nếu hội thoại dài
    if (root.getBoundingClientRect().height > 250) chatLines = lines(root).slice(-400);
    else root = null;
  }
  // Tên tài khoản khách: chữ dạng username Shopee (không dấu cách) ở thanh tiêu đề ngay trên / đầu cột hội thoại
  let account = "";
  if (root) {
    const r = root.getBoundingClientRect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.trim();
      if (!/^(?=.*[a-z])[a-z0-9._]{3,30}$/i.test(t) || !n.parentElement) continue;
      const b = n.parentElement.getBoundingClientRect();
      if (b.height && b.top >= r.top - 140 && b.top <= r.top + 40 && b.left >= r.left - 20 && b.left < r.right) {
        account = t;
        break;
      }
    }
  }
  // Khối có mã đơn Shopee ngoài cột hội thoại (danh sách đơn của người mua thường xếp mới nhất trước)
  let pageOrderLines = null;
  const all = lines(document.body);
  const i = all.findIndex((l, idx) => /\b\d{6}[A-Z0-9]{8}\b/.test(l) && !(root && root.innerText.includes(all[idx])));
  if (i >= 0) pageOrderLines = all.slice(Math.max(0, i - 2), i + 7);
  // Gợi ý shop đang mở: tên tài khoản / mã shop xuất hiện trên trang (chữ, thuộc tính, URL ảnh…)
  const html = document.documentElement.outerHTML;
  const shopHints = ["dieptra.tphcm", "nguyenlieu.royaltea", "397909811", "118504878"].filter((h) => html.includes(h));
  return { selection, account, chatLines, pageOrderLines, shopHints, url: location.href, hasChat: !!chatLines };
}
