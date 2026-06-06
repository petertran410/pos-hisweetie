import type { Metadata } from "next";
import { Montserrat, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PageTitle } from "@/components/layout/PageTitle";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
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
      className={`${montserrat.variable} ${beVietnam.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          <PageTitle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
