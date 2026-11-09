// Content script trên tab POS: chuyển yêu cầu từ sidebar sang trang POS (LeadExtensionBridge) và trả kết quả về.
// Token đăng nhập chỉ nằm trong tab POS; extension không đọc được.
if (!globalThis.__hsLeadBridge) {
  globalThis.__hsLeadBridge = true;
  const pending = new Map();

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.type !== "hs-ext-response") return;
    const done = pending.get(e.data.id);
    if (done) {
      pending.delete(e.data.id);
      done(e.data);
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg?.hsExt) return;
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      // Trang chưa có cầu nối: đang ở trang đăng nhập, chưa tải xong hoặc POS bản cũ
      sendResponse({ ok: false, error: "NO_BRIDGE" });
    }, 15000);
    pending.set(id, (res) => {
      clearTimeout(timer);
      sendResponse(res);
    });
    window.postMessage({ type: "hs-ext-request", id, op: msg.op, payload: msg.payload }, window.location.origin);
    return true;
  });
}
