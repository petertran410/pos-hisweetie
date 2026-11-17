import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./fonts.css";
import { Providers } from "./providers";
import { PageTitle } from "@/components/layout/PageTitle";
import { PALETTE_INIT_SCRIPT } from "@/lib/constants/palette";
// Font giao diện Inter lưu trong public/fonts — xem app/fonts.ts, app/fonts.css.
import { fontVariables } from "./fonts";

const jetbrainsMono = localFont({
  src: [
    {
      path: "../public/fonts/JetBrainsMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/JetBrainsMono-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hisweetie",
    template: "%s | Hisweetie",
  },
  description: "Point of Sale Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${fontVariables} ${jetbrainsMono.variable}`}
      suppressHydrationWarning>
      <head>
        {/* Set bảng màu trước khi vẽ trang — tránh nháy màu khi tải. */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <PageTitle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
