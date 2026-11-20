import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** File tĩnh (có đuôi: font, ảnh, icon…) — trang bảng giá cần, và vốn đã public ở domain chính. */
const STATIC_FILE = /\.[a-z0-9]+$/i;

export function middleware(request: NextRequest) {
  // price.hisweetievietnam.com chỉ phục vụ trang bảng giá public:
  // "/" → /bang-gia (URL giữ nguyên); các trang POS khác (đăng nhập, dashboard…) đưa về "/".
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("price.")) {
    const { pathname } = request.nextUrl;
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/bang-gia";
      return NextResponse.rewrite(url);
    }
    const allowed = pathname === "/bang-gia" || pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs") || STATIC_FILE.test(pathname);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
