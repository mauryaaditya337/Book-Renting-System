"use client";

const REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";
const DEFAULT_POST_LOGIN_PATH = "/profile";

export function saveRedirectAfterLogin(path) {
  if (typeof window === "undefined") {
    return;
  }

  if (!path || path === "/login") {
    return;
  }

  window.localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
}

export function saveCurrentLocationForLoginRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  saveRedirectAfterLogin(window.location.pathname + window.location.search);
}

export function buildPathWithSearch(pathname, searchParams) {
  const query = searchParams?.toString?.() || "";
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function consumeRedirectAfterLogin() {
  if (typeof window === "undefined") {
    return DEFAULT_POST_LOGIN_PATH;
  }

  const redirectTo = window.localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
  window.localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);

  if (!redirectTo || redirectTo === "/login" || !redirectTo.startsWith("/")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return redirectTo;
}

export function getDefaultPostLoginPath() {
  return DEFAULT_POST_LOGIN_PATH;
}
