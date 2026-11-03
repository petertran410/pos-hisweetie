import { ENVS } from "./lead.js";

const NO_SESSION = (env) => `Chưa có phiên POS — mở ${ENVS[env].pos}, đăng nhập rồi thử lại`;

async function send(tabId, op, payload) {
  try {
    return await chrome.tabs.sendMessage(tabId, { hsExt: true, op, payload });
  } catch {
    // Tab POS mở trước khi cài/tải lại extension → chưa có content script: nạp rồi gửi lại
    await chrome.scripting.executeScript({ target: { tabId }, files: ["pos-bridge.js"] });
    return chrome.tabs.sendMessage(tabId, { hsExt: true, op, payload });
  }
}

/**
 * Nhờ tab POS đang đăng nhập gọi API (op: session | channels | checkPhone | createLead).
 * Thử lần lượt các tab POS, ưu tiên tab trả lời được.
 */
export async function call(env, op, payload = {}) {
  const tabs = await chrome.tabs.query({ url: `${ENVS[env].pos}/*` });
  let lastError = NO_SESSION(env);
  for (const tab of tabs) {
    let res;
    try {
      res = await send(tab.id, op, payload);
    } catch {
      continue;
    }
    if (res?.ok) return res.result;
    if (res?.error && res.error !== "NO_BRIDGE") throw new Error(res.error);
    lastError = res?.error === "NO_BRIDGE" ? `Tab POS chưa sẵn sàng — tải lại tab ${ENVS[env].pos} (đã đăng nhập) rồi thử lại` : lastError;
  }
  throw new Error(lastError);
}

/** Tên người đang đăng nhập POS, null nếu chưa đăng nhập. */
export async function getSession(env) {
  try {
    return await call(env, "session");
  } catch {
    return null;
  }
}
