import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authStorage = request.cookies.get("auth-storage");
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!authStorage && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authStorage && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
