import { CATEGORIES, ENVS, SOURCES, SOURCE_PLATFORMS, isShopeeChat, leadCode, parseSelection, parseShopeeChat, readPage, shopeeShopFromHints, sourceFromUrl } from "./lead.js";
import { call, getSession } from "./api.js";

const $ = (id) => document.getElementById(id);
const fields = ["name", "phone", "source", "channel", "category", "need", "note"];
let env = "production";
let channels = [];
// Kênh đang hiện trong ô Kênh (kênh Smax theo nguồn): { pagePid, label, name }
let channelOptions = [];
// Đã sửa tay → không tự thu thập đè khi đổi hội thoại
let dirty = false;

for (const [v, l] of Object.entries(ENVS)) $("env").add(new Option(l.label, v));
for (const [v, l] of Object.entries(SOURCES)) $("source").add(new Option(l, v));
for (const [v, l] of Object.entries(CATEGORIES)) $("category").add(new Option(l, v));

const setText = (el, text, cls = "") => {
  el.textContent = text;
  el.className = cls;
};

// ───────────── Phiên POS ─────────────

async function showSession() {
  const s = await getSession(env);
  if (s) setText($("session"), `Đăng nhập POS: ${s.userName ?? "—"}`, "muted");
  else setText($("session"), `Chưa có phiên POS — mở ${ENVS[env].pos} ở 1 tab và đăng nhập (giữ tab đó mở)`, "muted err");
  return s;
}

async function loadChannels() {
  try {
    channels = await call(env, "channels");
  } catch {
    channels = [];
  }
  renderChannels();
}

function renderChannels(pick) {
  const source = $("source").value;
  channelOptions = channels
    .filter((c) => (SOURCE_PLATFORMS[source] ?? []).includes(c.platform))
    .map((c) => ({ pagePid: c.pagePid, label: c.name, name: c.name }));
  const sel = $("channel");
  const keep = pick ?? sel.value;
  sel.length = 1;
  for (const c of channelOptions) sel.add(new Option(c.label, c.pagePid));
  const has = (v) => channelOptions.some((c) => c.pagePid === v);
  sel.value = has(keep) ? keep : channelOptions.length === 1 ? channelOptions[0].pagePid : "";
  $("channelRow").hidden = !channelOptions.length;
}

// ───────────── Trùng SĐT ─────────────

let dupeTimer;
function checkDupes() {
  clearTimeout(dupeTimer);
  const phone = $("phone").value.trim();
  $("dupes").textContent = "";
  if (phone.replace(/\D/g, "").length < 9) return;
  dupeTimer = setTimeout(async () => {
    try {
      const d = await call(env, "checkPhone", { phone });
      renderDupes(d);
    } catch {
      // không chặn tạo lead
    }
  }, 400);
}

function renderDupes(d) {
  const box = $("dupes");
  box.textContent = "";
  const items = [
    ...(d?.customers ?? []).map((c) => [`Khách ${c.code ?? ""} ${c.name}`, `${ENVS[env].pos}/khach-hang?Code=${c.code}`]),
    ...(d?.leads ?? []).map((l) => [`${leadCode(l.id)} ${l.name}`, `${ENVS[env].pos}/khach-hang/lead?Code=${leadCode(l.id)}`]),
  ];
  if (!items.length) return;
  box.append("⚠ SĐT đã có: ");
  items.forEach(([label, href], i) => {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.textContent = label.trim();
    box.append(...(i ? [", ", a] : [a]));
  });
}

// ───────────── Thu thập ─────────────

function fill(data, source, channelPid) {
  $("name").value = data.name ?? "";
  $("need").value = data.need ?? "";
  $("note").value = data.note ?? "";
  if (source) $("source").value = source;
  renderChannels(channelPid);
  const chips = $("phoneChips");
  chips.textContent = "";
  const phones = data.phones ?? [];
  $("phone").value = phones[0] ?? "";
  // Nhiều SĐT trong hội thoại → chọn nhanh
  if (phones.length > 1) {
    for (const p of phones) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p;
      b.className = p === phones[0] ? "on" : "";
      b.onclick = () => {
        $("phone").value = p;
        chips.querySelectorAll("button").forEach((x) => (x.className = x === b ? "on" : ""));
        checkDupes();
      };
      chips.append(b);
    }
  }
  checkDupes();
  setText($("result"), "");
  dirty = false;
}

async function collect() {
  const info = $("collectInfo");
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  let pages = [];
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: readPage });
    pages = results.map((r) => r.result).filter(Boolean);
  } catch {
    setText(info, "Không đọc được trang này — bôi đen tên/SĐT rồi chuột phải › Tạo lead, hoặc nhập tay.", "muted err");
    return;
  }
  const selection = pages.map((p) => p.selection).find((s) => s?.trim()) ?? "";
  const chat = pages.find((p) => p.hasChat);
  const source = sourceFromUrl(tab.url);
  if (isShopeeChat(tab.url) && chat) {
    // Shop đang mở: tìm thấy trên trang, không chắc thì dùng shop đã chọn lần trước
    const shop = shopeeShopFromHints(pages.flatMap((p) => p.shopHints ?? []));
    const { lastShopeeChannel } = await chrome.storage.local.get("lastShopeeChannel");
    fill(parseShopeeChat({ ...chat, selection, url: tab.url }), source, shop?.pagePid ?? lastShopeeChannel);
    setText(info, "Đã thu thập từ hội thoại Shopee đang mở — kiểm tra lại trước khi tạo.", "muted");
  } else if (selection.trim()) {
    fill(parseSelection(selection), source);
    setText(info, "Đã điền từ đoạn bôi đen.", "muted");
  } else {
    setText(info, isShopeeChat(tab.url) ? "Chưa thấy hội thoại đang mở — mở 1 hội thoại rồi thử lại." : "Bôi đen tên/SĐT khách trên trang rồi bấm lại.", "muted err");
  }
}

// ───────────── Tạo lead ─────────────

async function submit(e) {
  e.preventDefault();
  const btn = $("submit");
  btn.disabled = true;
  setText($("result"), "Đang tạo…");
  const channel = channelOptions.find((c) => c.pagePid === $("channel").value);
  const body = {
    name: $("name").value.trim(),
    phone: $("phone").value.trim() || undefined,
    source: $("source").value,
    category: $("category").value,
    channelPid: channel?.pagePid,
    channelName: channel?.name,
    need: $("need").value.trim() || undefined,
    cskhNote: $("note").value.trim() || undefined,
  };
  try {
    const { lead, duplicates } = await call(env, "createLead", body);
    chrome.storage.local.set({ lastCategory: body.category, ...(body.source === "shopee" && body.channelPid ? { lastShopeeChannel: body.channelPid } : {}) });
    const r = $("result");
    setText(r, `Đã tạo `, "ok");
    const a = document.createElement("a");
    a.href = `${ENVS[env].pos}/khach-hang/lead?Code=${leadCode(lead.id)}`;
    a.target = "_blank";
    a.textContent = `${leadCode(lead.id)} — ${lead.name}`;
    r.append(a);
    renderDupes(duplicates);
    for (const f of ["name", "phone", "need", "note"]) $(f).value = "";
    $("phoneChips").textContent = "";
    dirty = false;
  } catch (err) {
    setText($("result"), err.message, "err");
  } finally {
    btn.disabled = false;
  }
}

// ───────────── Khởi động ─────────────

$("collect").onclick = collect;
$("form").onsubmit = submit;
$("phone").oninput = checkDupes;
$("source").onchange = () => renderChannels();
for (const f of fields) $(f).addEventListener("input", () => (dirty = true));

$("env").onchange = async () => {
  env = $("env").value;
  chrome.storage.local.set({ env });
  await showSession();
  loadChannels();
};

// Chuột phải › "Tạo lead từ …" → điền đoạn bôi đen
async function takePendingSelection() {
  const { pendingSelection: p } = await chrome.storage.session.get("pendingSelection");
  if (!p) return;
  await chrome.storage.session.remove("pendingSelection");
  fill(parseSelection(p.text), sourceFromUrl(p.url));
  setText($("collectInfo"), "Đã điền từ đoạn bôi đen.", "muted");
}
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.pendingSelection?.newValue) takePendingSelection();
});

// Đổi hội thoại Shopee (URL đổi) khi chưa sửa tay → tự thu thập lại
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (change.url && tab.active && isShopeeChat(change.url) && !dirty) setTimeout(collect, 800);
});

(async () => {
  const saved = await chrome.storage.local.get(["env", "lastCategory"]);
  env = saved.env in ENVS ? saved.env : "production";
  $("env").value = env;
  if (saved.lastCategory) $("category").value = saved.lastCategory;
  await showSession();
  await loadChannels();
  await takePendingSelection();
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (isShopeeChat(tab?.url)) collect();
})();

