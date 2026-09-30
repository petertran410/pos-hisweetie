const SOURCE_LABELS: Record<string, string> = {
  LARK_IMPORT: "Lịch sử Lark",
  PACKING_SLIP: "Báo đơn",
  MANUAL_RECEIPT: "Phiếu thu thủ công",
  MANUAL_EXPENSE: "Phiếu chi thủ công",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
};

const SNAPSHOT_LABELS: Record<string, string> = {
  vehicle: "Xe",
  location: "Địa điểm",
  odo: "ODO",
  unitPrice: "Đơn giá",
  liters: "Số lít",
  consumptionLimit: "Định mức",
  serviceType: "Dịch vụ",
  anomalyNote: "Bất thường",
  payerName: "Người chi",
  cashSource: "Nguồn tiền",
  method: "Hình thức",
  feeCategory: "Khoản phí",
};

const LARK_FIELD_LABELS: Record<string, string> = {
  "khoan muc": "Khoản mục",
  "nguoi chi": "Người chi",
  "phong ban": "Phòng ban",
  tuan: "Tuần",
  "ghi chu": "Ghi chú",
};

export function displaySource(sourceType: string) {
  return SOURCE_LABELS[sourceType] || sourceType;
}

export function displayEntryCode(input: {
  code: string;
  description?: string | null;
  invoiceCodes?: string[];
}) {
  return input.code || "-";
}

export function displayOccurredAt(input: {
  occurredAt?: string | null;
  sourceType?: string | null;
  sourceSnapshot?: Record<string, unknown> | null;
}) {
  const businessDate = businessDateFromSnapshot(input.sourceSnapshot);
  if (businessDate) return businessDate;
  if (!input.occurredAt) return "-";
  const date = new Date(input.occurredAt);
  if (Number.isNaN(date.getTime())) return "-";
  if (
    input.sourceType === "LARK_IMPORT" ||
    input.sourceSnapshot?.missingDate === true
  ) {
    return date.toLocaleDateString("vi-VN");
  }
  return date.toLocaleString("vi-VN");
}

export function humanSnapshotRows(
  snapshot?: Record<string, unknown> | null,
): Array<{ label: string; value: string }> {
  if (!snapshot) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();
  const push = (label: string, value: unknown) => {
    const text = plainText(value);
    if (!text || seen.has(label)) return;
    seen.add(label);
    rows.push({ label, value: text });
  };

  for (const [key, label] of Object.entries(SNAPSHOT_LABELS)) {
    push(label, snapshot[key]);
  }

  const fields = snapshot.fields;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    for (const [key, value] of Object.entries(fields)) {
      const label = LARK_FIELD_LABELS[normalizeKey(key)];
      if (label) push(label, value);
    }
  }

  if (Array.isArray(snapshot.unmatchedInvoiceCodes)) {
    push("Hóa đơn", snapshot.unmatchedInvoiceCodes.join(", "));
  }

  return rows;
}

function businessDateFromSnapshot(
  snapshot?: Record<string, unknown> | null,
): string | null {
  const fields = snapshot?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  const record = fields as Record<string, unknown>;
  for (const key of ["Năm-Tháng", "NĂM/THÁNG/NGÀY", "Ngày", "Ngày chi", "Ngày thu"]) {
    const parsed = dateFromText(plainText(record[key]));
    if (parsed) return parsed;
  }
  return null;
}

function dateFromText(text: string): string | null {
  const match = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function plainText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text.startsWith("{") || text.startsWith("[")) return "";
    if (/https?:\/\//.test(text) || /file_token|tmp_url/.test(text)) return "";
    return text;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return plainText(item);
        if ("file_token" in item || "tmp_url" in item) return "";
        if ("text" in item) return plainText(item.text);
        if ("name" in item) return plainText(item.name);
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    if ("file_token" in value || "tmp_url" in value) return "";
    if ("text" in value) return plainText(value.text);
    if ("name" in value) return plainText(value.name);
  }
  return "";
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
