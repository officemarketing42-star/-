import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  initialized = true;
}

export function liffIsLoggedIn() {
  return liff.isLoggedIn();
}

export function liffLogin() {
  liff.login({ redirectUri: window.location.href });
}

export async function getLiffProfile() {
  return await liff.getProfile();
}

export function liffLogout() {
  liff.logout();
  window.location.reload();
}

export { liff };
