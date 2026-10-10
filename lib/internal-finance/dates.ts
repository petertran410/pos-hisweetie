/** Ngày theo giờ máy người dùng, dạng yyyy-mm-dd cho ô chọn ngày. */
export const toDateInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

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
