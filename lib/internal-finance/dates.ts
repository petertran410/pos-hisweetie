/** Ngày theo giờ máy người dùng, dạng yyyy-mm-dd cho ô chọn ngày. */
export const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

/** Thứ hai đầu tuần. Tuần tài chính nội bộ luôn là Thứ hai–Chủ nhật (ISO), khớp số tuần backend. */
export const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
};

/** Chủ nhật cuối tuần của tuần Thứ hai–Chủ nhật. */
export const endOfWeek = (date: Date) => {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return result;
};

/** Khoảng ngày (yyyy-mm-dd) của tuần ISO trong năm. */
export const isoWeekRange = (year: number, week: number) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
};

/** Tuần ISO (Thứ hai–Chủ nhật) của ngày yyyy-mm-dd, cùng công thức với backend. */
export const isoWeekOf = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  // Thứ năm cùng tuần quyết định tuần thuộc năm nào.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const week = Math.ceil(
    ((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7,
  );
  return { year, week };
};

/** Số tuần ISO của năm (52 hoặc 53): tuần chứa ngày 28/12. */
export const isoWeeksInYear = (year: number) => isoWeekOf(`${year}-12-28`).week;

/** Giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
export const toDateTimeInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

/**
 * Đầu ngày theo giờ Việt Nam. Backend cắt ngày phiếu nội bộ theo +07:00,
 * nên mọi form chỉ nhập ngày đều gửi theo dạng này.
 */
export const vnDayIso = (date: string) => `${date}T00:00:00+07:00`;

/** Ngày Việt Nam (yyyy-mm-dd) của một mốc thời gian ISO. */
export const vnDateKey = (iso: string) =>
  new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export const formatVnDate = (iso?: string | null) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

export const formatVnDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

/** Cột kiểu DATE (hạn đăng kiểm...) lưu theo UTC nên đọc cũng theo UTC. */
export const formatDateOnly = (iso?: string | null) => {
  if (!iso) return "-";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "-";
};
