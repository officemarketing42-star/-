import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  initialized = true;
}

export async function getLiffProfile() {
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return null;
  }
  return await liff.getProfile();
}

export function liffLogout() {
  liff.logout();
  window.location.reload();
}

export { liff };
