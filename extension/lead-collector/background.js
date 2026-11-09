// Bấm icon / Alt+Shift+L → mở sidebar; chuột phải đoạn bôi đen → mở sidebar điền sẵn đoạn đó
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "create-lead", title: "Tạo lead từ “%s”", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "create-lead" || !tab) return;
  // open() phải gọi ngay trong thao tác của người dùng (trước mọi await)
  chrome.sidePanel.open({ windowId: tab.windowId });
  chrome.storage.session.set({ pendingSelection: { text: info.selectionText ?? "", url: tab.url ?? "", at: Date.now() } });
});
