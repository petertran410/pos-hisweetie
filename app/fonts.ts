// Font giao diện: Inter, lưu trong dự án (public/fonts/) để build không cần
// tải font từ Google. Inter có chữ số căn cột (tabular-nums) cho bảng tiền và
// là font biến thiên: mỗi file phủ mọi độ đậm 100–900. File .woff2 giống hệt
// bản Google trả về — mỗi file một bảng ký tự (latin, vietnamese, ...) với
// unicode-range riêng, trình duyệt chỉ tải phần cần dùng.
//
// next/font bắt buộc tùy chọn là giá trị viết thẳng, nên mỗi bảng ký tự là
// một lời gọi riêng. next/font chỉ lo phát file (tên có hash → cache lâu dài)
// và preload latin + vietnamese. Biến --font-sans và font dự phòng khai báo ở
// app/fonts.css: Turbopack đặt tên biến theo tên hằng JS (vd. "interLatin")
// chứ không theo font-family khai báo, nên không dùng biến/fallback tự sinh.
// Biến --font-inter-* gắn lên <html> chỉ để CSS @font-face của mọi bảng ký tự
// luôn được nạp.

import localFont from "next/font/local";

const interLatin = localFont({
  src: [
    {
      path: "../public/fonts/Inter-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-inter-latin",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

const interVietnamese = localFont({
  src: [
    {
      path: "../public/fonts/Inter-vietnamese.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value:
        "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
    },
  ],
  variable: "--font-inter-vietnamese",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

const interCyrillicExt = localFont({
  src: [
    {
      path: "../public/fonts/Inter-cyrillic-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value:
        "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
    },
  ],
  variable: "--font-inter-cyrillic-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const interCyrillic = localFont({
  src: [
    {
      path: "../public/fonts/Inter-cyrillic.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
    },
  ],
  variable: "--font-inter-cyrillic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const interGreekExt = localFont({
  src: [
    {
      path: "../public/fonts/Inter-greek-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    { prop: "unicode-range", value: "U+1F00-1FFF" },
  ],
  variable: "--font-inter-greek-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const interGreek = localFont({
  src: [
    {
      path: "../public/fonts/Inter-greek.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value:
        "U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF",
    },
  ],
  variable: "--font-inter-greek",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const interLatinExt = localFont({
  src: [
    {
      path: "../public/fonts/Inter-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  declarations: [
    { prop: "font-family", value: "Inter" },
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-inter-latin-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/** Gắn lên <html>: nạp đủ @font-face Inter của mọi bảng ký tự. */
export const fontVariables = [
  interLatin.variable,
  interVietnamese.variable,
  interCyrillicExt.variable,
  interCyrillic.variable,
  interGreekExt.variable,
  interGreek.variable,
  interLatinExt.variable,
].join(" ");
