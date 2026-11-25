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

// Bấm mở hội thoại từ danh sách sẽ đánh dấu đã xem trước khi khung chat kịp đếm tin mới →
// ghi lại số tin mới lúc bấm để khung chat đọc (gợi ý "Tóm tắt N tin chưa đọc"), đọc xong thì xoá.
const unseenOnOpen = new Map<string, number>();

export function rememberUnseenOnOpen(tid: string, count: number) {
  unseenOnOpen.set(tid, count);
}

/** Số tin mới lúc bấm mở hội thoại từ danh sách; undefined nếu không mở từ danh sách. */
export function peekUnseenOnOpen(tid: string): number | undefined {
  return unseenOnOpen.get(tid);
}

export function forgetUnseenOnOpen(tid: string) {
  unseenOnOpen.delete(tid);
}
