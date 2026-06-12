import { cookies } from "next/headers";

const SESSION_COOKIE = "lyka_admin_session";
const SESSION_VALUE = "authenticated";

export function isAdminAuthenticated() {
  return cookies().get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function adminPasswordIsConfigured() {
  return Boolean(process.env.LYKA_ADMIN_PASSWORD);
}
