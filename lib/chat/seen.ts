// "Tin mới" của hội thoại: Smax không có số chưa đọc đáng tin (nhân viên đọc trên
// app Zalo), nên lưu tổng số tin lúc xem gần nhất trên POS (theo trình duyệt).
const KEY = "chat-seen-counts";

function read(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // localStorage bị chặn — chỉ mất đếm tin mới
  }
}

/** Số tin mới so với lần xem gần nhất; lần đầu thấy thread thì lấy mốc hiện tại (0). */
export function newCount(tid: string, messageCount: number): number {
  const map = read();
  if (map[tid] === undefined) {
    map[tid] = messageCount;
    write(map);
    return 0;
  }
  return Math.max(0, messageCount - map[tid]);
}

export function markSeen(tid: string, messageCount: number) {
  const map = read();
  if (map[tid] === messageCount) return;
  map[tid] = messageCount;
  write(map);
}
