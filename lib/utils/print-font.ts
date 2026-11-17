// Font cho mọi bản in: Be Vietnam Pro — chữ Việt có dấu dựng sẵn trong font
// nên in ra chuẩn, không phải ghép dấu. Giao diện dùng Inter (app/fonts.ts).
//
// Tài liệu in là iframe/cửa sổ riêng, font của giao diện không đi theo vào,
// nên phải tự khai báo @font-face trỏ tới file trong public/fonts/ (cùng bộ
// file và unicode-range Google Fonts trả về: mỗi độ đậm × bảng ký tự một file).

export const PRINT_FONT_FAMILY = '"Be Vietnam Pro", Arial, sans-serif';

/** Ép Be Vietnam Pro cho mọi phần tử, kể cả mẫu đã lưu ghi font khác inline. */
export const PRINT_FONT_ENFORCE_CSS = `body, body * { font-family: ${PRINT_FONT_FAMILY} !important; }`;

const PRINT_FONT_WEIGHTS = [400, 500, 600, 700];

const PRINT_FONT_SUBSETS: Record<string, string> = {
  vietnamese:
    "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
  "latin-ext":
    "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
  latin:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
};

const fontFace = (weight: number, range: string, src: string) => `@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url("${src}") format("woff2");
  unicode-range: ${range};
}`;

const fontPath = (weight: number, subset: string) =>
  `/fonts/BeVietnamPro-${weight}-${subset}.woff2`;

/**
 * Chỉ các @font-face Be Vietnam Pro. `origin` = "" → URL tương đối, dùng được
 * trong trang app (khung xem trước) và trình soạn TinyMCE; mặc định URL tuyệt
 * đối vì iframe in (doc.write / srcDoc / window.open) không có địa chỉ riêng.
 */
export function printFontFaceCss(
  origin: string = window.location.origin,
): string {
  return PRINT_FONT_WEIGHTS.flatMap((weight) =>
    Object.entries(PRINT_FONT_SUBSETS).map(([subset, range]) =>
      fontFace(weight, range, `${origin}${fontPath(weight, subset)}`),
    ),
  ).join("\n");
}

/** CSS chèn vào tài liệu in: @font-face + ép font cho mọi phần tử. */
export function printFontCss(origin?: string): string {
  return `${printFontFaceCss(origin)}\n${PRINT_FONT_ENFORCE_CSS}`;
}

let embeddedFaceCss: Promise<string> | null = null;

/**
 * @font-face nhúng file dạng data: — cho ảnh SVG foreignObject (ảnh gửi Zalo),
 * vì ảnh SVG không được tải font từ ngoài. Tải 1 lần rồi dùng lại.
 */
export function printFontEmbeddedFaceCss(): Promise<string> {
  embeddedFaceCss ??= Promise.all(
    PRINT_FONT_WEIGHTS.flatMap((weight) =>
      Object.entries(PRINT_FONT_SUBSETS).map(async ([subset, range]) => {
        const res = await fetch(fontPath(weight, subset));
        if (!res.ok) throw new Error(`Không tải được font in ${subset}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return fontFace(weight, range, dataUrl);
      }),
    ),
  )
    .then((faces) => faces.join("\n"))
    .catch((e) => {
      embeddedFaceCss = null; // lỗi mạng → lần sau thử lại
      throw e;
    });
  return embeddedFaceCss;
}

/**
 * Ảnh SVG (foreignObject) nạp font nhúng bất đồng bộ: vẽ lên canvas ngay sau
 * decode() có thể ra trang không có chữ. Vẽ một "ảnh mồi" chỉ có chữ (đủ 4 độ
 * đậm, có dấu), chờ tới khi chữ hiện và ổn định; sau đó các ảnh SVG khác dùng
 * cùng `faceCss` hiện chữ ngay. Tối đa `timeoutMs`.
 */
export async function warmUpEmbeddedPrintFonts(
  faceCss: string,
  timeoutMs = 3000,
): Promise<void> {
  const w = 480;
  const h = 64;
  const text = [400, 500, 600, 700]
    .map(
      (weight) => `<span style="font-weight:${weight}">Đồng Hường Ơ ĕ</span>`,
    )
    .join(" ");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml"><style>${faceCss}</style>` +
    `<div style="font-family:'Be Vietnam Pro';font-size:12px">${text}</div></div>` +
    `</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const ink = () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dark++;
    return dark;
  };

  const deadline = performance.now() + timeoutMs;
  let last = -1;
  let stable = 0;
  while (performance.now() < deadline) {
    const now = ink();
    stable = now > 0 && now === last ? stable + 1 : 0;
    if (stable >= 2) return; // chữ đã hiện và không đổi qua 3 lần đo
    last = now;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

/**
 * Chờ font in tải xong trước khi gọi print() / đo chữ / chụp ảnh, nếu không
 * bản in đầu tiên có thể ra font dự phòng. Nạp sẵn độ đậm thường + đậm với
 * chữ có dấu (kéo cả file latin lẫn vietnamese), tối đa `timeoutMs` để nút In
 * không bị treo.
 */
export async function waitForPrintFonts(
  doc: Document,
  timeoutMs = 3000,
): Promise<void> {
  const fonts = doc.fonts;
  if (!fonts) return;
  const sample = "Phiếu giao hàng – Nguyễn Thị Hường, Đồng Khởi";
  const loaded = Promise.all(
    ["400", "700"].map((weight) =>
      fonts.load(`${weight} 16px "Be Vietnam Pro"`, sample),
    ),
  )
    .then(() => fonts.ready)
    .catch(() => undefined);
  await Promise.race([
    loaded,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
