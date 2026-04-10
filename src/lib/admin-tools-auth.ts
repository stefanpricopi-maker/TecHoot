/**
 * Auth Admin tools — folosește doar Web Crypto API (compatibil Edge middleware).
 * Nu importa `node:crypto` aici.
 */

/** Cookie setat după login reușit (valoare derivată din secret, nu secretul în clar). */
export const ADMIN_TOOLS_AUTH_COOKIE = "kahoot-live-admin-tools-token";

export const ADMIN_TOOLS_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 ore

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256, encodare base64url (aceeași idee ca `digest('base64url')` din Node). */
export async function sha256Base64Url(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(hashBuffer));
}

export async function sha256DigestUtf8(text: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return new Uint8Array(buf);
}

/**
 * Token de sesiune stabil pentru un secret dat (cookie + middleware).
 * Dacă `ADMIN_TOOLS_SECRET` lipsește, returnează null (middleware lasă accesul liber).
 */
export async function getAdminToolsSessionTokenFromEnv(): Promise<string | null> {
  const secret = process.env.ADMIN_TOOLS_SECRET?.trim();
  if (!secret) {
    return null;
  }
  return sha256Base64Url(`kahoot-live-admin-tools|${secret}`);
}
