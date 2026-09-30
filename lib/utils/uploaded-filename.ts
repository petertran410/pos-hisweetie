/**
 * Tên file tiếng Việt đôi khi bị lưu sai: UTF-8 bị đọc như Latin-1.
 * Ví dụ "Bột" thành "BoÌ£Ìt". Hàm này khôi phục lại tên gốc khi chuỗi đó
 * vẫn giải mã được thành UTF-8 hợp lệ.
 */
export function repairUploadedFilename(value: string): string {
  if (!value) return value;

  const characters = Array.from(value);
  if (characters.some((char) => char.charCodeAt(0) > 0xff)) return value;
  if (!characters.some((char) => char.charCodeAt(0) > 0x7f)) return value;

  try {
    const bytes = Uint8Array.from(characters, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const encoded = new TextEncoder().encode(decoded);
    const matches =
      encoded.length === bytes.length &&
      encoded.every((byte, index) => byte === bytes[index]);
    return matches ? decoded : value;
  } catch {
    return value;
  }
}
