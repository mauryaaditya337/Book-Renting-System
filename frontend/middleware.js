import { NextResponse } from "next/server";

const protectedRoutes = ["/profile", "/books/new", "/my-listings", "/my-requests"];
const guestOnlyRoutes = ["/login", "/signup"];

export function middleware(request) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;
  const isBookRequestRoute = /^\/books\/[^/]+\/request$/.test(pathname);

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  ) || isBookRequestRoute;
  const isGuestOnlyRoute = guestOnlyRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyRoute && token) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/profile/:path*",
    "/books/:path*",
    "/books/new",
    "/my-listings",
    "/my-requests"
  ]
};
